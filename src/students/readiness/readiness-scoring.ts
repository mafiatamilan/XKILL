/**
 * Deterministic readiness scoring.
 *
 * This is a pure function: given a snapshot of the student's platform state it
 * returns the overall readiness score (0-100) plus per-component breakdowns.
 * It has no I/O and no dependencies on Nest/Prisma so it can be unit-tested with
 * fixed input/expected-output pairs. Later modules (placement prep, TPO reports)
 * consume the same score, so its behaviour is pinned down here.
 */

export const READINESS_WEIGHTS = {
  profile: 30,
  skills: 30,
  careerGoal: 25,
  activity: 15,
} as const;

const COMPLETION_MAX = 50;
const RESUME_MAX = 40;
const PROFILE_EXISTS = 10;

const SKILLS_COUNT_MAX = 40;
const SKILLS_ADVANCED_MAX = 40;
const SKILLS_CATEGORIES_MAX = 20;

const GOAL_EXISTS = 30;
const GOAL_ROLE = 20;
const GOAL_COMPANIES = 20;
const GOAL_DATE = 15;
const GOAL_CTC = 15;

const ACTIVITY_RECENT_MAX = 60;
const ACTIVITY_NOTIFICATIONS_MAX = 40;

export interface ReadinessInput {
  profile: {
    exists: boolean;
    completionPercent: number;
    hasResume: boolean;
  };
  skills: {
    total: number;
    advanced: number;
    categories: number;
  };
  careerGoal: {
    hasGoal: boolean;
    hasTargetRole: boolean;
    hasTargetCompanies: boolean;
    hasTargetDate: boolean;
    hasCtc: boolean;
  };
  activity: {
    recentActivityCount: number;
    readNotificationCount: number;
  };
}

export interface ReadinessComponents {
  profile: number;
  skills: number;
  careerGoal: number;
  activity: number;
}

export interface ReadinessResult {
  overall: number;
  components: ReadinessComponents;
}

const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, value));

function scoreProfile(input: ReadinessInput['profile']): number {
  return (
    (input.exists ? PROFILE_EXISTS : 0) +
    clamp(Math.round(input.completionPercent), COMPLETION_MAX) +
    (input.hasResume ? RESUME_MAX : 0)
  );
}

function scoreSkills(input: ReadinessInput['skills']): number {
  return (
    clamp(input.total * 5, SKILLS_COUNT_MAX) +
    clamp(input.advanced * 8, SKILLS_ADVANCED_MAX) +
    clamp(input.categories * 5, SKILLS_CATEGORIES_MAX)
  );
}

function scoreCareerGoal(input: ReadinessInput['careerGoal']): number {
  return (
    (input.hasGoal ? GOAL_EXISTS : 0) +
    (input.hasTargetRole ? GOAL_ROLE : 0) +
    (input.hasTargetCompanies ? GOAL_COMPANIES : 0) +
    (input.hasTargetDate ? GOAL_DATE : 0) +
    (input.hasCtc ? GOAL_CTC : 0)
  );
}

function scoreActivity(input: ReadinessInput['activity']): number {
  return (
    clamp(input.recentActivityCount * 10, ACTIVITY_RECENT_MAX) +
    clamp(input.readNotificationCount * 4, ACTIVITY_NOTIFICATIONS_MAX)
  );
}

export function calculateReadinessScore(input: ReadinessInput): ReadinessResult {
  const profile = scoreProfile(input.profile);
  const skills = scoreSkills(input.skills);
  const careerGoal = scoreCareerGoal(input.careerGoal);
  const activity = scoreActivity(input.activity);

  const overall = Math.round(
    (profile * READINESS_WEIGHTS.profile +
      skills * READINESS_WEIGHTS.skills +
      careerGoal * READINESS_WEIGHTS.careerGoal +
      activity * READINESS_WEIGHTS.activity) /
      100,
  );

  return {
    overall,
    components: { profile, skills, careerGoal, activity },
  };
}
