import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { JudgeService } from '../judge/judge.service';
import { InterviewRepository } from './interview.repository';
import { InterviewService } from './interview.service';

describe('InterviewService', () => {
  const asAny = (value: unknown): any => value;

  let service: InterviewService;
  let repository: Record<string, jest.Mock>;
  let ai: { generateStructured: jest.Mock };
  let judge: { grade: jest.Mock };
  let audit: { record: jest.Mock };

  const baseSession = (overrides: Record<string, unknown> = {}) =>
    asAny({
      id: 's1',
      userId: 'u1',
      type: 'technical',
      mode: 'text',
      status: 'created',
      problemId: null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date('2026-08-02T00:00:00Z'),
      updatedAt: new Date('2026-08-02T00:00:00Z'),
      turns: [],
      report: null,
      ...overrides,
    });

  const dsaProblem = () => ({
    id: 'p1',
    title: 'Two Sum',
    difficulty: 'easy',
    topics: ['array'],
    statement: 'Return indices that sum to target.',
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    hiddenTestCases: [{ stdin: '1\n2\n', expectedOutput: '3' }],
  });

  const judgeResult = () => ({
    verdict: 'accepted',
    passed: 4,
    total: 4,
    failedCaseIndex: undefined,
    failedCaseVerdict: undefined,
    results: [
      { index: 0, verdict: 'accepted', timeMs: 10, memoryKb: 1024 },
      { index: 1, verdict: 'accepted', timeMs: 12, memoryKb: 1024 },
    ],
  });

  beforeEach(async () => {
    repository = {
      createSession: jest.fn(),
      findSessionById: jest.fn(),
      countSessions: jest.fn(),
      listSessions: jest.fn(),
      findProblemById: jest.fn(),
      findSkillProfile: jest.fn(),
      addTurnPair: jest.fn().mockResolvedValue({ userTurnId: 't1', aiTurnId: 't2' }),
      createFirstAiTurn: jest.fn().mockResolvedValue(undefined),
      markStarted: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
      createReport: jest.fn().mockImplementation((data) => ({ id: 'r1', ...data })),
      findReport: jest.fn().mockResolvedValue(null),
    };
    ai = { generateStructured: jest.fn() };
    judge = { grade: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        InterviewService,
        { provide: InterviewRepository, useValue: repository },
        { provide: AiService, useValue: ai },
        { provide: JudgeService, useValue: judge },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(InterviewService);
  });

  // ---- createSession ----

  describe('createSession', () => {
    it('creates a session and persists the AI opening question as the first turn', async () => {
      ai.generateStructured.mockResolvedValue({ question: 'Tell me about yourself' });
      repository.createSession.mockResolvedValue(baseSession({ type: 'hr' }));

      const result = await service.createSession('u1', { type: 'hr' });

      expect(ai.generateStructured).toHaveBeenCalledWith(
        expect.objectContaining({ schema: expect.anything() }),
      );
      expect(repository.createSession).toHaveBeenCalledWith({
        userId: 'u1',
        type: 'hr',
        mode: 'text',
        problemId: undefined,
      });
      expect(repository.createFirstAiTurn).toHaveBeenCalledWith('s1', 'Tell me about yourself');
      expect(result).toEqual(
        expect.objectContaining({
          id: 's1',
          type: 'hr',
          turns: [{ role: 'ai', content: 'Tell me about yourself', order: 0 }],
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'interview.session.created' }),
      );
    });

    it('rejects voice mode with an explicit 501 MODE_NOT_AVAILABLE', async () => {
      await expect(service.createSession('u1', { type: 'hr', mode: 'voice' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'MODE_NOT_AVAILABLE' }),
        }),
      );
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it('rejects video mode the same way', async () => {
      await expect(service.createSession('u1', { type: 'hr', mode: 'video' })).rejects.toThrow(
        NotImplementedException,
      );
    });

    it('requires a problemId for dsa interviews', async () => {
      await expect(service.createSession('u1', { type: 'dsa' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'PROBLEM_REQUIRED' }),
        }),
      );
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it('404s for an unknown problemId on a dsa interview', async () => {
      repository.findProblemById.mockResolvedValue(null);
      await expect(service.createSession('u1', { type: 'dsa', problemId: 'nope' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it('feeds the linked problem into the opening prompt for dsa interviews', async () => {
      ai.generateStructured.mockResolvedValue({ question: 'Solve Two Sum' });
      repository.findProblemById.mockResolvedValue(dsaProblem());
      repository.createSession.mockResolvedValue(baseSession({ type: 'dsa', problemId: 'p1' }));

      await service.createSession('u1', { type: 'dsa', problemId: 'p1' });

      const prompt = ai.generateStructured.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('Two Sum');
      expect(prompt).toContain('Return indices that sum to target.');
      expect(repository.createSession).toHaveBeenCalledWith({
        userId: 'u1',
        type: 'dsa',
        mode: 'text',
        problemId: 'p1',
      });
    });

    it('pulls the skill profile into the opening prompt for technical interviews', async () => {
      ai.generateStructured.mockResolvedValue({ question: 'Walk me through React' });
      repository.findSkillProfile.mockResolvedValue([
        {
          name: 'React',
          category: 'frontend',
          proficiencyLevel: 'intermediate',
          yearsOfExperience: 2,
          isPrimary: true,
        },
      ]);
      repository.createSession.mockResolvedValue(baseSession({ type: 'technical' }));

      await service.createSession('u1', { type: 'technical' });

      expect(repository.findSkillProfile).toHaveBeenCalledWith('u1');
      const prompt = ai.generateStructured.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('React');
      expect(prompt).toContain('intermediate');
    });

    it('does not persist anything when the opening AI call fails', async () => {
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom'));
      await expect(service.createSession('u1', { type: 'hr' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'AI_GENERATION_FAILED' }),
        }),
      );
      expect(repository.createSession).not.toHaveBeenCalled();
      expect(repository.createFirstAiTurn).not.toHaveBeenCalled();
    });
  });

  // ---- addTurn ----

  describe('addTurn', () => {
    const createdSession = (overrides: Record<string, unknown> = {}) =>
      baseSession({ type: 'technical', ...overrides });

    it('persists the answer + AI next question + feedback and transitions to in_progress', async () => {
      repository.findSessionById.mockResolvedValue(createdSession());
      ai.generateStructured.mockResolvedValue({
        nextQuestion: 'What about time complexity?',
        feedback: [{ skill: 'communication', score: 7, comment: 'Clear structure' }],
      });

      const result = await service.addTurn('u1', 's1', { answer: 'I would approach it by…' });

      expect(repository.markStarted).toHaveBeenCalledWith('s1', expect.any(Date));
      expect(repository.addTurnPair).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ role: 'user', content: 'I would approach it by…' }),
        expect.objectContaining({ role: 'ai', content: 'What about time complexity?' }),
        [{ skill: 'communication', score: 7, comment: 'Clear structure' }],
      );
      expect(result).toEqual(
        expect.objectContaining({
          status: 'in_progress',
          nextQuestion: 'What about time complexity?',
          feedback: [{ skill: 'communication', score: 7, comment: 'Clear structure' }],
        }),
      );
    });

    it('rejects turns on an ended session with 409', async () => {
      repository.findSessionById.mockResolvedValue(createdSession({ status: 'ended' }));
      await expect(service.addTurn('u1', 's1', { answer: 'hi' })).rejects.toThrow(
        expect.objectContaining({ response: expect.objectContaining({ code: 'SESSION_ENDED' }) }),
      );
      expect(repository.addTurnPair).not.toHaveBeenCalled();
    });

    it('rejects code submissions on non-dsa interviews', async () => {
      repository.findSessionById.mockResolvedValue(createdSession({ type: 'technical' }));
      await expect(
        service.addTurn('u1', 's1', { answer: 'hi', code: 'print(1)', languageId: 71 }),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'CODE_NOT_ALLOWED' }),
        }),
      );
      expect(judge.grade).not.toHaveBeenCalled();
    });

    it('requires a languageId when dsa code is submitted', async () => {
      repository.findSessionById.mockResolvedValue(
        createdSession({ type: 'dsa', problemId: 'p1' }),
      );
      await expect(service.addTurn('u1', 's1', { answer: 'hi', code: 'print(1)' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'LANGUAGE_REQUIRED' }),
        }),
      );
      expect(judge.grade).not.toHaveBeenCalled();
    });

    it('grades dsa code via JudgeService and feeds the verdict back', async () => {
      repository.findSessionById.mockResolvedValue(
        createdSession({ type: 'dsa', problemId: 'p1' }),
      );
      repository.findProblemById.mockResolvedValue(dsaProblem());
      judge.grade.mockResolvedValue(judgeResult());
      ai.generateStructured.mockResolvedValue({ nextQuestion: 'Optimize it', feedback: [] });

      const result = await service.addTurn('u1', 's1', {
        answer: 'My solution',
        code: 'print(1)',
        languageId: 71,
      });

      expect(judge.grade).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceCode: 'print(1)',
          languageId: 71,
          testCases: [{ stdin: '1\n2\n', expectedOutput: '3' }],
          timeLimitMs: 1000,
          memoryLimitMb: 256,
        }),
      );
      const turnPairArgs = repository.addTurnPair.mock.calls[0];
      expect(turnPairArgs[1]).toEqual(
        expect.objectContaining({
          judgeVerdict: 'accepted',
          passedTestCases: 4,
          totalTestCases: 4,
        }),
      );
      const prompt = ai.generateStructured.mock.calls[0][0].prompt as string;
      expect(prompt).toContain('accepted');
      expect(result.judgeResult).toEqual({
        verdict: 'accepted',
        passedTestCases: 4,
        totalTestCases: 4,
      });
    });

    it('leaves the session cleanly retryable when the AI call fails mid-interview', async () => {
      repository.findSessionById.mockResolvedValue(createdSession());
      ai.generateStructured
        .mockRejectedValueOnce(new AiServiceError('boom'))
        .mockResolvedValueOnce({ nextQuestion: 'Next?', feedback: [] });

      await expect(service.addTurn('u1', 's1', { answer: 'answer one' })).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'AI_GENERATION_FAILED' }),
        }),
      );
      expect(repository.addTurnPair).not.toHaveBeenCalled();

      const result = await service.addTurn('u1', 's1', { answer: 'answer two' });
      expect(result.nextQuestion).toBe('Next?');
      expect(repository.addTurnPair).toHaveBeenCalledTimes(1);
    });

    it("404s for another user's session", async () => {
      repository.findSessionById.mockResolvedValue(baseSession({ userId: 'someone-else' }));
      await expect(service.addTurn('u2', 's1', { answer: 'hi' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---- endSession ----

  describe('endSession', () => {
    it('ends the session and generates the report', async () => {
      repository.findSessionById.mockResolvedValue(
        baseSession({ status: 'in_progress', turns: [{ role: 'ai', content: 'q1', order: 0 }] }),
      );
      repository.createReport.mockImplementation((data) => ({ id: 'r1', ...data }));
      ai.generateStructured.mockResolvedValue({
        overallScore: 78,
        summary: 'Solid performance',
        strengths: ['Communication'],
        improvements: ['Depth'],
        suggestions: ['Practice trees'],
        topicScores: { communication: 80 },
      });

      const result = await service.endSession('u1', 's1');

      expect(repository.endSession).toHaveBeenCalledWith('s1', expect.any(Date));
      expect(repository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 's1', overallScore: 78 }),
      );
      expect(result).toEqual({
        id: 's1',
        status: 'ended',
        reportAvailable: true,
        alreadyEnded: false,
      });
    });

    it('is idempotent for an already-ended session', async () => {
      repository.findSessionById.mockResolvedValue(
        baseSession({ status: 'ended', report: { id: 'r1' } }),
      );
      const result = await service.endSession('u1', 's1');
      expect(result).toEqual({
        id: 's1',
        status: 'ended',
        reportAvailable: true,
        alreadyEnded: true,
      });
      expect(repository.endSession).not.toHaveBeenCalled();
      expect(ai.generateStructured).not.toHaveBeenCalled();
    });

    it('still ends the session when the report AI call fails', async () => {
      repository.findSessionById.mockResolvedValue(baseSession({ status: 'in_progress' }));
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom'));

      const result = await service.endSession('u1', 's1');

      expect(repository.endSession).toHaveBeenCalledWith('s1', expect.any(Date));
      expect(repository.createReport).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 's1',
        status: 'ended',
        reportAvailable: false,
        alreadyEnded: false,
      });
    });
  });

  // ---- getReport ----

  describe('getReport', () => {
    it('409s before the session is ended', async () => {
      repository.findSessionById.mockResolvedValue(baseSession({ status: 'in_progress' }));
      await expect(service.getReport('u1', 's1')).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({ code: 'SESSION_NOT_ENDED' }),
        }),
      );
    });

    it('returns the stored report after the session ends', async () => {
      const report = {
        id: 'r1',
        sessionId: 's1',
        overallScore: 82,
        summary: 'Great',
        strengths: ['A'],
        improvements: ['B'],
        suggestions: ['C'],
        topicScores: { dsa: 90 },
        generatedAt: new Date('2026-08-02T00:00:00Z'),
      };
      repository.findSessionById.mockResolvedValue(baseSession({ status: 'ended', report }));
      repository.findReport.mockResolvedValue(report);

      const result = await service.getReport('u1', 's1');
      expect(result).toEqual(
        expect.objectContaining({ overallScore: 82, summary: 'Great', strengths: ['A'] }),
      );
      expect(ai.generateStructured).not.toHaveBeenCalled();
    });

    it('lazily generates the report when end-time generation failed earlier', async () => {
      repository.findSessionById.mockResolvedValue(baseSession({ status: 'ended' }));
      ai.generateStructured.mockResolvedValue({
        overallScore: 60,
        summary: 'Retried',
        strengths: [],
        improvements: [],
        suggestions: [],
      });
      repository.findReport.mockResolvedValue({
        id: 'r1',
        sessionId: 's1',
        overallScore: 60,
        summary: 'Retried',
        strengths: [],
        improvements: [],
        suggestions: [],
        topicScores: null,
        generatedAt: new Date(),
      });

      const result = await service.getReport('u1', 's1');
      expect(repository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({ overallScore: 60 }),
      );
      expect(result.overallScore).toBe(60);
    });
  });

  // ---- session reads ----

  describe('session reads', () => {
    it('lists paginated sessions', async () => {
      repository.listSessions.mockResolvedValue([
        {
          id: 's1',
          type: 'hr',
          mode: 'text',
          status: 'ended',
          createdAt: new Date(),
          endedAt: new Date(),
          report: { overallScore: 70 },
        },
      ]);
      repository.countSessions.mockResolvedValue(1);

      const result = await service.listSessions('u1', 1, 20);
      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toEqual(expect.objectContaining({ id: 's1', reportAvailable: true }));
    });

    it('gets a session detail with its transcript', async () => {
      repository.findSessionById.mockResolvedValue(
        baseSession({ turns: [{ role: 'ai', content: 'q1', order: 0 }] }),
      );
      const result = await service.getSession('u1', 's1');
      expect(result.turns).toEqual([{ role: 'ai', content: 'q1', order: 0 }]);
      expect(result.reportAvailable).toBe(false);
    });
  });
});
