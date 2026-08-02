import { z } from 'zod';

export const INTERVIEW_TYPES = ['hr', 'technical', 'dsa', 'system-design'] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const SUPPORTED_MODES = ['text'] as const;

export const openingQuestionSchema = z.object({
  question: z.string().min(1),
});

export const turnFeedbackSchema = z.object({
  skill: z.string().min(1),
  score: z.number().min(1).max(10),
  comment: z.string().min(1),
});

export const turnResponseSchema = z.object({
  nextQuestion: z.string().min(1),
  feedback: z.array(turnFeedbackSchema).default([]),
  dsaHint: z.string().optional(),
});

export const reportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  topicScores: z.record(z.string(), z.number()).optional(),
});

export interface InterviewContext {
  type: string;
  mode: string;
  problem?: {
    title: string;
    difficulty: string;
    topics: string[];
    statement: string;
  };
  skills?: Array<{
    name: string;
    category: string;
    proficiencyLevel: string;
    yearsOfExperience: number | null;
    isPrimary: boolean;
  }>;
}

const SYSTEM_PROMPT =
  'You are a senior technical interviewer at a top product company conducting a mock interview ' +
  'for a college student. You ask exactly one question at a time and give focused, honest ' +
  'feedback. You must respond with a single JSON object only — never prose outside the JSON.';

export function buildContextLines(context: InterviewContext): string {
  const lines: string[] = [];
  if (context.problem) {
    lines.push(
      `Interview problem: ${context.problem.title} (difficulty: ${context.problem.difficulty}, ` +
        `topics: ${context.problem.topics.join(', ')}).`,
    );
    lines.push(`Problem statement: ${context.problem.statement}`);
  }
  if (context.skills && context.skills.length > 0) {
    lines.push('Candidate skills from their profile:');
    for (const skill of context.skills) {
      lines.push(
        `- ${skill.name} (${skill.category}, ${skill.proficiencyLevel}, ` +
          `${skill.yearsOfExperience ?? 0} yr${skill.yearsOfExperience === 1 ? '' : 's'}${skill.isPrimary ? ', primary' : ''})`,
      );
    }
  }
  return lines.join('\n');
}

export function buildOpeningPrompt(context: InterviewContext): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt:
      `You are starting a ${context.type} mock interview (mode: ${context.mode}).\n` +
      `${buildContextLines(context)}\n\n` +
      `TASK: opening_question\n` +
      `Generate the opening question that starts this interview. Return JSON: ` +
      `{"question":"the opening question"}.`,
  };
}

export function buildTurnPrompt(
  context: InterviewContext,
  transcriptLines: string[],
): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt:
      `This is an ongoing ${context.type} mock interview (mode: ${context.mode}).\n` +
      `${buildContextLines(context)}\n\n` +
      `TASK: next_turn\n` +
      `Here is the full interview transcript so far, oldest first. The candidate's latest answer is ` +
      `the last Candidate line.\n${transcriptLines.join('\n')}\n\n` +
      `Generate the next interview question and per-skill feedback on the candidate's LATEST answer. ` +
      `Return JSON: ` +
      `{"nextQuestion":"the next question","feedback":[{"skill":"dimension","score":<1-10>,"comment":"specific, constructive feedback"}]}.`,
  };
}

export function buildReportPrompt(
  context: InterviewContext,
  transcriptLines: string[],
): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt:
      `This is a completed ${context.type} mock interview (mode: ${context.mode}).\n` +
      `${buildContextLines(context)}\n\n` +
      `TASK: final_report\n` +
      `Here is the full transcript.\n${transcriptLines.join('\n')}\n\n` +
      `Write a final evaluation report for the candidate. Return JSON: ` +
      `{"overallScore":<0-100>,"summary":"concise overall assessment","strengths":["..."],"improvements":["..."],"suggestions":["..."],"topicScores":{"topic":<0-100>}}.`,
  };
}
