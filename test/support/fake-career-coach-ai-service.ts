import { AiService, AiServiceError } from '../../src/ai/ai.service';

const FORCE_FAILURE = 'FORCE_AI_FAILURE';

/**
 * Deterministic in-memory AiService for the career-coach e2e suite. Branches on
 * the `TASK:` marker embedded in the prompt by the prompt builders so each AI
 * call returns the shape the service's zod schema expects. If the student's
 * chat message contains FORCE_AI_FAILURE the call throws, letting the suite
 * exercise the "AI failed → nothing persisted" path.
 */
export class FakeCareerCoachAiService extends AiService {
  override async generateStructured<T>(request: {
    system: string;
    prompt: string;
    schema: unknown;
  }): Promise<T> {
    const { prompt } = request;

    if (prompt.includes(FORCE_FAILURE)) {
      throw new AiServiceError('forced AI failure for test');
    }

    if (prompt.includes('TASK: salary_prediction')) {
      return {
        baseCtcLakhs: 24,
        totalCtcLakhs: 28,
        rangeLowLakhs: 20,
        rangeHighLakhs: 32,
        confidence: 72,
        factors: ['target role salary band', 'fewer years of experience'],
      } as T;
    }

    const studentMessage = prompt.match(/Student message: (.+)$/m);
    const reply = studentMessage
      ? `Coaching reply to "${studentMessage[1].trim()}".`
      : 'Generic coaching reply.';

    return { reply } as T;
  }
}
