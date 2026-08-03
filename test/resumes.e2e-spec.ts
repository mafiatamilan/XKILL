import supertest from 'supertest';
import JSZip from 'jszip';
import { createTestApp, TestApp } from './support/test-app';
import { createTestDatabase, TestDatabase } from './support/test-db';
import { TestDataFactory, TEST_PASSWORD } from './support/factories';
import { AiService } from '../src/ai/ai.service';
import { FakeResumeAiService } from './support/fake-resume-ai-service';
import { seedResumeTemplates } from '../src/seed/resume-templates.seed';

const API = '/api/v1';

const RESUME_CONTENT = {
  contact: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    location: 'London, UK',
    linkedin: 'linkedin.com/in/ada',
    github: 'github.com/ada',
  },
  summary:
    'Backend engineer with strong SQL and system design skills across many systems and many teams.',
  skills: ['SQL', 'Node.js', 'Docker', 'System Design', 'PostgreSQL'],
  experience: [
    {
      role: 'Backend Engineer',
      company: 'ACME Corp',
      location: 'London, UK',
      startDate: '2023-01',
      endDate: 'Present',
      highlights: [
        'Built a distributed queue processing millions of events per day.',
        'Led a system design initiative reducing latency by 40 percent.',
      ],
    },
  ],
  education: [{ degree: 'B.Tech in Computer Science', institution: 'IIT Delhi', gpa: '8.5' }],
  projects: [
    {
      name: 'XKILL Platform',
      description: 'A full-stack coding practice platform with SQL, Docker and PostgreSQL.',
    },
  ],
  certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', year: '2025' }],
};

describe('Resumes (e2e)', () => {
  let db: TestDatabase;
  let testApp: TestApp;
  let request: ReturnType<typeof supertest>;
  let factory: TestDataFactory;

  beforeAll(async () => {
    db = await createTestDatabase();
    await seedResumeTemplates(db.prisma);
    testApp = await createTestApp(db.url, [{ token: AiService, useClass: FakeResumeAiService }]);
    request = testApp.request;
    factory = new TestDataFactory(db.prisma);
  });

  afterAll(async () => {
    await testApp.close();
    await db.cleanup();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const login = async (role: string) => {
    const user = await factory.createUser({ role });
    const res = await request
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return { user, token: res.body.accessToken as string };
  };

  const createStudent = () => login('student');

  const listTemplates = async (token: string) => {
    const res = await request.get(`${API}/resumes/templates`).set(auth(token)).expect(200);
    return res.body.data as Array<{ id: string; slug: string; name: string }>;
  };

  const createResume = async (
    token: string,
    overrides: Record<string, unknown> = {},
  ): Promise<{ id: string; versionId: string }> => {
    const [template] = await listTemplates(token);
    const res = await request
      .post(`${API}/resumes`)
      .set(auth(token))
      .send({
        title: 'SDE Resume',
        templateId: template.id,
        content: RESUME_CONTENT,
        ...overrides,
      })
      .expect(201);
    return { id: res.body.id as string, versionId: res.body.versionId as string };
  };

  describe('authorization and templates', () => {
    it('returns 401 without a token', async () => {
      await request.get(`${API}/resumes/templates`).expect(401);
    });

    it('returns 403 for a non-student role', async () => {
      const faculty = await login('faculty');
      await request.get(`${API}/resumes/templates`).set(auth(faculty.token)).expect(403);
    });

    it('lists the three seeded templates', async () => {
      const { token } = await createStudent();
      const templates = await listTemplates(token);
      expect(templates).toHaveLength(3);
      const slugs = templates.map((template) => template.slug).sort();
      expect(slugs).toEqual(['classic', 'modern', 'technical']);
    });
  });

  describe('CRUD', () => {
    it('creates a resume and snapshots its first version', async () => {
      const { token, user } = await createStudent();
      const created = await createResume(token);
      const saved = await db.prisma.resume.findUnique({
        where: { id: created.id },
        include: { versions: { orderBy: { version: 'asc' } } },
      });
      expect(saved).toBeTruthy();
      expect(saved?.userId).toBe(user.id);
      expect(saved?.versions).toHaveLength(1);
      expect(saved?.versions[0].version).toBe(1);
      expect(saved?.versions[0].title).toBe('SDE Resume');
    });

    it('rejects an unknown template on create', async () => {
      const { token } = await createStudent();
      const res = await request
        .post(`${API}/resumes`)
        .set(auth(token))
        .send({ title: 'x', templateId: 'nope', content: {} })
        .expect(404);
      expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('lists only my resumes', async () => {
      const { token } = await createStudent();
      await createResume(token);
      const res = await request.get(`${API}/resumes`).set(auth(token)).expect(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0]).toMatchObject({ title: 'SDE Resume', versionCount: 1 });
    });

    it('gets a resume with full content', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request.get(`${API}/resumes/${created.id}`).set(auth(token)).expect(200);
      expect(res.body.content.contact.fullName).toBe('Ada Lovelace');
      expect(res.body.template.slug).toBeDefined();
      expect(res.body.versionCount).toBe(1);
    });

    it("returns 404 when getting another user's resume", async () => {
      const owner = await createStudent();
      const created = await createResume(owner.token);
      const other = await createStudent();
      await request.get(`${API}/resumes/${created.id}`).set(auth(other.token)).expect(404);
    });

    it('updates a resume and snapshots a new version without rewriting history', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .patch(`${API}/resumes/${created.id}`)
        .set(auth(token))
        .send({ title: 'Renamed Resume' })
        .expect(200);
      expect(res.body.title).toBe('Renamed Resume');
      const versions = await db.prisma.resumeVersion.findMany({
        where: { resumeId: created.id },
        orderBy: { version: 'asc' },
      });
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[0].title).toBe('SDE Resume');
      expect(versions[1].version).toBe(2);
      expect(versions[1].title).toBe('Renamed Resume');
    });

    it('deletes a resume and its history', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      await request.delete(`${API}/resumes/${created.id}`).set(auth(token)).expect(200);
      const saved = await db.prisma.resume.findUnique({ where: { id: created.id } });
      expect(saved).toBeNull();
      const versions = await db.prisma.resumeVersion.count({ where: { resumeId: created.id } });
      expect(versions).toBe(0);
    });
  });

  describe('ATS analysis', () => {
    it('computes a score and persists AI suggestions', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .post(`${API}/resumes/${created.id}/ats-analysis`)
        .set(auth(token))
        .send({})
        .expect(201);
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(100);
      expect(res.body.missingSections).toEqual([]);
      expect(res.body.suggestionsStatus).toBe('ready');
      expect(res.body.suggestions.length).toBeGreaterThan(0);
      expect(res.body.suggestions[0]).toMatchObject({
        category: expect.any(String),
        suggestion: expect.any(String),
        rationale: expect.any(String),
      });

      const saved = await db.prisma.atsAnalysis.findUnique({
        where: { resumeId: created.id },
      });
      expect(saved?.suggestionsStatus).toBe('ready');
      expect(saved?.suggestions).toHaveLength(2);
    });

    it('scores keyword overlap against an optional job description', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .post(`${API}/resumes/${created.id}/ats-analysis`)
        .set(auth(token))
        .send({ jobDescription: 'Backend engineer with SQL, Docker and system design.' })
        .expect(201);
      expect(res.body.keywordOverlap.provided).toBe(true);
      expect(res.body.keywordOverlap.matched.length).toBeGreaterThan(0);
    });

    it('persists the score with status failed and returns 503 when AI fails', async () => {
      const { token } = await createStudent();
      const created = await createResume(token, {
        content: { ...RESUME_CONTENT, summary: 'FORCE_AI_FAILURE trigger text here.' },
      });
      const res = await request
        .post(`${API}/resumes/${created.id}/ats-analysis`)
        .set(auth(token))
        .send({})
        .expect(503);
      expect(res.body.code).toBe('AI_SUGGESTIONS_FAILED');
      const saved = await db.prisma.atsAnalysis.findUnique({
        where: { resumeId: created.id },
      });
      expect(saved?.suggestionsStatus).toBe('failed');
      expect(saved?.suggestions).toBeNull();
    });

    it('returns the persisted score and suggestions without re-running AI', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      await request
        .post(`${API}/resumes/${created.id}/ats-analysis`)
        .set(auth(token))
        .send({})
        .expect(201);
      const score = await request
        .get(`${API}/resumes/${created.id}/score`)
        .set(auth(token))
        .expect(200);
      expect(score.body.score).toBeDefined();
      expect(score.body.updatedAt).toBeDefined();
      const suggestions = await request
        .get(`${API}/resumes/${created.id}/suggestions`)
        .set(auth(token))
        .expect(200);
      expect(suggestions.body.status).toBe('ready');
      expect(suggestions.body.suggestions).toHaveLength(2);
    });

    it('returns ATS_ANALYSIS_NOT_FOUND before any analysis runs', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .get(`${API}/resumes/${created.id}/score`)
        .set(auth(token))
        .expect(404);
      expect(res.body.code).toBe('ATS_ANALYSIS_NOT_FOUND');
    });
  });

  describe('export', () => {
    it('rejects a missing format', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .get(`${API}/resumes/${created.id}/export`)
        .set(auth(token))
        .expect(400);
      expect(res.body.code).toBe('EXPORT_FORMAT_REQUIRED');
    });

    it('rejects an unsupported format', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .get(`${API}/resumes/${created.id}/export?format=html`)
        .set(auth(token))
        .expect(400);
      expect(res.body.code).toBe('EXPORT_FORMAT_UNSUPPORTED');
    });

    it('exports the current content as PDF with the resume name in it', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .get(`${API}/resumes/${created.id}/export?format=pdf`)
        .set(auth(token))
        .responseType('blob')
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      const body = (res.body as Buffer).toString('latin1');
      expect(body.slice(0, 5)).toBe('%PDF-');
      expect(body).toContain('Ada Lovelace');
    });

    it('exports the current content as DOCX with the resume name inside word/document.xml', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .get(`${API}/resumes/${created.id}/export?format=docx`)
        .set(auth(token))
        .responseType('blob')
        .expect(200);
      expect(res.headers['content-type']).toContain('wordprocessingml');
      const zip = await JSZip.loadAsync(res.body as Buffer);
      const documentXml = await zip.file('word/document.xml')!.async('string');
      expect(documentXml).toContain('Ada Lovelace');
    });

    it('exports a specific historical version', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      await request
        .patch(`${API}/resumes/${created.id}`)
        .set(auth(token))
        .send({
          content: {
            contact: { fullName: 'Renamed Person', email: 'renamed@example.com' },
          },
        })
        .expect(200);
      const versions = await request
        .get(`${API}/resumes/${created.id}/versions`)
        .set(auth(token))
        .expect(200);
      const firstVersion = versions.body.data.find(
        (version: { version: number }) => version.version === 1,
      );
      const res = await request
        .get(`${API}/resumes/${created.id}/export?format=pdf&versionId=${firstVersion.id}`)
        .set(auth(token))
        .responseType('blob')
        .expect(200);
      const body = (res.body as Buffer).toString('latin1');
      expect(body).toContain('Ada Lovelace');
      expect(body).not.toContain('Renamed Person');
    });
  });

  describe('version history', () => {
    it('lists versions newest-first with pagination', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      await request
        .patch(`${API}/resumes/${created.id}`)
        .set(auth(token))
        .send({ title: 'v2' })
        .expect(200);
      const res = await request
        .get(`${API}/resumes/${created.id}/versions`)
        .set(auth(token))
        .expect(200);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].version).toBe(2);
      expect(res.body.data[1].version).toBe(1);
    });

    it('restores a version by creating a NEW version, preserving history', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      await request
        .patch(`${API}/resumes/${created.id}`)
        .set(auth(token))
        .send({ title: 'v2 title' })
        .expect(200);
      const versions = await request
        .get(`${API}/resumes/${created.id}/versions`)
        .set(auth(token))
        .expect(200);
      const firstVersion = versions.body.data.find(
        (version: { version: number }) => version.version === 1,
      );
      const res = await request
        .post(`${API}/resumes/${created.id}/versions/${firstVersion.id}/restore`)
        .set(auth(token))
        .expect(201);
      expect(res.body.title).toBe('SDE Resume');

      const history = await db.prisma.resumeVersion.findMany({
        where: { resumeId: created.id },
        orderBy: { version: 'asc' },
      });
      expect(history).toHaveLength(3);
      expect(history.map((version) => version.version)).toEqual([1, 2, 3]);
      expect(history[2].title).toBe('SDE Resume');
    });

    it('returns VERSION_NOT_FOUND when restoring an unknown version', async () => {
      const { token } = await createStudent();
      const created = await createResume(token);
      const res = await request
        .post(`${API}/resumes/${created.id}/versions/nope/restore`)
        .set(auth(token))
        .expect(404);
      expect(res.body.code).toBe('VERSION_NOT_FOUND');
    });
  });
});
