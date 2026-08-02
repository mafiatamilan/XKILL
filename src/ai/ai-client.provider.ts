export const OPENCODE_CLIENT = 'OPENCODE_CLIENT';

export interface AiSession {
  id: string;
}

export interface AiTextPart {
  type: string;
  text?: string;
  synthetic?: boolean;
}

export interface AiClientError {
  message?: string;
}

export interface AiClient {
  session: {
    create(options: {
      body: { title: string };
    }): Promise<{ data?: AiSession; error?: AiClientError }>;
    prompt(options: {
      path: { id: string };
      body: {
        model: { providerID: string; modelID: string };
        system: string;
        parts: Array<{ type: 'text'; text: string }>;
      };
    }): Promise<{ data?: { info?: { id?: string }; parts: AiTextPart[] }; error?: AiClientError }>;
  };
}

/**
 * Calls the opencode Responses API (`POST {baseUrl}`) directly over HTTPS with a
 * Bearer API key. Keeps the SDK's session/prompt shape so `AiService` is
 * unchanged, but no `@opencode-ai/sdk` is involved.
 */
export async function createAiClient(clientOptions: {
  baseUrl: string;
  apiKey: string;
}): Promise<AiClient> {
  const prompt = async (options: {
    path: { id: string };
    body: {
      model: { providerID: string; modelID: string };
      system: string;
      parts: Array<{ type: 'text'; text: string }>;
    };
  }): Promise<{
    data?: { info?: { id?: string }; parts: AiTextPart[] };
    error?: AiClientError;
  }> => {
    const { body } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientOptions.apiKey) {
      headers.Authorization = `Bearer ${clientOptions.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(clientOptions.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: body.model.modelID,
          instructions: body.system,
          input: body.parts.map((part) => ({
            role: 'user',
            content: [{ type: 'input_text', text: part.text }],
          })),
        }),
      });
    } catch (err) {
      return {
        error: { message: err instanceof Error ? err.message : 'Network error calling AI API' },
      };
    }

    if (!response.ok) {
      const text = await response.text();
      return { error: { message: `AI API ${response.status}: ${text}` } };
    }

    const json = (await response.json()) as {
      id?: string;
      output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const parts: AiTextPart[] = (json.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
      .map((content) => ({ type: 'text', text: content.text }));

    return { data: { info: { id: json.id }, parts } };
  };

  return {
    session: {
      create: async () => ({ data: { id: `ai-${Date.now()}` } }),
      prompt,
    },
  };
}
