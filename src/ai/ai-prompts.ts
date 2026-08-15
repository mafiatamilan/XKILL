import { z } from 'zod';

// ── Tutor Ask ──

const TUTOR_SYSTEM =
  'You are an expert computer science tutor for college students. You explain concepts ' +
  'clearly with examples. Be encouraging but honest about gaps. You must respond with a ' +
  'single JSON object only — never prose outside the JSON.';

export const tutorAnswerSchema = z.object({
  answer: z.string().min(1),
  relatedTopics: z.array(z.string()).default([]),
  followUpQuestions: z.array(z.string()).default([]),
});

export function buildTutorPrompt(input: { question: string; topic?: string; context?: string }): {
  system: string;
  prompt: string;
} {
  const lines: string[] = ['TASK: tutor_answer'];
  if (input.topic) lines.push(`Topic area: ${input.topic}`);
  if (input.context) lines.push(`Student context: ${input.context}`);
  lines.push(`\nStudent question: ${input.question}`);
  lines.push(
    '\nProvide a clear, thorough explanation. Return JSON: ' +
      '{"answer":"your explanation in markdown-friendly text","relatedTopics":["topic1","topic2"],' +
      '"followUpQuestions":["question1","question2"]}.',
  );
  return { system: TUTOR_SYSTEM, prompt: lines.join('\n') };
}

// ── Doubt Solver ──

const DOUBT_SYSTEM =
  'You are a senior programmer who helps students debug and understand code problems. ' +
  'Be specific about what went wrong and why. You must respond with a single JSON object ' +
  'only — never prose outside the JSON.';

export const doubtSolutionSchema = z.object({
  explanation: z.string().min(1),
  correctedApproach: z.string().min(1),
  keyInsights: z.array(z.string()).default([]),
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
});

export function buildDoubtSolverPrompt(input: {
  doubt: string;
  topic?: string;
  codeSnippet?: string;
}): { system: string; prompt: string } {
  const lines: string[] = ['TASK: solve_doubt'];
  if (input.topic) lines.push(`Topic: ${input.topic}`);
  if (input.codeSnippet) lines.push(`\nCurrent code:\n${input.codeSnippet}`);
  lines.push(`\nStudent's doubt: ${input.doubt}`);
  lines.push(
    '\nExplain the root cause, provide the corrected approach, and list key insights. ' +
      'Return JSON: {"explanation":"what went wrong","correctedApproach":"how to fix it",' +
      '"keyInsights":["insight1","insight2"],"timeComplexity":"O(...)","spaceComplexity":"O(...)"}.',
  );
  return { system: DOUBT_SYSTEM, prompt: lines.join('\n') };
}

// ── Code Review ──

const CODE_REVIEW_SYSTEM =
  'You are a senior software engineer performing a thorough code review. Be constructive ' +
  'and specific. You must respond with a single JSON object only — never prose outside the JSON.';

export const codeReviewIssueSchema = z.object({
  severity: z.enum(['bug', 'performance', 'readability', 'security', 'best-practice']),
  line: z.string().min(1),
  message: z.string().min(1),
  suggestion: z.string().min(1),
});

export const codeReviewResultSchema = z.object({
  overallAssessment: z.string().min(1),
  issues: z.array(codeReviewIssueSchema).default([]),
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  improvedCode: z.string().min(1),
});

export function buildCodeReviewPrompt(input: { code: string; language: string; focus?: string }): {
  system: string;
  prompt: string;
} {
  const lines: string[] = ['TASK: code_review', `Language: ${input.language}`];
  if (input.focus) lines.push(`Review focus: ${input.focus}`);
  lines.push(`\nCode to review:\n${input.code}`);
  lines.push(
    '\nAnalyze for bugs, performance, readability, security, and best practices. ' +
      'Return JSON: {"overallAssessment":"summary","issues":[{"severity":"bug|performance|readability|security|best-practice","line":"line reference","message":"what is wrong","suggestion":"how to fix"}],"timeComplexity":"O(...)","spaceComplexity":"O(...)","strengths":["what is done well"],"improvedCode":"the corrected code"}.',
  );
  return { system: CODE_REVIEW_SYSTEM, prompt: lines.join('\n') };
}

// ── Resume Analyzer ──

const RESUME_SYSTEM =
  'You are an expert resume reviewer and career coach for fresh graduates. You provide ' +
  'honest, actionable feedback. You must respond with a single JSON object only — ' +
  'never prose outside the JSON.';

export const resumeAnalyzerResultSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  atsScoreEstimate: z.number().int().min(0).max(100),
});

export function buildResumeAnalyzerPrompt(input: { resumeText: string; targetRole?: string }): {
  system: string;
  prompt: string;
} {
  const lines: string[] = ['TASK: resume_analysis'];
  if (input.targetRole) lines.push(`Target role: ${input.targetRole}`);
  lines.push(`\nResume text:\n${input.resumeText}`);
  lines.push(
    '\nAnalyze this resume for strengths, weaknesses, and improvement suggestions. ' +
      'Estimate an ATS-friendliness score (0-100). Return JSON: ' +
      '{"summary":"overall assessment","strengths":["strength1"],"weaknesses":["weakness1"],' +
      '"suggestions":["suggestion1"],"atsScoreEstimate":<0-100>}.',
  );
  return { system: RESUME_SYSTEM, prompt: lines.join('\n') };
}

// ── Interview Evaluator ──

const INTERVIEW_EVAL_SYSTEM =
  "You are a senior interviewer evaluating a candidate's interview answer. Be fair, " +
  'constructive, and specific. You must respond with a single JSON object only — ' +
  'never prose outside the JSON.';

export const interviewEvaluationResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  modelAnswer: z.string().min(1),
});

export function buildInterviewEvaluationPrompt(input: {
  question: string;
  answer: string;
  interviewType: string;
}): { system: string; prompt: string } {
  const lines: string[] = [
    'TASK: interview_evaluation',
    `Interview type: ${input.interviewType}`,
    `\nQuestion: ${input.question}`,
    `\nCandidate's answer: ${input.answer}`,
    '\nEvaluate the answer on content, clarity, structure, and relevance. ' +
      'Return JSON: {"score":<0-100>,"feedback":"detailed evaluation","strengths":["what was good"],' +
      '"improvements":["what could be better"],"modelAnswer":"an example strong answer"}.',
  ];
  return { system: INTERVIEW_EVAL_SYSTEM, prompt: lines.join('\n') };
}

// ── Question Generator ──

const QUESTION_GEN_SYSTEM =
  'You are an expert question setter for computer science topics. Questions should be ' +
  'challenging but fair, testing understanding not memorization. You must respond with a ' +
  'single JSON object only — never prose outside the JSON.';

export const generatedQuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const questionGeneratorResultSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export function buildQuestionGeneratorPrompt(input: {
  topic: string;
  difficulty: string;
  count: number;
  category?: string;
}): { system: string; prompt: string } {
  const lines: string[] = [
    'TASK: generate_questions',
    `Topic: ${input.topic}`,
    `Difficulty: ${input.difficulty}`,
    `Number of questions: ${input.count}`,
  ];
  if (input.category) lines.push(`Category: ${input.category}`);
  lines.push(
    '\nGenerate practice questions with answers and explanations. Return JSON: ' +
      '{"questions":[{"question":"the question","answer":"the answer","explanation":"why this is the answer",' +
      '"difficulty":"easy|medium|hard"}]}.',
  );
  return { system: QUESTION_GEN_SYSTEM, prompt: lines.join('\n') };
}

// ── Study Planner ──

const STUDY_PLANNER_SYSTEM =
  'You are a senior placement strategist for computer science students. Create focused, ' +
  'practical study plans. You must respond with a single JSON object only — never prose ' +
  'outside the JSON.';

export const aiStudyPlanResultSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1),
        theme: z.string().min(1),
        goals: z.array(z.string()).default([]),
        activities: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});

export function buildAiStudyPlanPrompt(input: {
  targetRole: string;
  targetSkills?: string[];
  weeks?: number;
  hoursPerWeek?: number;
}): { system: string; prompt: string } {
  const lines: string[] = ['TASK: study_plan'];
  lines.push(`Target role: ${input.targetRole}`);
  if (input.targetSkills && input.targetSkills.length > 0) {
    lines.push(`Skills to focus on: ${input.targetSkills.join(', ')}`);
  }
  const weekCount = input.weeks ?? 4;
  lines.push(`Plan duration: ${weekCount} weeks`);
  if (input.hoursPerWeek) lines.push(`Available hours per week: ${input.hoursPerWeek}`);
  lines.push(
    `\nReturn a JSON object with keys: title (string), overview (string), and weeks ` +
      `(array of ${weekCount} objects with keys: week (number), theme (string), ` +
      `goals (string[]), activities (string[])).`,
  );
  return { system: STUDY_PLANNER_SYSTEM, prompt: lines.join('\n') };
}
