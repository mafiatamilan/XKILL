import {
  buildInterviewTranscript,
  formatTurnLine,
  MAX_REPORT_TURNS,
  MAX_TURN_CHARS,
  truncateContent,
} from './report-builder';

describe('report-builder', () => {
  describe('truncateContent', () => {
    it('returns short text unchanged', () => {
      expect(truncateContent('hello', 10)).toBe('hello');
    });

    it('caps long text at the limit with an ellipsis', () => {
      const result = truncateContent('a'.repeat(20), 5);
      expect(result).toBe('aaaaa…');
      expect(result.length).toBe(6);
    });
  });

  describe('formatTurnLine', () => {
    it('formats an ai turn', () => {
      expect(formatTurnLine({ role: 'ai', content: 'Tell me about yourself' })).toBe(
        'Interviewer: Tell me about yourself',
      );
    });

    it('formats a user turn', () => {
      expect(formatTurnLine({ role: 'user', content: 'I studied CS' })).toBe(
        'Candidate: I studied CS',
      );
    });

    it('appends code and judge verdict for a code turn', () => {
      const line = formatTurnLine({
        role: 'user',
        content: 'Here is my solution',
        code: 'print(1)',
        judgeVerdict: 'accepted',
        passedTestCases: 4,
        totalTestCases: 4,
      });
      expect(line).toContain('Code submitted: print(1)');
      expect(line).toContain('Judge verdict: accepted (4/4 cases passed)');
    });

    it('truncates over-long code inside the line', () => {
      const line = formatTurnLine({
        role: 'user',
        content: 'x',
        code: 'a'.repeat(MAX_TURN_CHARS + 10),
      });
      expect(line).toContain('…');
    });
  });

  describe('buildInterviewTranscript', () => {
    it('returns empty for no turns', () => {
      expect(buildInterviewTranscript([])).toEqual({ lines: [], truncated: false });
    });

    it('keeps every turn below the cap', () => {
      const turns = Array.from({ length: 5 }, (_, i) => ({
        role: 'user' as const,
        content: `answer ${i}`,
      }));
      const result = buildInterviewTranscript(turns);
      expect(result.lines).toHaveLength(5);
      expect(result.truncated).toBe(false);
    });

    it('keeps the first turn + the most recent turns when over the cap, and flags truncation', () => {
      const turns = Array.from({ length: MAX_REPORT_TURNS + 10 }, (_, i) => ({
        role: (i % 2 === 0 ? 'ai' : 'user') as 'ai' | 'user',
        content: `turn ${i}`,
      }));
      const result = buildInterviewTranscript(turns);
      expect(result.truncated).toBe(true);
      expect(result.lines).toHaveLength(MAX_REPORT_TURNS);
      expect(result.lines[0]).toContain('turn 0');
      expect(result.lines[MAX_REPORT_TURNS - 1]).toContain(`turn ${MAX_REPORT_TURNS + 9}`);
      // the stale middle is dropped
      expect(result.lines.some((line) => line.includes('turn 5'))).toBe(false);
    });
  });
});
