import { z } from 'zod';

export interface CareerCoachContext {
  skills?: Array<{
    name: string;
    category: string;
    proficiencyLevel: string;
    yearsOfExperience: number | null;
    isPrimary: boolean;
  }>;
  careerGoal?: {
    targetRole?: string | null;
    targetCompanies: string[];
    industries: string[];
    targetCtcLakhs?: number | null;
    targetDate?: Date | null;
  };
}

export const salaryPredictionSchema = z.object({
  baseCtcLakhs: z.number().min(0),
  totalCtcLakhs: z.number().min(0),
  rangeLowLakhs: z.number().min(0),
  rangeHighLakhs: z.number().min(0),
  confidence: z.number().int().min(0).max(100),
  factors: z.array(z.string()).default([]),
});

export const chatResponseSchema = z.object({
  reply: z.string().min(1),
});

const SYSTEM_PROMPT =
  "You are XKILL's AI Career Coach for college students. You give actionable, " +
  "specific, career guidance grounded in the student's profile. Be honest about " +
  'uncertainty — never present estimates as guarantees. You must respond with a ' +
  'single JSON object only — never prose outside the JSON.';

function buildSkillLines(context: CareerCoachContext): string {
  if (!context.skills || context.skills.length === 0) {
    return 'The student has no skills recorded in their profile yet.';
  }
  const lines = context.skills.map(
    (skill) =>
      `- ${skill.name} (${skill.category}, ${skill.proficiencyLevel}, ` +
      `${skill.yearsOfExperience ?? 0} yr${skill.yearsOfExperience === 1 ? '' : 's'}${skill.isPrimary ? ', primary' : ''})`,
  );
  return `Candidate skills from their profile:\n${lines.join('\n')}`;
}

function buildGoalLine(context: CareerCoachContext): string {
  const goal = context.careerGoal;
  if (!goal) {
    return 'The student has no active career goal yet.';
  }
  const parts: string[] = [];
  if (goal.targetRole) {
    parts.push(`target role: ${goal.targetRole}`);
  }
  if (goal.targetCompanies.length > 0) {
    parts.push(`target companies: ${goal.targetCompanies.join(', ')}`);
  }
  if (goal.industries.length > 0) {
    parts.push(`industries: ${goal.industries.join(', ')}`);
  }
  if (goal.targetCtcLakhs != null) {
    parts.push(`target CTC: ${goal.targetCtcLakhs} LPA`);
  }
  if (goal.targetDate) {
    parts.push(`target date: ${goal.targetDate.toISOString().slice(0, 10)}`);
  }
  return `Active career goal: ${parts.join('; ')}.`;
}

export function buildSalaryPredictionPrompt(context: CareerCoachContext): {
  system: string;
  prompt: string;
} {
  return {
    system: SYSTEM_PROMPT,
    prompt:
      `TASK: salary_prediction\n` +
      `${buildSkillLines(context)}\n\n` +
      `${buildGoalLine(context)}\n\n` +
      `Estimate a realistic fresher-level CTC for THIS candidate at their target ` +
      `companies. Return JSON: ` +
      `{"baseCtcLakhs":<base in lakhs per annum>,"totalCtcLakhs":<base + expected variable/bonus>,"rangeLowLakhs":<lower bound of range>,"rangeHighLakhs":<upper bound of range>,"confidence":<0-100>,"factors":["reason the estimate was adjusted up/down"]}.`,
  };
}

export function buildChatPrompt(
  context: CareerCoachContext,
  historyLines: string[],
  message: string,
): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt:
      `TASK: chat_reply\n` +
      `${buildSkillLines(context)}\n\n` +
      `${buildGoalLine(context)}\n\n` +
      `This is a career-coaching conversation with the student. Recent history, ` +
      `oldest first:\n${historyLines.join('\n')}\n\n` +
      `Student message: ${message}\n\n` +
      `Reply helpfully and concisely. Return JSON: {"reply":"your coaching answer"}.`,
  };
}
