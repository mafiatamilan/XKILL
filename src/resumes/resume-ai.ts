import { z } from 'zod';
import { AtsScoreResult, ResumeContent } from './ats-scorer';

export const atsSuggestionSchema = z.object({
  category: z.string().min(1),
  suggestion: z.string().min(1),
  rationale: z.string().min(1),
});

export const atsSuggestionsResponseSchema = z.object({
  suggestions: z.array(atsSuggestionSchema).min(1),
});

export type AtsSuggestion = z.infer<typeof atsSuggestionSchema>;

const SYSTEM_PROMPT =
  "You are XKILL's ATS resume reviewer. You review resumes for ATS-friendliness and " +
  'give concrete, actionable improvement suggestions grounded in the resume text and the ' +
  'deterministic score breakdown. Be specific and honest. You must respond with a single ' +
  'JSON object only — never prose outside the JSON.';

function truncate(text: string, max = 4000): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function buildAtsSuggestionsPrompt(input: {
  content: ResumeContent;
  score: AtsScoreResult;
  jobDescription?: string;
}): { system: string; prompt: string } {
  const { content, score, jobDescription } = input;
  const lines: string[] = ['TASK: ats_suggestions'];
  lines.push(`Deterministic ATS score: ${score.score}/100`);
  lines.push(
    `Missing sections: ${score.missingSections.length > 0 ? score.missingSections.join(', ') : 'none'}`,
  );
  lines.push(
    `Detected issues: ${score.issues.map((issue) => issue.message).join(' | ') || 'none'}`,
  );
  if (jobDescription && jobDescription.trim().length > 0) {
    lines.push(
      `Keyword overlap: ${score.keywordOverlap.matched.length} matched, ${score.keywordOverlap.missing.length} missing (coverage ${Math.round(score.keywordOverlap.coverage * 100)}%).`,
    );
    lines.push(`Missing keywords: ${score.keywordOverlap.missing.join(', ') || 'none'}`);
  }
  lines.push(`Resume content:\n${truncate(JSON.stringify(content))}`);
  return {
    system: SYSTEM_PROMPT,
    prompt:
      lines.join('\n') +
      '\n\nWrite 3-6 specific ATS improvement suggestions. Return JSON: ' +
      '{"suggestions":[{"category":"one of structure|content|keywords|formatting|impact","suggestion":"what to change","rationale":"why it helps ATS parsing/ranking"}]}.',
  };
}
