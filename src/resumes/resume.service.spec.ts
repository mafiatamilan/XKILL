import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AiService, AiServiceError } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { ResumeService } from './resume.service';
import { ResumeRepository } from './resume.repository';

describe('ResumeService', () => {
  const asAny = (value: unknown): any => value;

  let service: ResumeService;
  let repository: Record<string, jest.Mock>;
  let ai: { generateStructured: jest.Mock };
  let audit: { record: jest.Mock };

  const resume = () =>
    asAny({
      id: 'r1',
      title: 'My resume',
      templateId: 't1',
      content: {
        contact: { fullName: 'Ada Lovelace', email: 'ada@example.com' },
        summary: 'Backend engineer with strong SQL and system design skills across many systems.',
        skills: ['SQL', 'Node.js'],
        experience: [{ role: 'Backend Engineer', company: 'ACME', highlights: ['Built a queue'] }],
        education: [{ degree: 'B.Tech', institution: 'IIT' }],
        certifications: [{ name: 'AWS SAA', issuer: 'Amazon' }],
      },
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
      template: { id: 't1', slug: 'modern', name: 'Modern', style: {} },
      _count: { versions: 1, analyses: 0 },
    });

  const version = (overrides: Record<string, unknown> = {}) =>
    asAny({
      id: 'v2',
      resumeId: 'r1',
      version: 2,
      title: 'Old title',
      templateId: 't1',
      content: {},
      createdAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    });

  beforeEach(async () => {
    repository = {
      listTemplates: jest.fn().mockResolvedValue([{ id: 't1', slug: 'modern', name: 'Modern' }]),
      findTemplateById: jest.fn().mockResolvedValue({ id: 't1', slug: 'modern' }),
      findOwnedResume: jest.fn().mockResolvedValue(resume()),
      createWithVersion: jest.fn().mockImplementation((_data, snapshot) => ({
        resume: resume(),
        versionId: `version-of-${snapshot.title}`,
      })),
      listResumes: jest.fn().mockResolvedValue([]),
      countResumes: jest.fn().mockResolvedValue(0),
      updateResumeWithVersion: jest
        .fn()
        .mockImplementation((id, data) => ({ resume: { ...resume(), ...data }, versionId: 'v2' })),
      deleteResume: jest.fn().mockResolvedValue({ id: 'r1' }),
      findVersionById: jest.fn().mockResolvedValue(version()),
      countVersions: jest.fn().mockResolvedValue(1),
      listVersions: jest.fn().mockResolvedValue([version()]),
      restoreVersion: jest.fn().mockImplementation((_id, snapshot) => ({
        resume: { ...resume(), title: snapshot.title },
        versionId: 'v3',
      })),
      findAtsAnalysis: jest.fn().mockResolvedValue(null),
      upsertAtsAnalysis: jest.fn().mockImplementation((data) => ({
        ...data,
        updatedAt: new Date('2026-08-01T00:00:00Z'),
      })),
    };
    ai = { generateStructured: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        ResumeService,
        { provide: ResumeRepository, useValue: repository },
        { provide: AiService, useValue: ai },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ResumeService);
  });

  describe('templates and CRUD', () => {
    it('lists templates with metadata', async () => {
      const result = await service.listTemplates();
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('creates a resume only for an existing template', async () => {
      const result = await service.createResume('u1', {
        title: 'New',
        templateId: 't1',
        content: resume().content,
      });
      expect(result.id).toBe('r1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resume.created' }),
      );
    });

    it('rejects an unknown template on create', async () => {
      repository.findTemplateById.mockResolvedValue(null);
      await expect(
        service.createResume('u1', {
          title: 'New',
          templateId: 'missing',
          content: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates a resume and snapshots a new version', async () => {
      const result = await service.updateResume('u1', 'r1', { title: 'Renamed' });
      expect(result.versionId).toBe('v2');
      expect(repository.updateResumeWithVersion).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resume.updated' }),
      );
    });

    it('rejects an update for a resume the user does not own', async () => {
      repository.findOwnedResume.mockResolvedValue(null);
      await expect(service.updateResume('u1', 'r1', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes a resume', async () => {
      const result = await service.deleteResume('u1', 'r1');
      expect(result.deleted).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resume.deleted' }),
      );
    });

    it('returns a 404 on delete for a missing resume', async () => {
      repository.findOwnedResume.mockResolvedValue(null);
      await expect(service.deleteResume('u1', 'r1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ATS analysis', () => {
    it('runs the deterministic scorer and AI suggestions, then persists the analysis', async () => {
      ai.generateStructured.mockResolvedValue({
        suggestions: [
          { category: 'content', suggestion: 'Add experience', rationale: 'ATS needs it' },
        ],
      });
      const result = await service.runAtsAnalysis('u1', 'r1', {});
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestionsStatus).toBe('ready');
      expect(repository.upsertAtsAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ resumeId: 'r1', suggestionsStatus: 'ready' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resume.ats.analysis' }),
      );
    });

    it('passes an optional job description through to the scorer', async () => {
      ai.generateStructured.mockResolvedValue({ suggestions: [] });
      await service.runAtsAnalysis('u1', 'r1', {
        jobDescription: 'Backend engineer with SQL and Docker',
      });
      const upsert = repository.upsertAtsAnalysis.mock.calls[0][0];
      expect(upsert.keywordOverlap.provided).toBe(true);
    });

    it('persists the deterministic score with status failed, then throws 503 when AI fails', async () => {
      ai.generateStructured.mockRejectedValue(new AiServiceError('boom'));
      await expect(service.runAtsAnalysis('u1', 'r1', {})).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(repository.upsertAtsAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({ suggestionsStatus: 'failed', suggestions: null }),
      );
    });

    it('normalizes a raw AI failure into a 502 AI_GENERATION_FAILED for the suggestions call path', async () => {
      ai.generateStructured.mockRejectedValue(new AiServiceError('upstream down'));
      await expect(service.runAtsAnalysis('u1', 'r1', {})).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('score and suggestions reads', () => {
    it('re-reads the persisted score without calling the AI', async () => {
      repository.findAtsAnalysis.mockResolvedValue(
        asAny({
          score: 82,
          sectionScores: {},
          missingSections: [],
          atsIssues: [],
          textDensity: 'good',
          keywordOverlap: { provided: false },
          updatedAt: new Date('2026-08-01T00:00:00Z'),
        }),
      );
      const result = await service.getScore('u1', 'r1');
      expect(result.score).toBe(82);
      expect(ai.generateStructured).not.toHaveBeenCalled();
    });

    it('throws ATS_ANALYSIS_NOT_FOUND before an analysis exists', async () => {
      await expect(service.getScore('u1', 'r1')).rejects.toThrow(NotFoundException);
      await expect(service.getSuggestions('u1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('returns persisted suggestions', async () => {
      repository.findAtsAnalysis.mockResolvedValue(
        asAny({
          suggestions: [{ category: 'formatting', suggestion: 'x', rationale: 'y' }],
          suggestionsStatus: 'ready',
          updatedAt: new Date('2026-08-01T00:00:00Z'),
        }),
      );
      const result = await service.getSuggestions('u1', 'r1');
      expect(result.status).toBe('ready');
      expect(result.suggestions).toHaveLength(1);
    });
  });

  describe('export', () => {
    it('requires a format', async () => {
      await expect(service.exportResume('u1', 'r1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unsupported formats', async () => {
      await expect(service.exportResume('u1', 'r1', 'html')).rejects.toThrow(BadRequestException);
    });

    it('renders a PDF buffer for the current content', async () => {
      const result = await service.exportResume('u1', 'r1', 'pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.extension).toBe('pdf');
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('renders a DOCX buffer for the current content', async () => {
      const result = await service.exportResume('u1', 'r1', 'docx');
      expect(result.contentType).toContain('wordprocessingml');
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('exports a specific historical version when versionId is supplied', async () => {
      repository.findVersionById.mockResolvedValue(
        version({ title: 'Vintage', content: { contact: { fullName: 'Old Name' } } }),
      );
      const result = await service.exportResume('u1', 'r1', 'pdf', 'v2');
      expect(result.buffer.toString('latin1')).toContain('Old Name');
      expect(result.buffer.toString('latin1')).not.toContain('Ada Lovelace');
    });

    it('throws VERSION_NOT_FOUND for an unknown version', async () => {
      repository.findVersionById.mockResolvedValue(null);
      await expect(service.exportResume('u1', 'r1', 'pdf', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('versioning', () => {
    it('lists versions with pagination metadata', async () => {
      const result = await service.listVersions('u1', 'r1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].version).toBe(2);
      expect(result.meta.total).toBe(1);
    });

    it('restores a version by creating a NEW version, leaving history intact', async () => {
      repository.findVersionById.mockResolvedValue(
        version({ title: 'Vintage', content: { contact: { fullName: 'Old Name' } } }),
      );
      repository.countVersions.mockResolvedValue(2);
      repository.restoreVersion.mockResolvedValue({ resume: resume(), versionId: 'v3' });

      const result = await service.restoreVersion('u1', 'r1', 'v2');
      expect(result.versionId).toBe('v3');
      expect(repository.restoreVersion).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ title: 'Vintage' }),
        3,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resume.version.restored' }),
      );
    });

    it('throws VERSION_NOT_FOUND when restoring an unknown version', async () => {
      repository.findVersionById.mockResolvedValue(null);
      await expect(service.restoreVersion('u1', 'r1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });
});
