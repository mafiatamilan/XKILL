import { Injectable } from '@nestjs/common';
import { JudgeGradeResult, JudgeRunResult, JudgeTestCase } from '../../src/judge/judge.service';

type Verdict =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error';

const MARKERS: Array<[string, Verdict]> = [
  ['// WA', 'wrong_answer'],
  ['// TLE', 'time_limit_exceeded'],
  ['// MLE', 'memory_limit_exceeded'],
  ['// RE', 'runtime_error'],
  ['// CE', 'compilation_error'],
];

/**
 * In-memory stand-in for Judge0 used only in e2e tests. The verdict is derived
 * from a comment marker in the source code so suites can exercise every branch
 * (Accepted/WA/TLE/MLE/RE/CE) without a real judge.
 */
@Injectable()
export class FakeJudgeService {
  async run(input: { sourceCode: string; stdin: string }): Promise<JudgeRunResult> {
    return { verdict: this.verdictFor(input.sourceCode) };
  }

  async grade(input: {
    sourceCode: string;
    testCases: JudgeTestCase[];
  }): Promise<JudgeGradeResult> {
    const verdict = this.verdictFor(input.sourceCode);
    const total = input.testCases.length;
    const passed = verdict === 'accepted' ? total : 0;
    return {
      verdict,
      passed,
      total,
      failedCaseIndex: verdict === 'accepted' ? undefined : 0,
      failedCaseVerdict: verdict === 'accepted' ? undefined : verdict,
      results: input.testCases.map((testCase, index) => ({
        index,
        verdict,
        timeMs: 10,
        memoryKb: 1024,
      })),
    };
  }

  private verdictFor(sourceCode: string): Verdict {
    for (const [marker, verdict] of MARKERS) {
      if (sourceCode.includes(marker)) {
        return verdict;
      }
    }
    return 'accepted';
  }
}
