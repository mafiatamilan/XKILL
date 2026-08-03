import { generateLearningRecommendations } from './learning-recommendations';

describe('generateLearningRecommendations', () => {
  it('maps known skills to curated resources', () => {
    const result = generateLearningRecommendations({
      missingSkills: ['SQL'],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      skill: 'SQL',
      resourceType: 'practice',
      provider: 'LeetCode',
      priority: 1,
    });
    expect(result[1].resourceType).toBe('course');
    expect(result[1].priority).toBe(2);
  });

  it('falls back to generic templates for unknown skills', () => {
    const result = generateLearningRecommendations({
      missingSkills: ['Quantum Blockchain'],
    });
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.resourceType)).toEqual(['course', 'practice', 'article']);
  });

  it('returns an empty list for no missing skills', () => {
    expect(generateLearningRecommendations({ missingSkills: [] })).toEqual([]);
  });

  it('assigns increasing priorities across multiple skills', () => {
    const result = generateLearningRecommendations({
      missingSkills: ['SQL', 'Docker'],
    });
    const priorities = result.map((item) => item.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
    expect(result[0].priority).toBe(1);
    expect(result[result.length - 1].priority).toBe(priorities.length);
  });
});
