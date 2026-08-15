import { AiService } from '../../src/ai/ai.service';

/**
 * Fake AiService for 5.25 AI Services e2e tests. Returns deterministic data
 * based on the TASK marker in the prompt so each endpoint gets a valid response.
 */
export class FakeAiEndpointService extends AiService {
  override async generateStructured<T>(request: {
    system: string;
    prompt: string;
    schema: { parse: (data: unknown) => T };
  }): Promise<T> {
    const prompt = request.prompt;

    if (prompt.includes('TASK: tutor_answer')) {
      return request.schema.parse({
        answer:
          'Recursion is a technique where a function calls itself to solve smaller instances of the same problem.',
        relatedTopics: ['Stack', 'Divide and Conquer', 'Dynamic Programming'],
        followUpQuestions: ['What is tail recursion?', 'How does the call stack work?'],
      });
    }

    if (prompt.includes('TASK: solve_doubt')) {
      return request.schema.parse({
        explanation: 'The issue is that your algorithm has unnecessary nested loops.',
        correctedApproach: 'Use a hash map to achieve O(n) lookup instead of O(n²).',
        keyInsights: ['Hash maps provide constant-time lookups', 'Avoid redundant iterations'],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      });
    }

    if (prompt.includes('TASK: code_review')) {
      return request.schema.parse({
        overallAssessment:
          'The code is functional but could benefit from performance improvements.',
        issues: [
          {
            severity: 'performance',
            line: '3-7',
            message: 'Nested loops cause O(n²) complexity',
            suggestion: 'Use a hash map for O(n) lookup',
          },
        ],
        timeComplexity: 'O(n²)',
        spaceComplexity: 'O(1)',
        strengths: ['Clear variable naming', 'Proper error handling'],
        improvedCode: 'function optimized(arr) { const map = new Map(); ... }',
      });
    }

    if (prompt.includes('TASK: resume_analysis')) {
      return request.schema.parse({
        summary: 'Solid technical resume with good project experience.',
        strengths: ['Strong project section', 'Relevant skills listed'],
        weaknesses: ['Missing quantified achievements', 'No summary section'],
        suggestions: ['Add metrics to project descriptions', 'Write a professional summary'],
        atsScoreEstimate: 68,
      });
    }

    if (prompt.includes('TASK: interview_evaluation')) {
      return request.schema.parse({
        score: 75,
        feedback: 'Good structure but could provide more specific examples.',
        strengths: ['Clear communication', 'Relevant experience mentioned'],
        improvements: [
          'Use the STAR method more consistently',
          'Provide more quantifiable results',
        ],
        modelAnswer:
          'In my previous project, I led a team of 3 to build a REST API that reduced response time by 40%.',
      });
    }

    if (prompt.includes('TASK: generate_questions')) {
      return request.schema.parse({
        questions: [
          {
            question: 'What is the time complexity of binary search?',
            answer: 'O(log n)',
            explanation: 'Binary search halves the search space with each step.',
            difficulty: 'easy',
          },
          {
            question: 'Explain the difference between a stack and a queue.',
            answer: 'A stack is LIFO, a queue is FIFO.',
            explanation:
              'Stacks add/remove from the top, queues add to rear and remove from front.',
            difficulty: 'easy',
          },
          {
            question: 'How does dynamic programming differ from recursion?',
            answer: 'DP stores subproblem results to avoid recomputation.',
            explanation: 'Recursion without memoization recomputes the same subproblems.',
            difficulty: 'medium',
          },
          {
            question: 'What is a deadlock in operating systems?',
            answer: 'A state where processes are stuck waiting for each other.',
            explanation:
              'Deadlock requires four conditions: mutual exclusion, hold-and-wait, no preemption, circular wait.',
            difficulty: 'medium',
          },
          {
            question: 'Explain the CAP theorem.',
            answer:
              'A distributed system can provide at most two of: consistency, availability, partition tolerance.',
            explanation:
              'In practice, partition tolerance is required, so the choice is between CP and AP systems.',
            difficulty: 'hard',
          },
        ],
      });
    }

    if (prompt.includes('TASK: study_plan')) {
      return request.schema.parse({
        title: 'Full Stack Developer Study Plan',
        overview: 'A structured plan covering frontend, backend, and database skills.',
        weeks: [
          {
            week: 1,
            theme: 'HTML/CSS/JS Fundamentals',
            goals: ['Master basics'],
            activities: ['Build landing page'],
          },
          {
            week: 2,
            theme: 'React Fundamentals',
            goals: ['Components, hooks'],
            activities: ['Build todo app'],
          },
          {
            week: 3,
            theme: 'Node.js & Express',
            goals: ['REST APIs'],
            activities: ['Build CRUD API'],
          },
          {
            week: 4,
            theme: 'PostgreSQL & Deployment',
            goals: ['Database design'],
            activities: ['Deploy full stack app'],
          },
        ],
      });
    }

    // Fallback — should not happen in tests
    return request.schema.parse({ answer: 'Fallback response' } as T);
  }
}
