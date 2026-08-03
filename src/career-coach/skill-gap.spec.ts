import { computeSkillGap, resolveTargetSkills } from './skill-gap';

describe('computeSkillGap', () => {
  it('reports fully-matched skills with 100% coverage', () => {
    const result = computeSkillGap({
      currentSkills: [
        'Data Structures',
        'Algorithms',
        'System Design',
        'SQL',
        'Git',
        'REST APIs',
        'Object-Oriented Programming',
        'DBMS',
        'Computer Networks',
        'Operating Systems',
      ],
      targetRole: 'Software Engineer',
    });
    expect(result.missing).toEqual([]);
    expect(result.coverage).toBe(1);
    expect(result.present.length).toBe(result.targetCount);
  });

  it('reports the missing skills for a partially-matched profile', () => {
    const result = computeSkillGap({
      currentSkills: ['SQL', 'Caching'],
      targetRole: 'Backend Engineer',
    });
    expect(result.present).toEqual(['SQL', 'Caching']);
    expect(result.missing).toContain('System Design');
    expect(result.missing).toContain('Docker');
    expect(result.missing).toContain('Message Queues');
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThan(1);
  });

  it('is case-insensitive when matching current skills', () => {
    const result = computeSkillGap({
      currentSkills: ['data structures', 'sql', 'git'],
      targetRole: 'Software Engineer',
    });
    expect(result.present).toEqual(['Data Structures', 'SQL', 'Git']);
  });

  it('adds company skills for matched target companies', () => {
    const result = computeSkillGap({
      currentSkills: [],
      targetRole: 'Software Engineer',
      targetCompanies: ['Google'],
    });
    expect(result.missing).toContain('Go');
    expect(result.missing).toContain('Coding Contest');
  });

  it('adds industry skills for matched industries', () => {
    const result = computeSkillGap({
      currentSkills: [],
      targetRole: 'Software Engineer',
      industries: ['fintech'],
    });
    expect(result.missing).toContain('Security');
    expect(result.missing).toContain('Distributed Systems');
  });

  it('falls back to the generic SWE profile for unknown roles', () => {
    const result = computeSkillGap({
      currentSkills: [],
      targetRole: 'Mystery Role That Does Not Exist',
    });
    expect(result.targetRole).toBe('Mystery Role That Does Not Exist');
    expect(result.missing).toContain('Data Structures');
    expect(result.missing).toContain('Algorithms');
  });

  it('matches role keywords against the role list', () => {
    const result = computeSkillGap({
      currentSkills: [],
      targetRole: 'Machine Learning Engineer',
    });
    expect(result.missing).toContain('Python');
    expect(result.missing).toContain('Statistics');
  });

  it('uses the default role label when none is provided', () => {
    const result = computeSkillGap({ currentSkills: [] });
    expect(result.targetRole).toBe('software engineer');
  });

  it('handles a completely empty target list', () => {
    const result = computeSkillGap({ currentSkills: [], targetRole: '' });
    expect(result.targetCount).toBe(0);
    expect(result.coverage).toBe(0);
  });
});

describe('resolveTargetSkills', () => {
  it('merges role, company, and industry skills into a de-duplicated set', () => {
    const skills = resolveTargetSkills('Backend Engineer', ['Google'], ['fintech']);
    const unique = new Set(skills);
    expect(skills.length).toBe(unique.size);
    expect(skills).toContain('System Design');
    expect(skills).toContain('Go');
    expect(skills).toContain('Security');
  });

  it('matches slash-separated company groups (swiggy/zomato)', () => {
    const skills = resolveTargetSkills('Software Engineer', ['Swiggy'], []);
    expect(skills).toContain('Caching');
  });

  it('returns an empty set for an unknown role with no extras', () => {
    expect(resolveTargetSkills('')).toEqual([]);
  });
});
