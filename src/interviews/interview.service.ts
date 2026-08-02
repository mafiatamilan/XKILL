import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ZodType } from 'zod';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { JudgeService } from '../judge/judge.service';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import { InterviewRepository, InterviewSessionWithTurns, TurnInput } from './interview.repository';
import {
  openingQuestionSchema,
  turnResponseSchema,
  reportSchema,
  buildOpeningPrompt,
  buildTurnPrompt,
  buildReportPrompt,
  InterviewContext,
  SUPPORTED_MODES,
} from './interview-ai';
import { buildInterviewTranscript } from './report-builder';
import { AddInterviewTurnDto, CreateInterviewSessionDto } from './dto/interview.dto';

const SESSION_NOT_FOUND = { code: 'SESSION_NOT_FOUND', message: 'Interview session not found' };
const SESSION_ENDED = { code: 'SESSION_ENDED', message: 'This interview session has ended' };
const SESSION_NOT_ENDED = {
  code: 'SESSION_NOT_ENDED',
  message: 'The interview must be ended before its report is available',
};
const PROBLEM_REQUIRED = {
  code: 'PROBLEM_REQUIRED',
  message: 'A `problemId` from the DSA catalog is required for dsa interviews',
};
const PROBLEM_NOT_FOUND = { code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' };
const LANGUAGE_REQUIRED = {
  code: 'LANGUAGE_REQUIRED',
  message: '`languageId` is required when submitting code',
};
const CODE_NOT_ALLOWED = {
  code: 'CODE_NOT_ALLOWED',
  message: 'Code submissions are only supported in dsa-type interviews',
};

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private readonly repository: InterviewRepository,
    private readonly ai: AiService,
    private readonly judge: JudgeService,
    private readonly audit: AuditService,
  ) {}

  // ---- Sessions ----

  async createSession(userId: string, dto: CreateInterviewSessionDto, ip?: string) {
    const mode = dto.mode ?? 'text';
    if (!SUPPORTED_MODES.includes(mode as (typeof SUPPORTED_MODES)[number])) {
      throw new NotImplementedException({
        code: 'MODE_NOT_AVAILABLE',
        message: `Voice and video interview modes are not available yet. Please use text mode (received '${mode}').`,
      });
    }
    if (dto.type === 'dsa' && !dto.problemId) {
      throw new BadRequestException(PROBLEM_REQUIRED);
    }

    const context = await this.buildContext(userId, dto.type, dto.problemId);

    const { system, prompt } = buildOpeningPrompt(context);
    const opening = await this.callAi({ system, prompt, schema: openingQuestionSchema });

    const session = await this.repository.createSession({
      userId,
      type: dto.type,
      mode,
      problemId: dto.problemId,
    });
    await this.repository.createFirstAiTurn(session.id, opening.question);
    await this.audit.record({
      userId,
      action: 'interview.session.created',
      entityType: 'interview_session',
      entityId: session.id,
      after: { type: dto.type, mode },
      ip,
    });

    return this.mapDetail({
      ...session,
      turns: [{ role: 'ai', content: opening.question, order: 0 }],
      report: null,
    });
  }

  async listSessions(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repository.listSessions(userId, page, limit),
      this.repository.countSessions(userId),
    ]);
    return {
      data: data.map((session) => ({
        id: session.id,
        type: session.type,
        mode: session.mode,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        reportAvailable: Boolean(session.report),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.ensureOwned(userId, sessionId);
    return this.mapDetail(session);
  }

  // ---- Turns ----

  async addTurn(userId: string, sessionId: string, dto: AddInterviewTurnDto, ip?: string) {
    const session = await this.ensureOwned(userId, sessionId);
    if (session.status === 'ended') {
      throw new ConflictException(SESSION_ENDED);
    }

    let codeTurn: TurnInput | null = null;
    if (dto.code !== undefined && dto.code !== null && dto.code !== '') {
      if (session.type !== 'dsa') {
        throw new BadRequestException(CODE_NOT_ALLOWED);
      }
      if (dto.languageId === undefined || dto.languageId === null) {
        throw new BadRequestException(LANGUAGE_REQUIRED);
      }
      codeTurn = await this.gradeCode(session, dto.code, dto.languageId);
    }

    const context = await this.buildContext(userId, session.type, session.problemId ?? undefined);
    const transcript = buildInterviewTranscript([
      ...session.turns.map((turn) => ({
        role: turn.role as 'ai' | 'user',
        content: turn.content,
        code: turn.code,
        judgeVerdict: turn.judgeVerdict,
        passedTestCases: turn.passedTestCases,
        totalTestCases: turn.totalTestCases,
      })),
      {
        role: 'user' as const,
        content: dto.answer,
        code: codeTurn?.code,
        judgeVerdict: codeTurn?.judgeVerdict,
        passedTestCases: codeTurn?.passedTestCases,
        totalTestCases: codeTurn?.totalTestCases,
      },
    ]);

    const { system, prompt } = buildTurnPrompt(context, transcript.lines);
    const response = await this.callAi({
      system,
      prompt,
      schema: turnResponseSchema,
    });

    await this.repository.markStarted(sessionId, new Date());
    const { userTurnId } = await this.repository.addTurnPair(
      sessionId,
      {
        role: 'user',
        content: dto.answer,
        code: codeTurn?.code,
        languageId: codeTurn?.languageId,
        judgeVerdict: codeTurn?.judgeVerdict,
        passedTestCases: codeTurn?.passedTestCases,
        totalTestCases: codeTurn?.totalTestCases,
        timeMs: codeTurn?.timeMs,
        memoryKb: codeTurn?.memoryKb,
      },
      { role: 'ai', content: response.nextQuestion },
      response.feedback ?? [],
    );
    await this.audit.record({
      userId,
      action: 'interview.turn.created',
      entityType: 'interview_turn',
      entityId: userTurnId,
      after: { sessionId, hasCode: Boolean(codeTurn), verdict: codeTurn?.judgeVerdict },
      ip,
    });

    return {
      sessionId,
      status: 'in_progress',
      nextQuestion: response.nextQuestion,
      feedback: response.feedback,
      judgeResult: codeTurn
        ? {
            verdict: codeTurn.judgeVerdict,
            passedTestCases: codeTurn.passedTestCases,
            totalTestCases: codeTurn.totalTestCases,
          }
        : undefined,
    };
  }

  // ---- End & report ----

  async endSession(userId: string, sessionId: string, ip?: string) {
    const session = await this.ensureOwned(userId, sessionId);
    if (session.status === 'ended') {
      return {
        id: session.id,
        status: 'ended',
        reportAvailable: Boolean(session.report),
        alreadyEnded: true,
      };
    }

    await this.repository.endSession(sessionId, new Date());
    await this.audit.record({
      userId,
      action: 'interview.session.ended',
      entityType: 'interview_session',
      entityId: sessionId,
      after: { turnCount: session.turns.length },
      ip,
    });

    let report: unknown = null;
    try {
      report = await this.tryGenerateReport(sessionId, userId, session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`Interview report generation failed for session ${sessionId}: ${message}`);
    }
    return {
      id: session.id,
      status: 'ended',
      reportAvailable: Boolean(report),
      alreadyEnded: false,
    };
  }

  async getReport(userId: string, sessionId: string) {
    const session = await this.ensureOwned(userId, sessionId);
    if (session.status !== 'ended') {
      throw new ConflictException(SESSION_NOT_ENDED);
    }
    if (!session.report) {
      await this.tryGenerateReport(sessionId, userId, session);
    }
    const report = await this.repository.findReport(sessionId);
    if (!report) {
      throw new AiServiceError('Report generation failed; please retry');
    }
    return {
      sessionId,
      overallScore: report.overallScore,
      summary: report.summary,
      strengths: report.strengths,
      improvements: report.improvements,
      suggestions: report.suggestions,
      topicScores: report.topicScores,
      generatedAt: report.generatedAt.toISOString(),
    };
  }

  // ---- Internals ----

  /**
   * Run a structured AI call and normalize failures into a clean, retryable
   * 502 `AI_GENERATION_FAILED` instead of leaking the raw error. The caller is
   * responsible for only committing state after this resolves.
   */
  private async callAi<T>(request: {
    system: string;
    prompt: string;
    schema: ZodType<T>;
  }): Promise<T> {
    try {
      return await this.ai.generateStructured(request);
    } catch (err) {
      if (err instanceof AiServiceError) {
        throw new BadGatewayException({
          code: 'AI_GENERATION_FAILED',
          message: err.message,
        });
      }
      throw err;
    }
  }

  private async tryGenerateReport(
    sessionId: string,
    userId: string,
    session: InterviewSessionWithTurns,
  ) {
    const context = await this.buildContext(userId, session.type, session.problemId ?? undefined);
    const transcript = buildInterviewTranscript(
      session.turns.map((turn) => ({
        role: turn.role as 'ai' | 'user',
        content: turn.content,
        code: turn.code,
        judgeVerdict: turn.judgeVerdict,
        passedTestCases: turn.passedTestCases,
        totalTestCases: turn.totalTestCases,
      })),
    );
    const { system, prompt } = buildReportPrompt(context, transcript.lines);
    const report = await this.callAi({ system, prompt, schema: reportSchema });
    return this.repository.createReport({
      sessionId,
      overallScore: report.overallScore,
      summary: report.summary,
      strengths: report.strengths ?? [],
      improvements: report.improvements ?? [],
      suggestions: report.suggestions ?? [],
      topicScores: report.topicScores ?? null,
    });
  }

  private async gradeCode(session: InterviewSessionWithTurns, code: string, languageId: number) {
    const problem = await this.repository.findProblemById(session.problemId ?? '');
    if (!problem) {
      throw new NotFoundException(PROBLEM_NOT_FOUND);
    }
    const result = await this.judge.grade({
      sourceCode: code,
      languageId,
      testCases: problem.hiddenTestCases,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    });
    const times = result.results.map((item) => item.timeMs ?? 0);
    const memories = result.results.map((item) => item.memoryKb ?? 0);
    return {
      role: 'user' as const,
      content: code,
      code,
      languageId,
      judgeVerdict: result.verdict,
      passedTestCases: result.passed,
      totalTestCases: result.total,
      timeMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      memoryKb: memories.length
        ? Math.round(memories.reduce((a, b) => a + b, 0) / memories.length)
        : null,
    };
  }

  private async buildContext(
    userId: string,
    type: string,
    problemId?: string,
  ): Promise<InterviewContext> {
    const context: InterviewContext = { type, mode: 'text' };
    if (type === 'technical') {
      context.skills = await this.repository.findSkillProfile(userId);
    }
    if (type === 'dsa' && problemId) {
      const problem = await this.repository.findProblemById(problemId);
      if (!problem) {
        throw new NotFoundException(PROBLEM_NOT_FOUND);
      }
      context.problem = {
        title: problem.title,
        difficulty: problem.difficulty,
        topics: problem.topics,
        statement: problem.statement,
      };
    }
    return context;
  }

  private async ensureOwned(userId: string, sessionId: string): Promise<InterviewSessionWithTurns> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException(SESSION_NOT_FOUND);
    }
    return session;
  }

  private mapDetail(session: {
    id: string;
    type: string;
    mode: string;
    status: string;
    startedAt?: Date | null;
    endedAt?: Date | null;
    createdAt: Date;
    turns: Array<{ role: string; content: string; order: number }>;
    report?: { id: string } | null;
  }) {
    return {
      id: session.id,
      type: session.type,
      mode: session.mode,
      status: session.status,
      startedAt: session.startedAt?.toISOString(),
      endedAt: session.endedAt?.toISOString(),
      createdAt: session.createdAt.toISOString(),
      turns: session.turns.map((turn) => ({
        role: turn.role,
        content: turn.content,
        order: turn.order,
      })),
      reportAvailable: Boolean(session.report),
    };
  }
}
