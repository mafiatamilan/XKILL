/**
 * Pure, deterministic learning recommendations derived from the skill gaps
 * found by the skill-gap module. Each missing skill maps to a small set of
 * concrete resources (courses, practice, articles) — no AI call.
 */

export interface LearningRecommendationInput {
  missingSkills: string[];
}

export interface LearningRecommendation {
  skill: string;
  title: string;
  resourceType: string;
  provider: string;
  url?: string;
  priority: number;
  reason: string;
}

interface ResourceTemplate {
  resourceType: string;
  provider: string;
  url?: string;
}

const RECOMMENDATIONS_BY_SKILL: Record<string, ResourceTemplate[]> = {
  'data structures': [
    {
      resourceType: 'course',
      provider: 'Coursera',
      url: 'https://www.coursera.org/learn/data-structures',
    },
    { resourceType: 'practice', provider: 'LeetCode', url: 'https://leetcode.com/problemset/' },
  ],
  algorithms: [
    {
      resourceType: 'book',
      provider: 'CLRS',
      url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
    },
    { resourceType: 'practice', provider: 'LeetCode', url: 'https://leetcode.com/explore/' },
  ],
  sql: [
    {
      resourceType: 'practice',
      provider: 'LeetCode',
      url: 'https://leetcode.com/problemset/database/',
    },
    {
      resourceType: 'course',
      provider: 'Khan Academy',
      url: 'https://www.khanacademy.org/computing/computer-programming/sql',
    },
  ],
  python: [
    {
      resourceType: 'course',
      provider: 'Coursera',
      url: 'https://www.coursera.org/specializations/python',
    },
    {
      resourceType: 'practice',
      provider: 'HackerRank',
      url: 'https://www.hackerrank.com/domains/python',
    },
  ],
  'system design': [
    {
      resourceType: 'course',
      provider: 'Grokking',
      url: 'https://www.educative.io/courses/grokking-the-system-design-interview',
    },
    {
      resourceType: 'article',
      provider: 'System Design Primer',
      url: 'https://github.com/donnemartin/system-design-primer',
    },
  ],
  'rest apis': [
    {
      resourceType: 'course',
      provider: 'Coursera',
      url: 'https://www.coursera.org/specializations/rest-api',
    },
    {
      resourceType: 'article',
      provider: 'MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
    },
  ],
  react: [
    {
      resourceType: 'course',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
    },
    { resourceType: 'article', provider: 'React Docs', url: 'https://react.dev/learn' },
  ],
  'machine learning': [
    {
      resourceType: 'course',
      provider: 'Coursera',
      url: 'https://www.coursera.org/learn/machine-learning',
    },
    { resourceType: 'practice', provider: 'Kaggle', url: 'https://www.kaggle.com/competitions' },
  ],
  docker: [
    {
      resourceType: 'course',
      provider: 'Docker Docs',
      url: 'https://docs.docker.com/get-started/',
    },
    { resourceType: 'practice', provider: 'KodeKloud', url: 'https://kodekloud.com/' },
  ],
  javascript: [
    {
      resourceType: 'course',
      provider: 'Eloquent JavaScript',
      url: 'https://eloquentjavascript.net/',
    },
    {
      resourceType: 'practice',
      provider: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    },
  ],
};

const GENERIC_TEMPLATES: ResourceTemplate[] = [
  { resourceType: 'course', provider: 'Coursera' },
  { resourceType: 'practice', provider: 'LeetCode' },
  { resourceType: 'article', provider: 'Medium' },
];

export function generateLearningRecommendations(
  input: LearningRecommendationInput,
): LearningRecommendation[] {
  const result: LearningRecommendation[] = [];
  input.missingSkills.forEach((skill, index) => {
    const templates = RECOMMENDATIONS_BY_SKILL[skill.toLowerCase()] ?? GENERIC_TEMPLATES;
    templates.forEach((template, templateIndex) => {
      result.push({
        skill,
        title: `${skill} — ${template.resourceType} resource`,
        resourceType: template.resourceType,
        provider: template.provider,
        url: template.url,
        priority: index * templates.length + templateIndex + 1,
        reason: `Closes the skill gap for '${skill}' on your target role.`,
      });
    });
  });
  return result;
}
