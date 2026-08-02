import { Inject, Injectable } from '@nestjs/common';
import { ZodType } from 'zod';
import { AppConfigService } from '../config/app-config.service';
import { AiClient, OPENCODE_CLIENT } from './ai-client.provider';

export interface AiStructuredRequest<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly code = 'AI_GENERATION_FAILED',
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

@Injectable()
export class AiService {
  private readonly model: { providerID: string; modelID: string };

  constructor(
    @Inject(OPENCODE_CLIENT) private readonly client: AiClient,
    config: AppConfigService,
  ) {
    const ai = config.get().ai;
    this.model = { providerID: ai.provider, modelID: ai.model };
  }

  /**
   * Run a single-turn structured generation against the headless opencode
   * server. The prompt must instruct the model to return a single JSON object;
   * the returned JSON is validated against `schema`. On a malformed/invalid
   * response the call is retried once, then a clean typed error is thrown.
   */
  async generateStructured<T>(request: AiStructuredRequest<T>): Promise<T> {
    const attempts = 2;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await this.attemptStructured(request);
      } catch (err) {
        lastError = err;
        if (err instanceof AiServiceError && err.code === 'AI_UPSTREAM_ERROR') {
          throw err;
        }
      }
    }
    throw lastError instanceof AiServiceError
      ? lastError
      : new AiServiceError('AI generation failed after retries');
  }

  private async attemptStructured<T>(request: AiStructuredRequest<T>): Promise<T> {
    const session = await this.client.session.create({
      body: { title: 'xkill-ai-structured' },
    });
    if (session.error) {
      throw new AiServiceError(this.errorMessage(session.error), 'AI_UPSTREAM_ERROR');
    }
    const sessionId = session.data?.id;
    if (!sessionId) {
      throw new AiServiceError('AI returned no session', 'AI_UPSTREAM_ERROR');
    }

    const response = await this.client.session.prompt({
      path: { id: sessionId },
      body: {
        model: this.model,
        system: request.system,
        parts: [{ type: 'text', text: request.prompt }],
      },
    });
    if (response.error) {
      throw new AiServiceError(this.errorMessage(response.error), 'AI_UPSTREAM_ERROR');
    }

    const text = this.extractText(response.data?.parts ?? []);
    const parsed = this.parseJson(text);
    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      throw new AiServiceError(
        `AI returned invalid structured output: ${this.errorMessage(validated.error)}`,
        'AI_MALFORMED_RESPONSE',
      );
    }
    return validated.data;
  }

  private extractText(parts: Array<{ type: string; text?: string; synthetic?: boolean }>): string {
    const text = parts
      .filter((part) => part.type === 'text' && part.text && !part.synthetic)
      .map((part) => part.text as string)
      .join('\n')
      .trim();
    if (!text) {
      throw new AiServiceError('AI returned no text', 'AI_MALFORMED_RESPONSE');
    }
    return text;
  }

  private parseJson(text: string): unknown {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1].trim() : trimmed;
    try {
      return JSON.parse(candidate);
    } catch {
      throw new AiServiceError('AI returned unparseable JSON', 'AI_MALFORMED_RESPONSE');
    }
  }

  private errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: string }).message;
      return message ?? 'Unknown AI error';
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown AI error';
  }
}
