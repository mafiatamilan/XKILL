import {
  buildTutorPrompt,
  tutorAnswerSchema,
  buildDoubtSolverPrompt,
  doubtSolutionSchema,
  buildCodeReviewPrompt,
  codeReviewResultSchema,
  buildResumeAnalyzerPrompt,
  resumeAnalyzerResultSchema,
  buildInterviewEvaluationPrompt,
  interviewEvaluationResultSchema,
  buildQuestionGeneratorPrompt,
  questionGeneratorResultSchema,
  buildAiStudyPlanPrompt,
  aiStudyPlanResultSchema,
} from './ai-prompts';

describe('AI Prompts', () => {
  describe('buildTutorPrompt', () => {
    it('includes question and topic in prompt', () => {
      const result = buildTutorPrompt({
        question: 'What is recursion?',
        topic: 'Recursion',
      });
      expect(result.system).toContain('tutor');
      expect(result.prompt).toContain('What is recursion?');
      expect(result.prompt).toContain('Topic area: Recursion');
    });

    it('includes context when provided', () => {
      const result = buildTutorPrompt({
        question: 'Why is my code slow?',
        context: 'I am new to algorithms.',
      });
      expect(result.prompt).toContain('Student context: I am new to algorithms.');
    });

    it('works without optional fields', () => {
      const result = buildTutorPrompt({ question: 'Explain polymorphism.' });
      expect(result.prompt).toContain('Explain polymorphism.');
      expect(result.prompt).not.toContain('Topic area:');
      expect(result.prompt).not.toContain('Student context:');
    });
  });

  describe('tutorAnswerSchema', () => {
    it('validates a correct response', () => {
      const data = {
        answer: 'Recursion is when a function calls itself.',
        relatedTopics: ['Stack', 'Divide and Conquer'],
        followUpQuestions: ['What is tail recursion?'],
      };
      expect(tutorAnswerSchema.parse(data)).toEqual(data);
    });

    it('defaults empty arrays', () => {
      const data = { answer: 'Yes.' };
      const result = tutorAnswerSchema.parse(data);
      expect(result.relatedTopics).toEqual([]);
      expect(result.followUpQuestions).toEqual([]);
    });
  });

  describe('buildDoubtSolverPrompt', () => {
    it('includes doubt and code snippet', () => {
      const result = buildDoubtSolverPrompt({
        doubt: 'My function returns wrong output',
        codeSnippet: 'function f() { return 1; }',
      });
      expect(result.prompt).toContain('My function returns wrong output');
      expect(result.prompt).toContain('function f() { return 1; }');
    });

    it('includes topic when provided', () => {
      const result = buildDoubtSolverPrompt({
        doubt: "I don't understand this",
        topic: 'Arrays',
      });
      expect(result.prompt).toContain('Topic: Arrays');
    });
  });

  describe('doubtSolutionSchema', () => {
    it('validates a correct response', () => {
      const data = {
        explanation: 'The issue is...',
        correctedApproach: 'Use a hash map.',
        keyInsights: ['Hash maps have O(1) lookup'],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
      };
      expect(doubtSolutionSchema.parse(data)).toEqual(data);
    });
  });

  describe('buildCodeReviewPrompt', () => {
    it('includes code and language', () => {
      const result = buildCodeReviewPrompt({
        code: 'const x = 1;',
        language: 'javascript',
      });
      expect(result.prompt).toContain('const x = 1;');
      expect(result.prompt).toContain('Language: javascript');
    });

    it('includes focus when provided', () => {
      const result = buildCodeReviewPrompt({
        code: 'x = 1',
        language: 'python',
        focus: 'security',
      });
      expect(result.prompt).toContain('Review focus: security');
    });
  });

  describe('codeReviewResultSchema', () => {
    it('validates a correct response', () => {
      const data = {
        overallAssessment: 'Code looks good overall.',
        issues: [
          {
            severity: 'performance',
            line: '3',
            message: 'Unnecessary loop',
            suggestion: 'Use array method',
          },
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        strengths: ['Clear variable names'],
        improvedCode: 'const x = arr.filter(...)',
      };
      expect(codeReviewResultSchema.parse(data)).toEqual(data);
    });

    it('defaults empty issues and strengths', () => {
      const data = {
        overallAssessment: 'Good.',
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
        improvedCode: '// no change',
      };
      const result = codeReviewResultSchema.parse(data);
      expect(result.issues).toEqual([]);
      expect(result.strengths).toEqual([]);
    });
  });

  describe('buildResumeAnalyzerPrompt', () => {
    it('includes resume text', () => {
      const result = buildResumeAnalyzerPrompt({
        resumeText: 'John Doe\nSoftware Engineer',
      });
      expect(result.prompt).toContain('John Doe\nSoftware Engineer');
    });

    it('includes target role when provided', () => {
      const result = buildResumeAnalyzerPrompt({
        resumeText: 'resume text',
        targetRole: 'Backend Developer',
      });
      expect(result.prompt).toContain('Target role: Backend Developer');
    });
  });

  describe('resumeAnalyzerResultSchema', () => {
    it('validates a correct response', () => {
      const data = {
        summary: 'Strong technical background.',
        strengths: ['Good experience'],
        weaknesses: ['No metrics'],
        suggestions: ['Add numbers'],
        atsScoreEstimate: 75,
      };
      expect(resumeAnalyzerResultSchema.parse(data)).toEqual(data);
    });
  });

  describe('buildInterviewEvaluationPrompt', () => {
    it('includes question, answer, and type', () => {
      const result = buildInterviewEvaluationPrompt({
        question: 'Tell me about yourself',
        answer: 'I am a developer...',
        interviewType: 'hr',
      });
      expect(result.prompt).toContain('Tell me about yourself');
      expect(result.prompt).toContain('I am a developer...');
      expect(result.prompt).toContain('Interview type: hr');
    });
  });

  describe('interviewEvaluationResultSchema', () => {
    it('validates a correct response', () => {
      const data = {
        score: 80,
        feedback: 'Good communication.',
        strengths: ['Clear'],
        improvements: ['More detail'],
        modelAnswer: 'I am a developer with 2 years...',
      };
      expect(interviewEvaluationResultSchema.parse(data)).toEqual(data);
    });
  });

  describe('buildQuestionGeneratorPrompt', () => {
    it('includes topic, difficulty, and count', () => {
      const result = buildQuestionGeneratorPrompt({
        topic: 'Dynamic Programming',
        difficulty: 'medium',
        count: 5,
      });
      expect(result.prompt).toContain('Dynamic Programming');
      expect(result.prompt).toContain('medium');
      expect(result.prompt).toContain('5');
    });

    it('includes category when provided', () => {
      const result = buildQuestionGeneratorPrompt({
        topic: 'Arrays',
        difficulty: 'easy',
        count: 3,
        category: 'dsa',
      });
      expect(result.prompt).toContain('Category: dsa');
    });
  });

  describe('questionGeneratorResultSchema', () => {
    it('validates a correct response', () => {
      const data = {
        questions: [
          {
            question: 'What is a linked list?',
            answer: 'A data structure...',
            explanation: 'It consists of nodes...',
            difficulty: 'easy',
          },
        ],
      };
      expect(questionGeneratorResultSchema.parse(data)).toEqual(data);
    });

    it('rejects empty questions array', () => {
      const data = { questions: [] };
      expect(() => questionGeneratorResultSchema.parse(data)).toThrow();
    });
  });

  describe('buildAiStudyPlanPrompt', () => {
    it('includes target role and week count', () => {
      const result = buildAiStudyPlanPrompt({
        targetRole: 'Full Stack Developer',
        weeks: 6,
      });
      expect(result.prompt).toContain('Full Stack Developer');
      expect(result.prompt).toContain('6 weeks');
    });

    it('includes skills when provided', () => {
      const result = buildAiStudyPlanPrompt({
        targetRole: 'Backend Dev',
        targetSkills: ['Node.js', 'PostgreSQL'],
      });
      expect(result.prompt).toContain('Node.js, PostgreSQL');
    });

    it('includes hours per week when provided', () => {
      const result = buildAiStudyPlanPrompt({
        targetRole: 'Frontend Dev',
        hoursPerWeek: 15,
      });
      expect(result.prompt).toContain('15');
    });
  });

  describe('aiStudyPlanResultSchema', () => {
    it('validates a correct response', () => {
      const data = {
        title: 'Full Stack Plan',
        overview: 'A 4-week plan.',
        weeks: [
          {
            week: 1,
            theme: 'Fundamentals',
            goals: ['Learn basics'],
            activities: ['Read docs', 'Practice'],
          },
        ],
      };
      expect(aiStudyPlanResultSchema.parse(data)).toEqual(data);
    });

    it('rejects empty weeks', () => {
      const data = {
        title: 'Plan',
        overview: 'Overview',
        weeks: [],
      };
      expect(() => aiStudyPlanResultSchema.parse(data)).toThrow();
    });
  });
});
