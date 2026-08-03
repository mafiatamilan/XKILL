import { Test } from '@nestjs/testing';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';

describe('ResumeController', () => {
  let controller: ResumeController;
  let service: Record<string, jest.Mock>;

  const user = { id: 'u1', email: 'u1@x.com', role: 'student', roleId: 'r1', permissions: [] };
  const res = () => ({ setHeader: jest.fn(), send: jest.fn() });

  beforeEach(async () => {
    service = {
      listTemplates: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      createResume: jest.fn().mockResolvedValue({ id: 'r1' }),
      listResumes: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getResume: jest.fn().mockResolvedValue({ id: 'r1' }),
      updateResume: jest.fn().mockResolvedValue({ id: 'r1', versionId: 'v2' }),
      deleteResume: jest.fn().mockResolvedValue({ id: 'r1', deleted: true }),
      runAtsAnalysis: jest.fn().mockResolvedValue({ score: 80 }),
      getScore: jest.fn().mockResolvedValue({ score: 80 }),
      getSuggestions: jest.fn().mockResolvedValue({ suggestions: [] }),
      exportResume: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.4'),
        contentType: 'application/pdf',
        extension: 'pdf',
      }),
      listVersions: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      restoreVersion: jest.fn().mockResolvedValue({ id: 'r1', versionId: 'v3' }),
    };
    const module = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [{ provide: ResumeService, useValue: service }],
    }).compile();
    controller = module.get(ResumeController);
  });

  it('lists templates', async () => {
    await controller.listTemplates();
    expect(service.listTemplates).toHaveBeenCalled();
  });

  it('creates a resume for the current user', async () => {
    await controller.create(user as never, { title: 'New', templateId: 't1', content: {} });
    expect(service.createResume).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ title: 'New' }),
      'u1@x.com',
    );
  });

  it('lists resumes with pagination', async () => {
    await controller.list(user as never, { page: 1, limit: 20 } as never);
    expect(service.listResumes).toHaveBeenCalledWith('u1', 1, 20);
  });

  it('gets one resume', async () => {
    await controller.get(user as never, 'r1');
    expect(service.getResume).toHaveBeenCalledWith('u1', 'r1');
  });

  it('updates a resume', async () => {
    await controller.update(user as never, 'r1', { title: 'x' });
    expect(service.updateResume).toHaveBeenCalledWith(
      'u1',
      'r1',
      expect.objectContaining({ title: 'x' }),
      'u1@x.com',
    );
  });

  it('deletes a resume', async () => {
    await controller.delete(user as never, 'r1');
    expect(service.deleteResume).toHaveBeenCalledWith('u1', 'r1', 'u1@x.com');
  });

  it('runs ATS analysis with the optional job description', async () => {
    await controller.runAtsAnalysis(user as never, 'r1', { jobDescription: 'SQL' });
    expect(service.runAtsAnalysis).toHaveBeenCalledWith(
      'u1',
      'r1',
      expect.objectContaining({ jobDescription: 'SQL' }),
      'u1@x.com',
    );
  });

  it('gets the persisted score', async () => {
    await controller.getScore(user as never, 'r1');
    expect(service.getScore).toHaveBeenCalledWith('u1', 'r1');
  });

  it('gets the persisted suggestions', async () => {
    await controller.getSuggestions(user as never, 'r1');
    expect(service.getSuggestions).toHaveBeenCalledWith('u1', 'r1');
  });

  it('exports a resume and sets the download headers', async () => {
    const response = res();
    await controller.export(user as never, 'r1', { format: 'pdf' } as never, response as never);
    expect(service.exportResume).toHaveBeenCalledWith('u1', 'r1', 'pdf', undefined);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.send).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('lists version history', async () => {
    await controller.listVersions(user as never, 'r1', { page: 1, limit: 20 } as never);
    expect(service.listVersions).toHaveBeenCalledWith('u1', 'r1', 1, 20);
  });

  it('restores a version', async () => {
    await controller.restore(user as never, 'r1', 'v2');
    expect(service.restoreVersion).toHaveBeenCalledWith('u1', 'r1', 'v2', 'u1@x.com');
  });
});
