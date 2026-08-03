import { buildResumeViewModel, EMPTY_NAME } from './resume-view-model';
import { normalizeTemplateStyle } from './template-style';
import type { ResumeContent } from './ats-scorer';

const content: ResumeContent = {
  contact: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '123-456-7890',
    location: 'London',
  },
  summary: 'Engineer.',
  skills: ['SQL', 'Node.js'],
  experience: [
    {
      role: 'Backend Engineer',
      company: 'ACME',
      highlights: ['Built a queue'],
    },
  ],
  projects: [{ name: 'Analytical Engine', description: 'A mechanical computer' }],
  education: [{ degree: 'B.Tech', institution: 'IIT', gpa: '8.5' }],
  certifications: [{ name: 'AWS SAA', issuer: 'Amazon' }],
};

const template = normalizeTemplateStyle(undefined);

describe('buildResumeViewModel', () => {
  it('builds a flat view model with ordered sections', () => {
    const view = buildResumeViewModel(content, template);
    expect(view.fullName).toBe('Ada Lovelace');
    expect(view.tagline).toContain('ada@example.com');
    expect(view.contact).toEqual(['ada@example.com', '123-456-7890', 'London']);
    expect(view.sections.map((section) => section.title)).toEqual([
      'Skills',
      'Experience',
      'Projects',
      'Education',
      'Certifications',
    ]);
  });

  it('falls back to a placeholder name when missing', () => {
    const view = buildResumeViewModel({ skills: ['SQL'] }, template);
    expect(view.fullName).toBe(EMPTY_NAME);
  });

  it('flattens experience entries into bullet lines', () => {
    const view = buildResumeViewModel(content, template);
    const experience = view.sections.find((section) => section.title === 'Experience')!;
    expect(experience.lines[0]).toContain('Backend Engineer');
    expect(experience.lines[0]).toContain('• Built a queue');
  });

  it('omits empty sections entirely', () => {
    const view = buildResumeViewModel({ contact: { email: 'a@b.com' } }, template);
    expect(view.sections).toHaveLength(0);
  });
});
