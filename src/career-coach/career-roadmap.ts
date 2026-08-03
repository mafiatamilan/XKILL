import { resolveTargetSkills } from './skill-gap';

/**
 * Pure, deterministic long-horizon career roadmap. Distinct from the 5.4
 * tactical placement roadmap (10-week weekly executor): this is the months-to-
 * years trajectory anchored on a student's CareerGoal (target role/date/CTC).
 * Unit-testable with fixed inputs — no AI involved.
 */

export interface CareerRoadmapInput {
  targetRole?: string | null;
  targetDate?: Date | null;
  targetCtcLakhs?: number | null;
  targetCompanies?: string[];
  industries?: string[];
  currentSkills: string[];
  now?: Date;
}

export interface CareerRoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  summary: string;
  focus: string[];
  milestones: string[];
}

export interface CareerRoadmap {
  totalMonths: number;
  phases: CareerRoadmapPhase[];
}

const PHASE_BLUEPRINTS: Array<{
  title: string;
  summary: string;
  focusRatio: number;
  milestones: (roleSkills: string[]) => string[];
}> = [
  {
    title: 'Foundations & fundamentals',
    summary: 'Build the base: core CS concepts, tools, and the primary skill stack.',
    focusRatio: 0.15,
    milestones: (roleSkills) => [
      'Complete a structured refresher of core Computer Science fundamentals (DBMS, Computer Networks, Operating Systems).',
      `Gain working proficiency in the core stack for your target: ${firstSkills(roleSkills, 3)}.`,
      'Set up version control (Git) workflow and a basic project skeleton.',
    ],
  },
  {
    title: 'Skill mastery',
    summary: 'Go deep on the skills your target role demands, with deliberate practice.',
    focusRatio: 0.25,
    milestones: (roleSkills) => [
      `Reach interview-ready proficiency in: ${firstSkills(roleSkills, 5)}.`,
      'Complete 2-3 advanced courses/certifications aligned with the target stack.',
      'Contribute to open source or a team project to apply skills in a realistic setting.',
    ],
  },
  {
    title: 'Projects & portfolio',
    summary: 'Turn skills into demonstrable work that recruiters can verify.',
    focusRatio: 0.25,
    milestones: (roleSkills) => [
      'Build 2-3 end-to-end projects showcasing the primary skills in your portfolio.',
      `Incorporate ${firstSkills(roleSkills, 2)} into at least one production-grade project.`,
      'Write clean documentation, READMEs, and prepare a one-line pitch per project.',
    ],
  },
  {
    title: 'Interview preparation',
    summary: 'Train specifically for the hiring funnel of your target companies.',
    focusRatio: 0.25,
    milestones: (roleSkills) => [
      'Solve DSA problems consistently (platform streaks + mock rounds).',
      'Practice system-design walkthroughs and HR/behavioral rounds.',
      `Run at least 5 mock interviews covering ${firstSkills(roleSkills, 3)}.`,
    ],
  },
  {
    title: 'Applications & offers',
    summary: 'Execute the application process and convert interviews into offers.',
    focusRatio: 0.1,
    milestones: () => [
      'Polish the resume, LinkedIn, and portfolio for the target companies.',
      'Apply via referrals and company portals in weekly batches.',
      'Track every application and follow up within 5 business days.',
    ],
  },
];

function firstSkills(skills: string[], count: number): string {
  if (skills.length === 0) {
    return 'core technical skills';
  }
  return skills.slice(0, count).join(', ');
}

function monthsBetween(from: Date, to: Date): number {
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  return (to.getTime() - from.getTime()) / msPerMonth;
}

export function generateCareerRoadmap(input: CareerRoadmapInput): CareerRoadmap {
  const now = input.now ?? new Date();
  const rawMonths = input.targetDate ? monthsBetween(now, input.targetDate) : 24;
  const totalMonths = Math.min(Math.max(Math.round(rawMonths), 3), 48);

  const roleSkills = resolveTargetSkills(
    input.targetRole,
    input.targetCompanies ?? [],
    input.industries ?? [],
  );

  const phases: CareerRoadmapPhase[] = [];
  let cursor = 0;
  let remaining = totalMonths - 1; // reserve at least one month for the last phase
  PHASE_BLUEPRINTS.forEach((blueprint, index) => {
    const isLast = index === PHASE_BLUEPRINTS.length - 1;
    const start = cursor;
    let durationMonths: number;
    let end: number;
    if (isLast) {
      durationMonths = Math.max(1, totalMonths - cursor);
      end = totalMonths;
    } else {
      durationMonths = Math.max(1, Math.round(totalMonths * blueprint.focusRatio));
      durationMonths = Math.min(durationMonths, Math.max(1, remaining));
      cursor += durationMonths;
      remaining -= durationMonths;
      end = cursor;
    }
    phases.push({
      phase: index + 1,
      title: blueprint.title,
      duration: `${start}-${Math.max(start + 1, end)} months`,
      summary: blueprint.summary,
      focus: roleSkills.length > 0 ? roleSkills : ['Core fundamentals'],
      milestones: blueprint.milestones(roleSkills),
    });
  });

  return { totalMonths, phases };
}
