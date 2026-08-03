import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeRepository } from './resume.repository';

describe('ResumeRepository', () => {
  let repository: ResumeRepository;
  let prisma: any;

  const tx = {
    resume: { create: jest.fn(), update: jest.fn() },
    resumeVersion: { create: jest.fn() },
  };

  beforeEach(async () => {
    prisma = {
      resumeTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      resume: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      resumeVersion: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      atsAnalysis: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [ResumeRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    repository = module.get(ResumeRepository);
  });

  it('lists only active templates ordered by slug', async () => {
    prisma.resumeTemplate.findMany.mockResolvedValue([{ slug: 'modern' }]);
    await repository.listTemplates();
    expect(prisma.resumeTemplate.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { slug: 'asc' },
    });
  });

  it('finds an owned resume scoped to its user', async () => {
    prisma.resume.findFirst.mockResolvedValue({ id: 'r1' });
    await repository.findOwnedResume('r1', 'u1');
    expect(prisma.resume.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1', userId: 'u1' } }),
    );
  });

  describe('createWithVersion', () => {
    it('creates the resume and its first version atomically', async () => {
      tx.resume.create.mockResolvedValue({ id: 'r1' });
      tx.resumeVersion.create.mockResolvedValue({ id: 'v1' });
      prisma.$transaction.mockImplementation(async (callback: (t: typeof tx) => unknown) =>
        callback(tx),
      );

      const result = await repository.createWithVersion(
        { userId: 'u1', title: 'Resume', templateId: 't1', content: {} },
        { title: 'Resume', templateId: 't1', content: {} },
      );
      expect(result).toEqual({ resume: { id: 'r1' }, versionId: 'v1' });
      expect(tx.resumeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resumeId: 'r1', version: 1 }),
        }),
      );
    });
  });

  describe('updateResumeWithVersion', () => {
    it('updates the resume and snapshots the next version', async () => {
      tx.resume.update.mockResolvedValue({ id: 'r1' });
      tx.resumeVersion.create.mockResolvedValue({ id: 'v2' });
      prisma.$transaction.mockImplementation(async (callback: (t: typeof tx) => unknown) =>
        callback(tx),
      );

      const result = await repository.updateResumeWithVersion(
        'r1',
        { title: 'New title' },
        { title: 'New title', templateId: 't1', content: {} },
        2,
      );
      expect(result.versionId).toBe('v2');
      expect(tx.resumeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resumeId: 'r1', version: 2 }),
        }),
      );
    });
  });

  describe('restoreVersion', () => {
    it('updates the resume and adds a new version without touching history', async () => {
      tx.resume.update.mockResolvedValue({ id: 'r1' });
      tx.resumeVersion.create.mockResolvedValue({ id: 'v3' });
      prisma.$transaction.mockImplementation(async (callback: (t: typeof tx) => unknown) =>
        callback(tx),
      );

      const result = await repository.restoreVersion(
        'r1',
        { title: 'Restored', templateId: 't1', content: {} },
        3,
      );
      expect(result).toEqual({ resume: { id: 'r1' }, versionId: 'v3' });
      expect(tx.resumeVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resumeId: 'r1', version: 3 }),
        }),
      );
    });
  });

  describe('upsertAtsAnalysis', () => {
    it('upserts keyed on resumeId with both update and create payloads', async () => {
      prisma.atsAnalysis.upsert.mockResolvedValue({ resumeId: 'r1', score: 80 });
      await repository.upsertAtsAnalysis({
        resumeId: 'r1',
        score: 80,
        sectionScores: {},
        missingSections: [],
        atsIssues: [],
        textDensity: 'good',
        keywordOverlap: { provided: false },
        suggestions: null,
        suggestionsStatus: 'none',
      });
      expect(prisma.atsAnalysis.upsert).toHaveBeenCalledWith({
        where: { resumeId: 'r1' },
        update: expect.objectContaining({ score: 80, suggestionsStatus: 'none' }),
        create: expect.objectContaining({ resumeId: 'r1', score: 80 }),
      });
    });
  });
});
