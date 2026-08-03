import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { CareerCoachRepository } from './career-coach.repository';
import { CareerCoachService } from './career-coach.service';

describe('CareerCoachService', () => {
  const asAny = (value: unknown): any => value;

  let service: CareerCoachService;
  let repository: Record<string, jest.Mock>;
  let ai: { generateStructured: jest.Mock };
  let audit: { record: jest.Mock };

  const goal = () =>
    asAny({
      id: 'g1',
      targetRole: 'Backend Engineer',
      targetCompanies: ['Google'],
      industries: ['fintech'],
      targetCtcLakhs: 30,
      targetDate: new Date('2027-08-02T00:00:00Z'),
    });

  const skills = () => [
    asAny({
      name: 'Java',
      category: 'language',
      proficiencyLevel: 'advanced',
      yearsOfExperience: 2,
      isPrimary: true,
    }),
  ];

  beforeEach(async () => {
    repository = {
      findActiveCareerGoal: jest.fn().mockResolvedValue(null),
      findSkillProfile: jest.fn().mockResolvedValue([]),
      replaceRoadmap: jest.fn().mockResolvedValue(undefined),
      replaceRecommendations: jest.fn().mockResolvedValue(undefined),
      upsertSalaryPrediction: jest
        .fn()
        .mockImplementation((data) => ({ id: 'sp1', ...data, generatedAt: new Date() })),
      upsertSkillGap: jest
        .fn()
        .mockImplementation((data) => ({ id: 'sg1', ...data, assessedAt: new Date() })),
      listChatMessages: jest.fn().mockResolvedValue([]),
      countChatMessages: jest.fn().mockResolvedValue(0),
      createChatMessage: jest.fn().mockImplementation((_uid, role, content) => ({
        id: `m-${role}`,
        userId: 'u1',
        role,
        content,
        createdAt: new Date(),
      })),
    };
    ai = { generateStructured: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        CareerCoachService,
        { provide: CareerCoachRepository, useValue: repository },
        { provide: AiService, useValue: ai },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(CareerCoachService);
  });

  describe('getRoadmap', () => {
    it('throws CAREER_GOAL_REQUIRED when there is no active goal', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(null);
      await expect(service.getRoadmap('u1')).rejects.toThrow(NotFoundException);
    });

    it('generates and persists a roadmap anchored on the active goal', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.findSkillProfile.mockResolvedValue(skills());
      const result = await service.getRoadmap('u1');
      expect(result.phases).toHaveLength(5);
      expect(result.phases[0]).toMatchObject({ phase: 1, title: expect.any(String) });
      expect(repository.replaceRoadmap).toHaveBeenCalledWith('u1', 'g1', result.phases);
    });

    it('passes the student skills into the roadmap generator', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.findSkillProfile.mockResolvedValue(skills());
      await service.getRoadmap('u1');
      expect(repository.findSkillProfile).toHaveBeenCalledWith('u1');
    });
  });

  describe('getRecommendations', () => {
    it('requires an active goal', async () => {
      await expect(service.getRecommendations('u1')).rejects.toThrow(NotFoundException);
    });

    it('returns the skill gap plus learning recommendations and persists them', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.findSkillProfile.mockResolvedValue([]);
      const result = await service.getRecommendations('u1');
      expect(result.gap.missing.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(repository.replaceRecommendations).toHaveBeenCalledWith('u1', result.recommendations);
    });
  });

  describe('getSalaryPrediction', () => {
    it('requires an active goal', async () => {
      await expect(service.getSalaryPrediction('u1')).rejects.toThrow(NotFoundException);
    });

    it('calls the AI, upserts the prediction, and returns it as an estimate', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.findSkillProfile.mockResolvedValue(skills());
      ai.generateStructured.mockResolvedValue({
        baseCtcLakhs: 24,
        totalCtcLakhs: 28,
        rangeLowLakhs: 20,
        rangeHighLakhs: 32,
        confidence: 70,
        factors: ['target company Google', '3 yr experience'],
      });
      const result = await service.getSalaryPrediction('u1');
      expect(result.isEstimate).toBe(true);
      expect(result.totalCtcLakhs).toBe(28);
      expect(repository.upsertSalaryPrediction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          isEstimate: true,
          targetCompany: 'Google',
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'career-coach.salary.predicted' }),
      );
    });

    it('normalizes an AI failure into a 502 AI_GENERATION_FAILED and persists nothing', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom'));
      await expect(service.getSalaryPrediction('u1')).rejects.toThrow(BadGatewayException);
      expect(repository.upsertSalaryPrediction).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('getSkillGap', () => {
    it('requires an active goal', async () => {
      await expect(service.getSkillGap('u1')).rejects.toThrow(NotFoundException);
    });

    it('computes the deterministic gap and persists it', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.findSkillProfile.mockResolvedValue(skills());
      const result = await service.getSkillGap('u1');
      expect(result.targetRole).toBe('Backend Engineer');
      expect(repository.upsertSkillGap).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1' }),
      );
      expect(result.coverage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sendChatMessage', () => {
    it('rejects an empty message', async () => {
      await expect(service.sendChatMessage('u1', '   ')).rejects.toThrow(BadRequestException);
      expect(ai.generateStructured).not.toHaveBeenCalled();
    });

    it('calls the AI and persists both the user message and the assistant reply', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      ai.generateStructured.mockResolvedValue({ reply: 'Focus on System Design and SQL.' });
      const result = await service.sendChatMessage('u1', 'What should I learn?', 'u1@x.com');
      expect(result.reply).toBe('Focus on System Design and SQL.');
      expect(repository.createChatMessage).toHaveBeenCalledWith(
        'u1',
        'user',
        'What should I learn?',
      );
      expect(repository.createChatMessage).toHaveBeenCalledWith(
        'u1',
        'assistant',
        'Focus on System Design and SQL.',
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'career-coach.chat.sent' }),
      );
    });

    it('works without an active career goal', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(null);
      ai.generateStructured.mockResolvedValue({ reply: 'Generic advice.' });
      const result = await service.sendChatMessage('u1', 'hi');
      expect(result.reply).toBe('Generic advice.');
    });

    it('persists nothing when the AI call fails', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom'));
      await expect(service.sendChatMessage('u1', 'hello')).rejects.toThrow(BadGatewayException);
      expect(repository.createChatMessage).not.toHaveBeenCalled();
    });

    it('feeds the recent history into the prompt', async () => {
      repository.findActiveCareerGoal.mockResolvedValue(goal());
      repository.listChatMessages.mockResolvedValue([
        asAny({ role: 'user', content: 'hi', createdAt: new Date() }),
        asAny({ role: 'assistant', content: 'hello', createdAt: new Date() }),
      ]);
      ai.generateStructured.mockResolvedValue({ reply: 'ok' });
      await service.sendChatMessage('u1', 'tell me more');
      expect(repository.listChatMessages).toHaveBeenCalledWith('u1', 1, 20);
      const promptArg = ai.generateStructured.mock.calls[0][0].prompt;
      expect(promptArg).toContain('user: hi');
      expect(promptArg).toContain('assistant: hello');
    });
  });

  describe('listChat', () => {
    it('returns paginated chat history with metadata', async () => {
      repository.listChatMessages.mockResolvedValue([
        asAny({
          id: 'm1',
          role: 'user',
          content: 'hi',
          createdAt: new Date('2026-08-01T00:00:00Z'),
        }),
      ]);
      repository.countChatMessages.mockResolvedValue(1);
      const result = await service.listChat('u1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('user');
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });
  });
});
