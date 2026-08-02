export interface TranscriptTurn {
  role: 'ai' | 'user';
  content: string;
  code?: string | null;
  judgeVerdict?: string | null;
  passedTestCases?: number | null;
  totalTestCases?: number | null;
}

export interface TranscriptResult {
  lines: string[];
  truncated: boolean;
}

/**
 * Truncation policy for very long interviews: the report AI call must fit a
 * bounded context window. We always keep the first (opening) turn so the model
 * retains the interview's framing, then keep the most recent `MAX_REPORT_TURNS - 1`
 * turns, dropping the stale middle. Each message is further capped at
 * `MAX_TURN_CHARS` characters.
 */
export const MAX_REPORT_TURNS = 40;
export const MAX_TURN_CHARS = 800;

export function truncateContent(text: string, max = MAX_TURN_CHARS): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

export function formatTurnLine(turn: TranscriptTurn): string {
  const prefix = turn.role === 'ai' ? 'Interviewer' : 'Candidate';
  let line = `${prefix}: ${truncateContent(turn.content)}`;
  if (turn.code) {
    line += `\nCode submitted: ${truncateContent(turn.code)}`;
    if (turn.judgeVerdict) {
      line += `\nJudge verdict: ${turn.judgeVerdict} (${turn.passedTestCases ?? 0}/${turn.totalTestCases ?? 0} cases passed)`;
    }
  }
  return line;
}

export function buildInterviewTranscript(turns: TranscriptTurn[]): TranscriptResult {
  if (turns.length === 0) {
    return { lines: [], truncated: false };
  }
  let selected = turns;
  let truncated = false;
  if (turns.length > MAX_REPORT_TURNS) {
    selected = [turns[0], ...turns.slice(turns.length - (MAX_REPORT_TURNS - 1))];
    truncated = true;
  }
  return { lines: selected.map(formatTurnLine), truncated };
}
