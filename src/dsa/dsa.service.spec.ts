import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AuditService } from '../audit/audit.service';
import { JudgeService } from '../judge/judge.service';
import { DsaRepository } from './dsa.repository';
import { DsaService } from './dsa.service';
import { DsaGateway } from './dsa.gateway';
import { SUBMISSION_QUEUE } from './submission.queue';

describe('DsaService', () => {
  const asAny = (value: unknown): any => value;
  void asAny;
  let service: DsaService;
  let repository: {
    findProblems: jest.Mock;
    countProblems: jest.Mock;
    findProblemById: jest.Mock;
    findProblemBySlug: jest.Mock;
    findSampleTestCases: jest.Mock;
    findHiddenTestCases: jest.Mock;
    findEditorial: jest.Mock;
    findHints: jest.Mock;
    findHintUnlock: jest.Mock;
    upsertHintUnlock: jest.Mock;
    createSubmission: jest.Mock;
    findSubmissionById: jest.Mock;
    findSubmissions: jest.Mock;
    countSubmissions: jest.Mock;
    updateSubmission: jest.Mock;
    markSolved: jest.Mock;
    countSolved: jest.Mock;
    findSolvedByUserAndProblem: jest.Mock;
  };
  let judge: { run: jest.Mock; grade: jest.Mock };
  let audit: { record: jest.Mock };
  let gateway: { emitVerdict: jest.Mock };
  let submissionQueue: { add: jest.Mock };

  const problem = (id: string) => ({
    id,
    slug: `slug-${id}`,
    title: 'Two Sum',
    statement: 'Given nums...',
    difficulty: 'easy',
    topics: ['arrays', 'hash-table'],
    companies: ['Google'],
    tags: ['two-pointers'],
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    isPremium: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    testCases: [
      {
        id: 'tc1',
        problemId: id,
        input: '1\n2\n',
        expectedOutput: '3\n',
        isSample: true,
        order: 0,
        createdAt: new Date(),
      },
    ],
  });

  const submission = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    userId: 'user-1',
    problemId: 'p1',
    languageId: 71,
    sourceCode: 'print(input())',
    status: 'queued',
    verdict: null,
    passedTestCases: 0,
    totalTestCases: 0,
    failedCaseIndex: null,
    failedCaseVerdict: null,
    errorMessage: null,
    stdout: null,
    stderr: null,
    timeMs: null,
    memoryKb: null,
    submittedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    problem: {
      id: 'p1',
      title: 'Two Sum',
      difficulty: 'easy',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
    },
    ...overrides,
  });

  beforeEach(async () => {
    repository = {
      findProblems: jest.fn(),
      countProblems: jest.fn(),
      findProblemById: jest.fn(),
      findProblemBySlug: jest.fn(),
      findSampleTestCases: jest.fn(),
      findHiddenTestCases: jest.fn(),
      findEditorial: jest.fn(),
      findHints: jest.fn(),
      findHintUnlock: jest.fn(),
      upsertHintUnlock: jest.fn(),
      createSubmission: jest.fn(),
      findSubmissionById: jest.fn(),
      findSubmissions: jest.fn(),
      countSubmissions: jest.fn(),
      updateSubmission: jest.fn(),
      markSolved: jest.fn(),
      countSolved: jest.fn(),
      findSolvedByUserAndProblem: jest.fn(),
    };
    judge = { run: jest.fn(), grade: jest.fn() };
    audit = { record: jest.fn() };
    gateway = { emitVerdict: jest.fn() };
    submissionQueue = { add: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DsaService,
        { provide: DsaRepository, useValue: repository },
        { provide: JudgeService, useValue: judge },
        { provide: AuditService, useValue: audit },
        { provide: DsaGateway, useValue: gateway },
        { provide: getQueueToken(SUBMISSION_QUEUE), useValue: submissionQueue },
      ],
    }).compile();

    service = module.get(DsaService);
  });

  describe('listProblems', () => {
    it('returns paginated problems with the standard envelope', async () => {
      repository.findProblems.mockResolvedValue([problem('p1')]);
      repository.countProblems.mockResolvedValue(42);
      const result = await service.listProblems({ difficulty: 'easy' }, 1, 10, 'createdAt', 'desc');
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 42, page: 1, limit: 10, totalPages: 5 });
      expect(repository.findProblems).toHaveBeenCalledWith(
        { difficulty: 'easy' },
        1,
        10,
        'createdAt',
        'desc',
      );
    });
  });

  describe('getProblem', () => {
    it('returns the problem with only sample test cases', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      const result = await service.getProblem('p1');
      expect(result.title).toBe('Two Sum');
      expect(result.samples).toHaveLength(1);
      expect(result.samples[0].isSample).toBe(true);
    });

    it('throws 404 for an unknown problem', async () => {
      repository.findProblemById.mockResolvedValue(null);
      await expect(service.getProblem('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('runCode', () => {
    it('runs custom stdin against the judge and audits', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      judge.run.mockResolvedValue({ verdict: 'accepted', stdout: '3\n' });
      const result = await service.runCode('user-1', 'p1', {
        sourceCode: 'print(1+2)',
        languageId: 71,
        stdin: '',
      });
      expect(result).toEqual({ verdict: 'accepted', stdout: '3\n' });
      expect(judge.run).toHaveBeenCalledWith({
        sourceCode: 'print(1+2)',
        languageId: 71,
        stdin: '',
        timeLimitMs: 1000,
        memoryLimitMb: 256,
      });
      expect(audit.record).toHaveBeenCalled();
    });

    it('throws 404 for an unknown problem', async () => {
      repository.findProblemById.mockResolvedValue(null);
      await expect(
        service.runCode('user-1', 'nope', { sourceCode: '', languageId: 71 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitCode', () => {
    it('creates a submission, enqueues it, and returns the submission id', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.createSubmission.mockResolvedValue(submission('s1'));
      const result = await service.submitCode('user-1', 'p1', {
        sourceCode: 'print(1)',
        languageId: 71,
      });
      expect(result).toEqual({ submissionId: 's1', status: 'queued' });
      expect(submissionQueue.add).toHaveBeenCalledWith(
        'grade',
        { submissionId: 's1' },
        expect.objectContaining({ jobId: 's1' }),
      );
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('getSubmission', () => {
    it('returns a submission owned by the user', async () => {
      repository.findSubmissionById.mockResolvedValue(
        submission('s1', { verdict: 'accepted', status: 'completed' }),
      );
      const result = await service.getSubmission('user-1', 's1');
      expect(result.id).toBe('s1');
      expect(result.verdict).toBe('accepted');
    });

    it('hides a submission owned by another user (404)', async () => {
      repository.findSubmissionById.mockResolvedValue(submission('s1', { userId: 'other' }));
      await expect(service.getSubmission('user-1', 's1')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 for a missing submission', async () => {
      repository.findSubmissionById.mockResolvedValue(null);
      await expect(service.getSubmission('user-1', 's1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMySubmissions', () => {
    it('returns paginated submissions', async () => {
      repository.findSubmissions.mockResolvedValue([submission('s1')]);
      repository.countSubmissions.mockResolvedValue(7);
      const result = await service.listMySubmissions('user-1', 'p1', 'accepted', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(7);
    });
  });

  describe('getEditorial', () => {
    it('returns the editorial when present', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findEditorial.mockResolvedValue({
        id: 'e1',
        problemId: 'p1',
        content: 'Use a hash map',
        complexity: 'O(n)',
        updatedAt: new Date(),
      });
      const result = await service.getEditorial('p1');
      expect(result.content).toBe('Use a hash map');
    });

    it('throws 404 when there is no editorial', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findEditorial.mockResolvedValue(null);
      await expect(service.getEditorial('p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHints', () => {
    const hints = [
      { id: 'h1', problemId: 'p1', order: 1, content: 'Think hash map', createdAt: new Date() },
      {
        id: 'h2',
        problemId: 'p1',
        order: 2,
        content: 'Store value -> index',
        createdAt: new Date(),
      },
    ];

    it('returns hint 1 unlocked and later hints locked for a fresh user', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findHints.mockResolvedValue(hints);
      repository.findHintUnlock.mockResolvedValue(null);
      const result = await service.getHints('user-1', 'p1');
      expect(result.hints[0]).toMatchObject({ order: 1, isUnlocked: true });
      expect(result.hints[0].content).toBe('Think hash map');
      expect(result.hints[1]).toMatchObject({ order: 2, isUnlocked: false });
      expect(result.hints[1].content).toBeNull();
    });

    it('reveals subsequent hints once the user unlocks them', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findHints.mockResolvedValue(hints);
      repository.findHintUnlock.mockResolvedValue({ unlockedHints: 2 });
      const result = await service.getHints('user-1', 'p1');
      expect(result.hints.every((hint: { isUnlocked: boolean }) => hint.isUnlocked)).toBe(true);
    });
  });

  describe('unlockHint', () => {
    const hints = [
      { id: 'h1', problemId: 'p1', order: 1, content: 'A', createdAt: new Date() },
      { id: 'h2', problemId: 'p1', order: 2, content: 'B', createdAt: new Date() },
    ];

    it('unlocks the next sequential hint', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findHints.mockResolvedValue(hints);
      repository.findHintUnlock.mockResolvedValue({ unlockedHints: 1 });
      repository.upsertHintUnlock.mockResolvedValue({ unlockedHints: 2 });
      const result = await service.unlockHint('user-1', 'p1', 2);
      expect(result.content).toBe('B');
      expect(repository.upsertHintUnlock).toHaveBeenCalledWith('user-1', 'p1', 2);
    });

    it('rejects unlocking a hint past the next sequential one', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findHints.mockResolvedValue(hints);
      repository.findHintUnlock.mockResolvedValue({ unlockedHints: 1 });
      await expect(service.unlockHint('user-1', 'p1', 3)).rejects.toThrow(NotFoundException);
    });

    it('throws 404 for a hint that does not exist', async () => {
      repository.findProblemById.mockResolvedValue(problem('p1'));
      repository.findHints.mockResolvedValue(hints);
      await expect(service.unlockHint('user-1', 'p1', 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe('gradeSubmission', () => {
    it('marks the submission completed, records solved, and emits a verdict on accepted', async () => {
      repository.findSubmissionById.mockResolvedValue(submission('s1'));
      repository.findHiddenTestCases.mockResolvedValue([{ stdin: '1\n', expectedOutput: '2\n' }]);
      judge.grade.mockResolvedValue({
        verdict: 'accepted',
        passed: 1,
        total: 1,
        failedCaseIndex: undefined,
        failedCaseVerdict: undefined,
        results: [{ index: 0, verdict: 'accepted', timeMs: 10, memoryKb: 256 }],
      });
      repository.updateSubmission.mockResolvedValue({});
      repository.markSolved.mockResolvedValue({});

      await service.gradeSubmission('s1');

      expect(repository.updateSubmission).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ status: 'completed', verdict: 'accepted', passedTestCases: 1 }),
      );
      expect(repository.markSolved).toHaveBeenCalledWith('user-1', 'p1');
      expect(gateway.emitVerdict).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ submissionId: 's1', verdict: 'accepted' }),
      );
    });

    it('marks the submission failed and emits a failed event on grading error', async () => {
      repository.findSubmissionById.mockResolvedValue(submission('s1'));
      judge.grade.mockRejectedValue(new Error('Judge0 down'));
      repository.updateSubmission.mockResolvedValue({});

      await service.gradeSubmission('s1');

      expect(repository.updateSubmission).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ status: 'failed', errorMessage: 'Judge0 down' }),
      );
      expect(gateway.emitVerdict).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ status: 'failed' }),
      );
      expect(repository.markSolved).not.toHaveBeenCalled();
    });

    it('does nothing when the submission does not exist', async () => {
      repository.findSubmissionById.mockResolvedValue(null);
      await service.gradeSubmission('missing');
      expect(repository.updateSubmission).not.toHaveBeenCalled();
    });
  });
});
