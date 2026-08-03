/**
 * Pure, deterministic skill-gap computation. Given a candidate's real skills
 * (from their 5.2 SkillProfile) and a target derived from their CareerGoal
 * (target role / companies / industries), it returns the set difference.
 * This is intentionally NOT an AI call — it is unit-testable with fixed pairs.
 */

export interface SkillGapInput {
  currentSkills: string[];
  targetRole?: string | null;
  targetCompanies?: string[];
  industries?: string[];
}

export interface SkillGapResult {
  targetRole: string;
  missing: string[];
  present: string[];
  targetCount: number;
  coverage: number;
}

const ROLE_SKILLS: Array<{ keywords: string[]; skills: string[] }> = [
  {
    keywords: ['backend', 'back-end', 'server', 'api'],
    skills: [
      'System Design',
      'SQL',
      'REST APIs',
      'Caching',
      'Message Queues',
      'Docker',
      'Databases',
      'Concurrency',
    ],
  },
  {
    keywords: ['frontend', 'front-end', 'web', 'ui'],
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'HTML',
      'CSS',
      'Web Performance',
      'Accessibility',
      'State Management',
    ],
  },
  {
    keywords: ['fullstack', 'full-stack', 'mevn', 'mern'],
    skills: [
      'System Design',
      'SQL',
      'REST APIs',
      'React',
      'Node.js',
      'TypeScript',
      'Docker',
      'Databases',
    ],
  },
  {
    keywords: ['machine learning', 'ml', 'ai', 'data science'],
    skills: [
      'Python',
      'Machine Learning',
      'Statistics',
      'SQL',
      'Deep Learning',
      'Data Wrangling',
      'Probability',
    ],
  },
  {
    keywords: ['data', 'analytics', 'analyst'],
    skills: ['SQL', 'Python', 'Statistics', 'Data Visualization', 'Excel', 'ETL', 'A/B Testing'],
  },
  {
    keywords: ['devops', 'sre', 'cloud', 'platform'],
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Terraform',
      'Cloud (AWS/GCP)',
      'Monitoring',
      'Networking',
    ],
  },
  {
    keywords: ['software', 'swe', 'developer', 'engineer', 'product'],
    skills: [
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
  },
];

const COMPANY_SKILLS: Record<string, string[]> = {
  google: ['System Design', 'Algorithms', 'Coding Contest', 'Go'],
  amazon: ['System Design', 'Leadership Principles', 'Coding Contest'],
  microsoft: ['System Design', 'Coding Contest', 'SQL'],
  meta: ['System Design', 'Coding Contest'],
  flipkart: ['System Design', 'SQL', 'Coding Contest'],
  'swiggy/zomato': ['System Design', 'Caching'],
  paypal: ['System Design', 'SQL', 'Security'],
};

const INDUSTRY_SKILLS: Record<string, string[]> = {
  fintech: ['SQL', 'Security', 'Distributed Systems'],
  banking: ['SQL', 'Security'],
  ecommerce: ['System Design', 'Caching', 'REST APIs'],
  healthcare: ['REST APIs', 'Security', 'SQL'],
  'machine learning': ['Python', 'Machine Learning', 'Statistics'],
  gaming: ['Networking', 'C++', 'Performance Engineering'],
  'cyber security': ['Security', 'Networking', 'Linux'],
};

function roleKeywordSkills(targetRole?: string | null): string[] {
  if (!targetRole) {
    return [];
  }
  const text = targetRole.toLowerCase();
  for (const entry of ROLE_SKILLS) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) {
      return entry.skills;
    }
  }
  return ROLE_SKILLS[ROLE_SKILLS.length - 1].skills;
}

export function resolveTargetSkills(
  targetRole?: string | null,
  targetCompanies: string[] = [],
  industries: string[] = [],
): string[] {
  const skills = new Set<string>(roleKeywordSkills(targetRole));
  for (const company of targetCompanies) {
    const key = company.toLowerCase();
    const direct = COMPANY_SKILLS[key];
    if (direct) {
      direct.forEach((skill) => skills.add(skill));
      continue;
    }
    // Match against slash-separated keys like 'swiggy/zomato'.
    for (const [groupKey, groupSkills] of Object.entries(COMPANY_SKILLS)) {
      if (groupKey.split('/').some((part) => key.includes(part))) {
        groupSkills.forEach((skill) => skills.add(skill));
        break;
      }
    }
  }
  for (const industry of industries) {
    const key = industry.toLowerCase();
    const skillsForIndustry = INDUSTRY_SKILLS[key];
    if (skillsForIndustry) {
      skillsForIndustry.forEach((skill) => skills.add(skill));
    }
  }
  return [...skills];
}

export function computeSkillGap(input: SkillGapInput): SkillGapResult {
  const targetSkills = resolveTargetSkills(
    input.targetRole,
    input.targetCompanies ?? [],
    input.industries ?? [],
  );
  const current = new Set(input.currentSkills.map((skill) => skill.toLowerCase()));
  const present = targetSkills.filter((skill) => current.has(skill.toLowerCase()));
  const missing = targetSkills.filter((skill) => !current.has(skill.toLowerCase()));
  return {
    targetRole: input.targetRole ?? 'software engineer',
    present,
    missing,
    targetCount: targetSkills.length,
    coverage: targetSkills.length === 0 ? 0 : present.length / targetSkills.length,
  };
}
