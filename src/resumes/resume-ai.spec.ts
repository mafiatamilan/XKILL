import { atsSuggestionsResponseSchema, buildAtsSuggestionsPrompt } from './resume-ai';
import { computeAtsScore } from './ats-scorer';
import type { ResumeContent } from './ats-scorer';

const content: ResumeContent = {
  contact: { fullName: 'Ada', email: 'ada@example.com' },
  summary: 'Backend engineer.',
  skills: ['SQL', 'Node.js'],
};

describe('buildAtsSuggestionsPrompt', () => {
  it('embeds the deterministic score, missing sections, and issues', () => {
    const result = computeAtsScore(content);
    const { system, prompt } = buildAtsSuggestionsPrompt({ content, score: result });
    expect(system).toContain('ATS resume reviewer');
    expect(prompt).toContain('TASK: ats_suggestions');
    expect(prompt).toContain(`Deterministic ATS score: ${result.score}/100`);
    expect(prompt).toContain('Missing sections: Experience, Education');
  });

  it('includes keyword overlap when a job description is supplied', () => {
    const result = computeAtsScore(content, 'Backend engineer with SQL');
    const { prompt } = buildAtsSuggestionsPrompt({
      content,
      score: result,
      jobDescription: 'Backend engineer with SQL',
    });
    expect(prompt).toContain('Keyword overlap:');
    expect(prompt).toContain('Missing keywords:');
  });

  it('does not mention keywords when no job description is given', () => {
    const result = computeAtsScore(content);
    const { prompt } = buildAtsSuggestionsPrompt({ content, score: result });
    expect(prompt).not.toContain('Keyword overlap:');
  });
});

describe('atsSuggestionsResponseSchema', () => {
  it('accepts a valid suggestions response', () => {
    const parsed = atsSuggestionsResponseSchema.safeParse({
      suggestions: [
        { category: 'content', suggestion: 'Add experience', rationale: 'ATS needs it' },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty suggestions array', () => {
    const parsed = atsSuggestionsResponseSchema.safeParse({ suggestions: [] });
    expect(parsed.success).toBe(false);
  });
});
