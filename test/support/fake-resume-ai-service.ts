import { AiService, AiServiceError } from '../../src/ai/ai.service';

const FORCE_FAILURE = 'FORCE_AI_FAILURE';

/**
 * Deterministic in-memory AiService for the resumes e2e suite. Branches on the
 * `TASK:` marker embedded in the prompt by the resume prompt builder and returns
 * the shape the zod schema expects. If the resume content (or job description)
 * contains FORCE_AI_FAILURE the call throws, letting the suite exercise the
 * "score computed, AI suggestions unavailable" path.
 */
export class FakeResumeAiService extends AiService {
  override async generateStructured<T>(request: {
    system: string;
    prompt: string;
    schema: unknown;
  }): Promise<T> {
    const { prompt } = request;

    if (prompt.includes(FORCE_FAILURE)) {
      throw new AiServiceError('forced AI failure for test');
    }

    if (prompt.includes('TASK: ats_suggestions')) {
      return {
        suggestions: [
          {
            category: 'content',
            suggestion: 'Quantify the impact of each highlight with metrics.',
            rationale: 'ATS ranking favors measurable outcomes.',
          },
          {
            category: 'keywords',
            suggestion: 'Mirror the exact phrasing used in the target job description.',
            rationale: 'Exact-phrase keyword matches score higher in parser rankings.',
          },
        ],
      } as T;
    }

    throw new AiServiceError(`unhandled prompt for resume suite: ${prompt.slice(0, 80)}`);
  }
}
