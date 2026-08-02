import { z } from 'zod';
import { AiClient } from './ai-client.provider';
import { AiService, AiServiceError } from './ai.service';
import { createAiClient } from './ai-client.provider';
import { mockConfig } from '../testing/mocks';

describe('AiService', () => {
  const schema = z.object({
    title: z.string(),
    weeks: z.array(z.object({ week: z.number(), focus: z.string() })),
  });

  const request = {
    system: 'Return only JSON',
    prompt: 'Plan a study schedule',
    schema,
  };

  function makeService(mockClient: unknown) {
    return new AiService(mockClient as AiClient, mockConfig());
  }

  function textPart(text: string) {
    return { id: 'p1', sessionID: 's1', messageID: 'm1', type: 'text', text };
  }

  const validData = {
    title: 'Placement Plan',
    weeks: [
      { week: 1, focus: 'DSA Arrays' },
      { week: 2, focus: 'Aptitude' },
    ],
  };

  describe('generateStructured', () => {
    it('returns validated JSON from the first attempt', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest.fn().mockResolvedValue({
            data: { info: { id: 'm1' }, parts: [textPart(JSON.stringify(validData))] },
            error: undefined,
          }),
        },
      };
      const service = makeService(client);

      const result = await service.generateStructured(request);

      expect(result).toEqual(validData);
      expect(client.session.create).toHaveBeenCalledTimes(1);
      expect(client.session.prompt).toHaveBeenCalledTimes(1);
    });

    it('strips markdown fences before parsing', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest.fn().mockResolvedValue({
            data: {
              info: { id: 'm1' },
              parts: [textPart('```json\n' + JSON.stringify(validData) + '\n```')],
            },
            error: undefined,
          }),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).resolves.toEqual(validData);
    });

    it('retries once on malformed response then throws a clean error', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest
            .fn()
            .mockResolvedValueOnce({
              data: { info: { id: 'm1' }, parts: [textPart('not json at all')] },
              error: undefined,
            })
            .mockResolvedValueOnce({
              data: { info: { id: 'm1' }, parts: [textPart(JSON.stringify(validData))] },
              error: undefined,
            }),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).resolves.toEqual(validData);
      expect(client.session.prompt).toHaveBeenCalledTimes(2);
    });

    it('throws AiServiceError when retries still return invalid JSON', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest.fn().mockResolvedValue({
            data: { info: { id: 'm1' }, parts: [textPart('{ nope')] },
            error: undefined,
          }),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).rejects.toThrow(AiServiceError);
      expect(client.session.prompt).toHaveBeenCalledTimes(2);
    });

    it('retries when the response fails schema validation', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest
            .fn()
            .mockResolvedValueOnce({
              data: {
                info: { id: 'm1' },
                parts: [textPart(JSON.stringify({ title: 'x', weeks: 'not-an-array' }))],
              },
              error: undefined,
            })
            .mockResolvedValueOnce({
              data: { info: { id: 'm1' }, parts: [textPart(JSON.stringify(validData))] },
              error: undefined,
            }),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).resolves.toEqual(validData);
      expect(client.session.prompt).toHaveBeenCalledTimes(2);
    });

    it('propagates upstream errors without retrying', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: undefined, error: { message: 'boom' } }),
          prompt: jest.fn(),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).rejects.toThrow('boom');
      expect(client.session.prompt).not.toHaveBeenCalled();
    });

    it('throws when session create returns no id', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: '' }, error: undefined }),
          prompt: jest.fn(),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).rejects.toThrow(AiServiceError);
    });

    it('throws when the prompt returns no text parts', async () => {
      const client = {
        session: {
          create: jest.fn().mockResolvedValue({ data: { id: 's1' }, error: undefined }),
          prompt: jest.fn().mockResolvedValue({
            data: { info: { id: 'm1' }, parts: [{ type: 'reasoning', text: 'thinking' }] },
            error: undefined,
          }),
        },
      };
      const service = makeService(client);

      await expect(service.generateStructured(request)).rejects.toThrow(AiServiceError);
      expect(client.session.prompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('createAiClient', () => {
    it('creates a client against the configured base URL', async () => {
      const client = await createAiClient({
        baseUrl: 'https://opencode.ai/zen/v1/responses',
        apiKey: '',
      });
      expect(client.session).toBeDefined();
    });

    it('prompts the Responses API and extracts output text', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'resp-1',
          output: [{ type: 'message', content: [{ type: 'output_text', text: '{"ok":true}' }] }],
        }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = await createAiClient({
        baseUrl: 'https://opencode.ai/zen/v1/responses',
        apiKey: 'secret',
      });
      const result = await client.session.prompt({
        path: { id: 's1' },
        body: {
          model: { providerID: 'opencode', modelID: 'deepseek-v4-flash-free' },
          system: 'You are a placement strategist',
          parts: [{ type: 'text', text: 'Build a plan' }],
        },
      });

      expect(result.data?.info?.id).toBe('resp-1');
      expect(result.data?.parts).toEqual([{ type: 'text', text: '{"ok":true}' }]);
      expect(fetchMock).toHaveBeenCalledWith('https://opencode.ai/zen/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret',
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash-free',
          instructions: 'You are a placement strategist',
          input: [{ role: 'user', content: [{ type: 'input_text', text: 'Build a plan' }] }],
        }),
      });
    });

    it('surfaces upstream HTTP errors and drops the Bearer header without an api key', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = await createAiClient({
        baseUrl: 'https://opencode.ai/zen/v1/responses',
        apiKey: '',
      });
      const result = await client.session.prompt({
        path: { id: 's1' },
        body: {
          model: { providerID: 'opencode', modelID: 'deepseek-v4-flash-free' },
          system: 's',
          parts: [{ type: 'text', text: 'p' }],
        },
      });

      expect(result.error?.message).toContain('401');
      expect(result.data).toBeUndefined();
      const call = (fetchMock as jest.Mock).mock.calls[0];
      expect(call[1].headers.Authorization).toBeUndefined();
    });
  });
});
