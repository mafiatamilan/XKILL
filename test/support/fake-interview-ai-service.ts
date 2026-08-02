import { AiService, AiServiceError } from '../../src/ai/ai.service';

const FORCE_FAILURE = 'FORCE_AI_FAILURE';

/**
 * Deterministic in-memory AiService for the interview e2e suite. Branches on the
 * `TASK:` marker embedded in the prompt by the prompt builders so each AI call
 * returns the shape the service's zod schema expects. If the candidate's latest
 * answer contains FORCE_AI_FAILURE the call throws, letting the suite exercise
 * the "AI failed mid-interview → session stays retryable" path.
 */
export class FakeInterviewAiService extends AiService {
  override async generateStructured<T>(request: {
    system: string;
    prompt: string;
    schema: unknown;
  }): Promise<T> {
    const { prompt } = request;

    if (prompt.includes(FORCE_FAILURE)) {
      throw new AiServiceError('forced AI failure for test');
    }

    const problemMatch = prompt.match(/Interview problem: (.+?) \(difficulty:/);
    const problemTitle = problemMatch ? problemMatch[1].trim() : null;

    if (prompt.includes('TASK: opening_question')) {
      return {
        question: problemTitle
          ? `Let's start. Walk me through how you would approach "${problemTitle}".`
          : "Let's start. Tell me about yourself.",
      } as T;
    }

    if (prompt.includes('TASK: final_report')) {
      return {
        overallScore: 84,
        summary: 'Strong communication with a clear structured approach.',
        strengths: ['Clear structure', 'Good communication'],
        improvements: ['Go deeper on time-complexity analysis'],
        suggestions: ['Practice more system-design questions'],
        topicScores: { communication: 88, problemSolving: 80 },
      } as T;
    }

    const accepted = prompt.includes('Judge verdict: accepted');
    return {
      nextQuestion: accepted
        ? 'Your code passed all cases. Now explain the time complexity of your approach.'
        : "Good answer. Let's dig deeper — what would you change under stricter constraints?",
      feedback: [
        {
          skill: 'problem-solving',
          score: accepted ? 9 : 6,
          comment: 'Reasonable approach, keep refining.',
        },
      ],
    } as T;
  }
}
