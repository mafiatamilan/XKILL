import { AiService } from '../../src/ai/ai.service';

/**
 * Deterministic in-memory AiService used by the e2e suite. Returns a canned
 * structured study plan without touching a real opencode server.
 */
export class FakeAiService extends AiService {
  override async generateStructured<T>(): Promise<T> {
    return {
      title: 'SDE Placement Plan',
      overview: 'A 4-week plan to get placement ready.',
      weeks: [
        { week: 1, theme: 'DSA Foundations', goals: ['Arrays'], activities: ['Solve arrays'] },
        { week: 2, theme: 'Aptitude', goals: ['Quant'], activities: ['Practice quant'] },
      ],
    } as T;
  }
}
