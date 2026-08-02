import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import { JudgeService } from '../judge/judge.service';
import { DsaRepository, ProblemFilters, SubmissionDetail } from './dsa.repository';
import { DsaCompeteService } from './dsa-compete.service';
import { DsaGateway } from './dsa.gateway';
import { SUBMISSION_QUEUE, SubmissionJobData } from './submission.queue';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';

export interface RunCodeInput {
  sourceCode: string;
  languageId: number;
  stdin?: string;
}

export interface SubmitCodeInput {
  sourceCode: string;
  languageId: number;
  contestId?: string;
}

@Injectable()
export class DsaService {
  constructor(
    private readonly repository: DsaRepository,
    private readonly judge: JudgeService,
    private readonly audit: AuditService,
    private readonly gateway: DsaGateway,
    private readonly compete: DsaCompeteService,
    @InjectQueue(SUBMISSION_QUEUE) private readonly submissionQueue: Queue<SubmissionJobData>,
  ) {}

  // ---- Problems ----

  async listProblems(
    filters: ProblemFilters,
    page: number,
    limit: number,
    sortBy: string,
    order: 'asc' | 'desc',
  ) {
    const [data, total] = await Promise.all([
      this.repository.findProblems(filters, page, limit, sortBy, order),
      this.repository.countProblems(filters),
    ]);
    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getProblem(id: string) {
    const problem = await this.repository.findProblemById(id);
    if (!problem) {
      throw new NotFoundException({ code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' });
    }
    const { testCases, ...rest } = problem;
    return {
      ...rest,
      samples: testCases.filter((testCase) => testCase.isSample),
    };
  }

  async runCode(userId: string, problemId: string, input: RunCodeInput, ip?: string) {
    const problem = await this.repository.findProblemById(problemId);
    if (!problem) {
      throw new NotFoundException({ code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' });
    }
    const result = await this.judge.run({
      sourceCode: input.sourceCode,
      languageId: input.languageId,
      stdin: input.stdin ?? '',
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    });
    await this.audit.record({
      userId,
      action: 'dsa.code.ran',
      entityType: 'problem',
      entityId: problemId,
      after: { verdict: result.verdict, languageId: input.languageId },
      ip,
    });
    return result;
  }

  async submitCode(userId: string, problemId: string, input: SubmitCodeInput, ip?: string) {
    const problem = await this.repository.findProblemById(problemId);
    if (!problem) {
      throw new NotFoundException({ code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' });
    }
    if (input.contestId) {
      await this.compete.assertSubmittable(userId, input.contestId, problemId);
    }
    const submission = await this.repository.createSubmission({
      userId,
      problemId,
      languageId: input.languageId,
      sourceCode: input.sourceCode,
      contestId: input.contestId,
    });
    await this.submissionQueue.add(
      'grade',
      { submissionId: submission.id },
      {
        jobId: submission.id,
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      },
    );
    await this.audit.record({
      userId,
      action: 'dsa.submission.created',
      entityType: 'submission',
      entityId: submission.id,
      after: { problemId, languageId: input.languageId, status: 'queued' },
      ip,
    });
    return { submissionId: submission.id, status: submission.status };
  }

  // ---- Submissions ----

  async getSubmission(userId: string, submissionId: string) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new NotFoundException({
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found',
      });
    }
    if (submission.userId !== userId) {
      throw new NotFoundException({
        code: 'SUBMISSION_NOT_FOUND',
        message: 'Submission not found',
      });
    }
    return this.mapSubmission(submission);
  }

  async listMySubmissions(
    userId: string,
    problemId: string | undefined,
    verdict: string | undefined,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.repository.findSubmissions(userId, problemId, verdict, page, limit),
      this.repository.countSubmissions(userId, problemId, verdict),
    ]);
    return {
      data: data.map((submission) => this.mapSubmission(submission)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ---- Editorial & hints ----

  async getEditorial(problemId: string) {
    await this.ensureProblem(problemId);
    const editorial = await this.repository.findEditorial(problemId);
    if (!editorial) {
      throw new NotFoundException({
        code: 'EDITORIAL_NOT_FOUND',
        message: 'No editorial yet for this problem',
      });
    }
    return {
      id: editorial.id,
      problemId: editorial.problemId,
      content: editorial.content,
      complexity: editorial.complexity,
      updatedAt: editorial.updatedAt.toISOString(),
    };
  }

  async getHints(userId: string, problemId: string) {
    await this.ensureProblem(problemId);
    const [hints, unlock] = await Promise.all([
      this.repository.findHints(problemId),
      this.repository.findHintUnlock(userId, problemId),
    ]);
    const unlocked = Math.max(unlock?.unlockedHints ?? 0, 1);
    return {
      hints: hints.map((hint) => ({
        id: hint.id,
        order: hint.order,
        content: hint.order <= unlocked ? hint.content : null,
        isUnlocked: hint.order <= unlocked,
      })),
    };
  }

  async unlockHint(userId: string, problemId: string, hintOrder: number, ip?: string) {
    await this.ensureProblem(problemId);
    const hint = await this.repository
      .findHints(problemId)
      .then((hints) => hints.find((item) => item.order === hintOrder));
    if (!hint) {
      throw new NotFoundException({
        code: 'HINT_NOT_FOUND',
        message: `Hint ${hintOrder} not found`,
      });
    }
    const unlock = await this.repository.findHintUnlock(userId, problemId);
    const currentlyUnlocked = Math.max(unlock?.unlockedHints ?? 0, 1);
    if (hintOrder > currentlyUnlocked + 1) {
      throw new NotFoundException({
        code: 'HINT_LOCKED',
        message: `Hint ${hintOrder} is not unlocked yet — reveal hint ${currentlyUnlocked + 1} first`,
      });
    }
    await this.repository.upsertHintUnlock(
      userId,
      problemId,
      Math.max(currentlyUnlocked, hintOrder),
    );
    await this.audit.record({
      userId,
      action: 'dsa.hint.unlocked',
      entityType: 'hint',
      entityId: hint.id,
      before: { unlockedHints: currentlyUnlocked },
      after: { unlockedHints: Math.max(currentlyUnlocked, hintOrder) },
      ip,
    });
    return { id: hint.id, order: hint.order, content: hint.content };
  }

  // ---- Grading (called by the queue processor) ----

  async gradeSubmission(submissionId: string): Promise<void> {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      return;
    }

    await this.repository.updateSubmission(submissionId, { status: 'running' });

    try {
      const testCases = await this.repository.findHiddenTestCases(submission.problemId);
      const result = await this.judge.grade({
        sourceCode: submission.sourceCode,
        languageId: submission.languageId,
        testCases,
        timeLimitMs: submission.problem.timeLimitMs,
        memoryLimitMb: submission.problem.memoryLimitMb,
      });

      const times = result.results.map((item) => item.timeMs ?? 0);
      const memories = result.results.map((item) => item.memoryKb ?? 0);
      const completedAt = new Date();

      await this.repository.updateSubmission(submissionId, {
        status: 'completed',
        verdict: result.verdict,
        passedTestCases: result.passed,
        totalTestCases: result.total,
        failedCaseIndex: result.failedCaseIndex,
        failedCaseVerdict: result.failedCaseVerdict,
        timeMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : undefined,
        memoryKb: memories.length
          ? Math.round(memories.reduce((a, b) => a + b, 0) / memories.length)
          : undefined,
        completedAt,
      });

      if (result.verdict === 'accepted') {
        await this.repository.markSolved(submission.userId, submission.problemId);
      }

      await this.compete.onSubmissionGraded({
        id: submission.id,
        userId: submission.userId,
        contestId: submission.contestId,
        problemId: submission.problemId,
        verdict: result.verdict,
        completedAt,
      });

      await this.audit.record({
        userId: submission.userId,
        action: 'dsa.submission.graded',
        entityType: 'submission',
        entityId: submissionId,
        after: {
          verdict: result.verdict,
          passed: result.passed,
          total: result.total,
        },
      });

      this.gateway.emitVerdict(submission.userId, {
        submissionId,
        problemId: submission.problemId,
        status: 'completed',
        verdict: result.verdict,
        passedTestCases: result.passed,
        totalTestCases: result.total,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Grading failed';
      await this.repository.updateSubmission(submissionId, {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      });
      this.gateway.emitVerdict(submission.userId, {
        submissionId,
        problemId: submission.problemId,
        status: 'failed',
      });
    }
  }

  // ---- Helpers ----

  private async ensureProblem(problemId: string): Promise<void> {
    const problem = await this.repository.findProblemById(problemId);
    if (!problem) {
      throw new NotFoundException({ code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' });
    }
  }

  private mapSubmission(submission: SubmissionDetail) {
    return {
      id: submission.id,
      problemId: submission.problemId,
      problem: submission.problem
        ? {
            id: submission.problem.id,
            title: submission.problem.title,
            difficulty: submission.problem.difficulty,
          }
        : undefined,
      languageId: submission.languageId,
      status: submission.status,
      verdict: submission.verdict,
      passedTestCases: submission.passedTestCases,
      totalTestCases: submission.totalTestCases,
      failedCaseIndex: submission.failedCaseIndex,
      failedCaseVerdict: submission.failedCaseVerdict,
      errorMessage: submission.errorMessage,
      stdout: submission.stdout,
      stderr: submission.stderr,
      timeMs: submission.timeMs,
      memoryKb: submission.memoryKb,
      submittedAt: submission.submittedAt.toISOString(),
      completedAt: submission.completedAt?.toISOString(),
    };
  }
}
