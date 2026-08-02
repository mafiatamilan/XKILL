import { JudgeService, JUDGE0_VERDICT_BY_STATUS } from './judge.service';
import { mockConfig } from '../testing/mocks';

describe('JudgeService', () => {
  const config = () =>
    mockConfig({
      judge0BaseUrl: 'http://judge0',
      judge0PollIntervalMs: 5,
      judge0GradeTimeoutMs: 200,
    });

  let fetchMock: jest.Mock;
  let service: JudgeService;

  const judge0Response = (overrides: Record<string, unknown>) => ({
    token: 'tok-1',
    stdout: null,
    stderr: null,
    time: 0.01,
    memory: 256,
    status: { id: 3, description: 'Accepted' },
    ...overrides,
  });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new JudgeService(config());
  });

  const mockPostToken = (token: string) =>
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token }) });
  const mockBatchTokens = (tokens: string[]) =>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ submissions: tokens.map((token) => ({ token })) }),
    });
  const mockGetSubmission = (submission: Record<string, unknown>) =>
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => submission });

  const gradeRequest = () => ({
    sourceCode: 'print(input())',
    languageId: 71,
    testCases: [
      { stdin: '2\n3\n', expectedOutput: '5\n' },
      { stdin: '10\n20\n', expectedOutput: '30\n' },
    ],
    timeLimitMs: 1000,
    memoryLimitMb: 256,
  });

  it('returns accepted when every test case passes', async () => {
    mockBatchTokens(['t1', 't2']);
    mockGetSubmission(judge0Response({ token: 't1' }));
    mockGetSubmission(judge0Response({ token: 't2' }));

    const result = await service.grade(gradeRequest());
    expect(result).toEqual({
      verdict: 'accepted',
      passed: 2,
      total: 2,
      failedCaseIndex: undefined,
      failedCaseVerdict: undefined,
      results: [
        { index: 0, verdict: 'accepted', timeMs: 0.01, memoryKb: 256 },
        { index: 1, verdict: 'accepted', timeMs: 0.01, memoryKb: 256 },
      ],
    });
  });

  it('reports wrong_answer on the first failing case', async () => {
    mockBatchTokens(['t1', 't2']);
    mockGetSubmission(
      judge0Response({ token: 't1', status: { id: 4, description: 'Wrong Answer' } }),
    );
    mockGetSubmission(judge0Response({ token: 't2' }));

    const result = await service.grade(gradeRequest());
    expect(result.verdict).toBe('wrong_answer');
    expect(result.passed).toBe(1);
    expect(result.failedCaseIndex).toBe(0);
    expect(result.failedCaseVerdict).toBe('wrong_answer');
  });

  it('reports time_limit_exceeded', async () => {
    mockBatchTokens(['t1']);
    mockGetSubmission(judge0Response({ status: { id: 5, description: 'Time Limit Exceeded' } }));

    const result = await service.grade({
      ...gradeRequest(),
      testCases: [{ stdin: '1\n', expectedOutput: '1\n' }],
    });
    expect(result.verdict).toBe('time_limit_exceeded');
    expect(result.failedCaseIndex).toBe(0);
  });

  it('reports memory_limit_exceeded from judge status 15', async () => {
    expect(JUDGE0_VERDICT_BY_STATUS[15]).toBe('memory_limit_exceeded');
    mockBatchTokens(['t1']);
    mockGetSubmission(judge0Response({ status: { id: 15, description: 'Memory Limit Exceeded' } }));

    const result = await service.grade({
      ...gradeRequest(),
      testCases: [{ stdin: '1\n', expectedOutput: '1\n' }],
    });
    expect(result.verdict).toBe('memory_limit_exceeded');
  });

  it('reports runtime_error', async () => {
    mockBatchTokens(['t1']);
    mockGetSubmission(
      judge0Response({
        status: { id: 7, description: 'Runtime Error (SIGSEGV)' },
        stderr: 'Segmentation fault',
      }),
    );

    const result = await service.grade({
      ...gradeRequest(),
      testCases: [{ stdin: '1\n', expectedOutput: '1\n' }],
    });
    expect(result.verdict).toBe('runtime_error');
    expect(result.results[0].stderr).toBe('Segmentation fault');
  });

  it('reports compilation_error and returns the compiler output', async () => {
    mockBatchTokens(['t1']);
    mockGetSubmission(
      judge0Response({
        status: { id: 6, description: 'Compilation Error' },
        stderr: 'error: expected ;',
      }),
    );

    const result = await service.grade({
      ...gradeRequest(),
      testCases: [{ stdin: '1\n', expectedOutput: '1\n' }],
    });
    expect(result.verdict).toBe('compilation_error');
  });

  it('polls while judge0 reports in-queue/processing', async () => {
    mockBatchTokens(['t1']);
    mockGetSubmission(judge0Response({ status: { id: 1, description: 'In Queue' } }));
    mockGetSubmission(judge0Response({ status: { id: 2, description: 'Processing' } }));
    mockGetSubmission(judge0Response({}));

    const result = await service.grade({
      ...gradeRequest(),
      testCases: [{ stdin: '1\n', expectedOutput: '1\n' }],
    });
    expect(result.verdict).toBe('accepted');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws when grading times out', async () => {
    mockBatchTokens(['t1']);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => judge0Response({ status: { id: 1, description: 'In Queue' } }),
    });

    await expect(service.grade(gradeRequest())).rejects.toThrow(/timed out/);
  });

  it('surfaces judge0 http failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });

    await expect(
      service.grade({ ...gradeRequest(), testCases: [{ stdin: '', expectedOutput: '' }] }),
    ).rejects.toThrow('Judge0 request failed (500)');
  });

  describe('run()', () => {
    it('submits custom stdin without expected output and returns the run result', async () => {
      mockPostToken('rt-1');
      mockGetSubmission(
        judge0Response({ stdout: 'hello\n', status: { id: 3, description: 'Accepted' } }),
      );

      const result = await service.run({
        sourceCode: 'print("hello")',
        languageId: 71,
        stdin: '',
        timeLimitMs: 1000,
        memoryLimitMb: 256,
      });

      expect(result).toEqual({
        verdict: 'accepted',
        stdout: 'hello\n',
        timeMs: 0.01,
        memoryKb: 256,
      });
      const createCall = fetchMock.mock.calls[0];
      expect(createCall[0]).toBe('http://judge0/submissions?wait=false');
      expect(JSON.parse(createCall[1].body)).toMatchObject({
        source_code: 'print("hello")',
        language_id: 71,
        stdin: '',
      });
      expect(createCall[1].body).not.toContain('expected_output');
    });
  });

  it('sends the auth token header when configured', () => {
    service = new JudgeService(
      mockConfig({ judge0BaseUrl: 'http://judge0', judge0AuthToken: 'secret' }),
    );
    mockPostToken('rt-1');
    mockGetSubmission(judge0Response({ status: { id: 3 } }));

    void service
      .run({ sourceCode: '', languageId: 71, stdin: '', timeLimitMs: 1000, memoryLimitMb: 256 })
      .then(() => {
        const headers = (
          fetchMock.mock.calls[0] as unknown as { 1: { headers: Record<string, string> } }
        )[1].headers;
        expect(headers['X-Auth-Token']).toBe('secret');
      });
  });
});
