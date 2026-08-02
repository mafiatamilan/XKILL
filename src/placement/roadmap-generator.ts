/**
 * Deterministic 10-week placement roadmap generation.
 *
 * Pure function: given a snapshot of the student's skills and career goal it
 * returns the 10 `RoadmapWeekSpec` rows (each with 7 daily tasks) that will be
 * persisted. No I/O, no Nest/Prisma dependencies, so it is unit-tested with
 * fixed input/expected-output pairs. Personalization is rule-based:
 *   - target role -> which core tracks come first (DSA vs data vs frontend)
 *   - skill proficiency -> foundational weeks are added when gaps exist
 *   - target companies -> company-specific prep weeks are inserted
 */

export type TaskType = 'dsa' | 'aptitude' | 'company' | 'project' | 'resume' | 'mock';

export interface RoadmapSkillInput {
  name: string;
  category: string;
  proficiencyLevel: string; // beginner | intermediate | advanced | expert
}

export interface RoadmapInput {
  targetRole?: string | null;
  targetCompanies: string[];
  skills: RoadmapSkillInput[];
}

export interface RoadmapTaskSpec {
  day: number;
  title: string;
  description: string;
  taskType: TaskType;
  /** Generic reference, e.g. a company name for company weeks. No DSA FK yet. */
  reference?: string;
}

export interface RoadmapWeekSpec {
  weekNumber: number;
  title: string;
  focus: string;
  tasks: RoadmapTaskSpec[];
}

interface WeekTemplate {
  title: string;
  focus: string;
  taskType: TaskType;
}

const BASE_WEEKS: WeekTemplate[] = [
  { title: 'Foundations', focus: 'Core concepts & skill foundations', taskType: 'dsa' },
  { title: 'DSA Core I', focus: 'Arrays, strings, hashing', taskType: 'dsa' },
  { title: 'DSA Core II', focus: 'Trees, graphs, recursion', taskType: 'dsa' },
  { title: 'DSA Core III', focus: 'Dynamic programming & greedy', taskType: 'dsa' },
  {
    title: 'Aptitude & Reasoning',
    focus: 'Quant, logical & verbal reasoning',
    taskType: 'aptitude',
  },
  { title: 'Company Prep I', focus: 'Target company deep-dive', taskType: 'company' },
  { title: 'Company Prep II', focus: 'Mock tests & previous papers', taskType: 'company' },
  { title: 'Projects & Resume', focus: 'Portfolio projects & resume polish', taskType: 'project' },
  { title: 'Mock Interviews', focus: 'Interview rounds & feedback', taskType: 'mock' },
  { title: 'Revision & Assessment', focus: 'Full-length mock & revision', taskType: 'resume' },
];

const ROLE_TRACKS: Record<string, { weeks: WeekTemplate[]; revisionTaskType: TaskType }> = {
  software: {
    weeks: BASE_WEEKS,
    revisionTaskType: 'dsa',
  },
  data: {
    weeks: BASE_WEEKS.map((week, index) =>
      index >= 1 && index <= 3
        ? {
            ...week,
            title: week.title.replace('DSA', 'Data'),
            focus: week.focus
              .replace('Arrays, strings, hashing', 'SQL, statistics, pandas')
              .replace('Trees, graphs, recursion', 'Probability, A/B testing, feature engineering'),
            taskType: week.taskType,
          }
        : week,
    ),
    revisionTaskType: 'aptitude',
  },
  frontend: {
    weeks: BASE_WEEKS.map((week, index) =>
      index >= 1 && index <= 3
        ? {
            ...week,
            title: week.title.replace('DSA', 'Web'),
            focus: week.focus
              .replace('Arrays, strings, hashing', 'HTML/CSS, JavaScript core')
              .replace('Trees, graphs, recursion', 'React, state management, performance'),
            taskType: week.taskType,
          }
        : week,
    ),
    revisionTaskType: 'aptitude',
  },
};

const DEFAULT_TRACK = 'software';

const DAILY_TASK_PATTERNS = [
  {
    day: 1,
    title: 'Concept mastery',
    description: 'Study the week\u2019s core concept and take notes',
  },
  { day: 2, title: 'Guided practice', description: 'Solve 3 guided practice problems' },
  { day: 3, title: 'Independent practice', description: 'Solve 5 independent practice problems' },
  { day: 4, title: 'Mixed revision', description: 'Revise earlier topics and solve a mixed set' },
  {
    day: 5,
    title: 'Mini quiz',
    description: 'Complete a timed mini quiz on the week\u2019s focus',
  },
  {
    day: 6,
    title: 'Deep dive',
    description: 'Deep-dive into a weak area identified during practice',
  },
  { day: 7, title: 'Weekly recap', description: 'Summarize learnings and plan next week' },
];

function detectTrack(targetRole?: string | null): string {
  if (!targetRole) return DEFAULT_TRACK;
  const role = targetRole.toLowerCase();
  if (/(data|analyst|ml|machine learning|ai)/.test(role)) return 'data';
  if (/(frontend|front-end|ui|web developer|react)/.test(role)) return 'frontend';
  return DEFAULT_TRACK;
}

function hasAdvancedSkill(skills: RoadmapSkillInput[]): boolean {
  return skills.some((skill) =>
    ['advanced', 'expert'].includes(skill.proficiencyLevel?.toLowerCase() ?? ''),
  );
}

function buildWeekTasks(
  template: WeekTemplate,
  weekNumber: number,
  company?: string,
): RoadmapTaskSpec[] {
  return DAILY_TASK_PATTERNS.map((pattern) => ({
    day: pattern.day,
    title: pattern.title,
    description: pattern.description,
    taskType: template.taskType,
    reference: company ?? (template.taskType === 'company' ? 'generic' : undefined),
  }));
}

/**
 * Generate the full 10-week roadmap for a student snapshot.
 *  - `targetRole` selects the track (software/data/frontend), defaulting to software.
 *  - Missing advanced skills prepend a foundational extra focus on week 1.
 *  - `targetCompanies` names the reference on the two company-prep weeks.
 */
export function generateRoadmap(input: RoadmapInput): RoadmapWeekSpec[] {
  const track = ROLE_TRACKS[detectTrack(input.targetRole)] ?? ROLE_TRACKS[DEFAULT_TRACK];
  const company = input.targetCompanies[0];

  return track.weeks.map((template, index) => {
    const weekNumber = index + 1;
    let week = template;
    if (weekNumber === 1 && !hasAdvancedSkill(input.skills)) {
      week = {
        ...week,
        title: 'Foundations & Skill Building',
        focus: `${week.focus} - build core skills first`,
      };
    }
    const weekCompany = week.taskType === 'company' ? company : undefined;
    return {
      weekNumber,
      title: week.title,
      focus: week.focus,
      tasks: buildWeekTasks(week, weekNumber, weekCompany),
    };
  });
}

export function generateRevisionTaskType(targetRole?: string | null): TaskType {
  return ROLE_TRACKS[detectTrack(targetRole)]?.revisionTaskType ?? 'dsa';
}
