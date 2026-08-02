import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * Judge0 status ids → XKILL verdicts.
 *
 * Judge0 has no dedicated Memory Limit Exceeded status; in self-hosted CE it
 * reports memory-limit kills under status 15. Everything else maps to a verdict
 * the DSA platform exposes to students.
 */
export const JUDGE0_VERDICT_BY_STATUS: Record<number, string> = {
  3: 'accepted',
  4: 'wrong_answer',
  5: 'time_limit_exceeded',
  6: 'compilation_error',
  7: 'runtime_error',
  8: 'runtime_error',
  9: 'runtime_error',
  10: 'runtime_error',
  11: 'runtime_error',
  12: 'runtime_error',
  13: 'runtime_error',
  14: 'runtime_error',
  15: 'memory_limit_exceeded',
};

export type JudgeVerdict =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error';

export interface JudgeTestCase {
  stdin: string;
  expectedOutput: string;
}

export interface JudgeCaseResult {
  /** 0-based index of the test case. */
  index: number;
  verdict: JudgeVerdict;
  timeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
}

export interface JudgeGradeResult {
  /** Aggregated verdict — Accepted only if every case passed. */
  verdict: JudgeVerdict;
  passed: number;
  total: number;
  /** First failing case (0-based) and its verdict, when not fully accepted. */
  failedCaseIndex?: number;
  failedCaseVerdict?: JudgeVerdict;
  results: JudgeCaseResult[];
}

export interface JudgeRunResult {
  verdict: JudgeVerdict;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
}

interface Judge0Submission {
  token: string;
  stdout?: string | null;
  stderr?: string | null;
  time?: number | null;
  memory?: number | null;
  status?: { id: number; description: string } | null;
}

const PENDING_STATUS_IDS = new Set([1, 2]);

/**
 * Client for the self-hosted Judge0 API. Every DSA/lab submission goes through
 * this service — controllers never talk to Judge0 directly. Grade-time behaviour:
 *   - run(): one submission against custom stdin, no expected output (ephemeral).
 *   - grade(): submits the program once per test case, waits for every token,
 *     then aggregates a single verdict (Accepted only if all cases pass) with
 *     the first failing case reported.
 */
@Injectable()
export class JudgeService {
  private readonly logger = new Logger(JudgeService.name);
  private readonly baseUrl: string;
  private readonly authToken: string;
  private readonly pollIntervalMs: number;
  private readonly gradeTimeoutMs: number;

  constructor(config: AppConfigService) {
    this.baseUrl = config.get().judge0BaseUrl.replace(/\/$/, '');
    this.authToken = config.get().judge0AuthToken;
    this.pollIntervalMs = config.get().judge0PollIntervalMs;
    this.gradeTimeoutMs = config.get().judge0GradeTimeoutMs;
  }

  /** Run a program against custom stdin; no expected output, nothing persisted. */
  async run(input: {
    sourceCode: string;
    languageId: number;
    stdin: string;
    timeLimitMs: number;
    memoryLimitMb: number;
  }): Promise<JudgeRunResult> {
    const token = await this.createSubmission({
      source_code: input.sourceCode,
      language_id: input.languageId,
      stdin: input.stdin,
      cpu_time_limit: input.timeLimitMs / 1000,
      memory_limit: input.memoryLimitMb * 1024,
    });
    const result = await this.waitForSubmission(token);
    return {
      verdict: this.mapVerdict(result.status?.id ?? 0),
      stdout: result.stdout ?? undefined,
      stderr: result.stderr ?? undefined,
      timeMs: result.time ?? undefined,
      memoryKb: result.memory ?? undefined,
    };
  }

  /** Grade a program against one or more hidden test cases, aggregated. */
  async grade(input: {
    sourceCode: string;
    languageId: number;
    testCases: JudgeTestCase[];
    timeLimitMs: number;
    memoryLimitMb: number;
  }): Promise<JudgeGradeResult> {
    const tokens = await this.createBatchSubmissions(
      input.testCases.map((testCase) => ({
        source_code: input.sourceCode,
        language_id: input.languageId,
        stdin: testCase.stdin,
        expected_output: testCase.expectedOutput,
        cpu_time_limit: input.timeLimitMs / 1000,
        memory_limit: input.memoryLimitMb * 1024,
      })),
    );
    const results = await this.waitForSubmissions(tokens);
    const cases: JudgeCaseResult[] = results.map((result, index) => ({
      index,
      verdict: this.mapVerdict(result.status?.id ?? 0),
      timeMs: result.time ?? undefined,
      memoryKb: result.memory ?? undefined,
      stdout: result.stdout ?? undefined,
      stderr: result.stderr ?? undefined,
    }));

    const passed = cases.filter((testCase) => testCase.verdict === 'accepted').length;
    const firstFailure = cases.find((testCase) => testCase.verdict !== 'accepted');

    return {
      verdict: firstFailure ? firstFailure.verdict : 'accepted',
      passed,
      total: cases.length,
      failedCaseIndex: firstFailure?.index,
      failedCaseVerdict: firstFailure?.verdict,
      results: cases,
    };
  }

  // ---- Judge0 HTTP helpers ----

  private async createSubmission(payload: Record<string, unknown>): Promise<string> {
    const body = await this.post<{ token: string }>('/submissions?wait=false', payload);
    return body.token;
  }

  private async createBatchSubmissions(payload: Array<Record<string, unknown>>): Promise<string[]> {
    const body = await this.post<{ submissions: Array<{ token: string }> }>('/submissions/batch', {
      submissions: payload,
    });
    return body.submissions.map((submission) => submission.token);
  }

  private async waitForSubmission(token: string): Promise<Judge0Submission> {
    const deadline = Date.now() + this.gradeTimeoutMs;
    for (;;) {
      const submission = await this.get<Judge0Submission>(`/submissions/${token}`);
      if (!PENDING_STATUS_IDS.has(submission.status?.id ?? 0)) {
        return submission;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Judge0 submission timed out after ${this.gradeTimeoutMs}ms`);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  private async waitForSubmissions(tokens: string[]): Promise<Judge0Submission[]> {
    const deadline = Date.now() + this.gradeTimeoutMs;
    const results = new Map<string, Judge0Submission | undefined>(
      tokens.map((token) => [token, undefined]),
    );
    for (;;) {
      const pending: string[] = [];
      for (const token of tokens) {
        const submission = results.get(token);
        if (!submission || PENDING_STATUS_IDS.has(submission.status?.id ?? 0)) {
          pending.push(token);
        }
      }
      if (pending.length === 0) {
        return tokens.map((token) => results.get(token) as Judge0Submission);
      }
      if (Date.now() >= deadline) {
        throw new Error(`Judge0 batch grading timed out after ${this.gradeTimeoutMs}ms`);
      }
      await Promise.all(
        pending.map(async (token) => {
          results.set(token, await this.get<Judge0Submission>(`/submissions/${token}`));
        }),
      );
      await this.sleep(this.pollIntervalMs);
    }
  }

  private mapVerdict(statusId: number): JudgeVerdict {
    return (JUDGE0_VERDICT_BY_STATUS[statusId] ?? 'runtime_error') as JudgeVerdict;
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Judge0 POST ${path} failed: ${response.status} ${text}`);
      throw new Error(`Judge0 request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Judge0 GET ${path} failed: ${response.status} ${text}`);
      throw new Error(`Judge0 request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['X-Auth-Token'] = this.authToken;
    }
    return headers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
