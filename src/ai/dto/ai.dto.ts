import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  IsIn,
  Min,
  Max,
  IsInt,
} from 'class-validator';

// ── Tutor Ask ──

export class TutorAskDto {
  @ApiProperty({ example: 'Explain the difference between DFS and BFS traversal.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;

  @ApiPropertyOptional({ example: 'Graph algorithms' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({
    example: 'I understand basic recursion but get confused with backtracking.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;
}

export class TutorAnswerDto {
  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: [String] })
  relatedTopics!: string[];

  @ApiProperty({ type: [String] })
  followUpQuestions!: string[];
}

// ── Doubt Solver ──

export class DoubtSolverDto {
  @ApiProperty({ example: 'I keep getting TLE on the two-sum problem with my O(n²) approach.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  doubt!: string;

  @ApiPropertyOptional({ example: 'Two Sum, Arrays' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @ApiPropertyOptional({ example: 'function twoSum(nums, target) { ... }' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  codeSnippet?: string;
}

export class DoubtSolutionDto {
  @ApiProperty()
  explanation!: string;

  @ApiProperty()
  correctedApproach!: string;

  @ApiProperty({ type: [String] })
  keyInsights!: string[];

  @ApiProperty()
  timeComplexity!: string;

  @ApiProperty()
  spaceComplexity!: string;
}

// ── Code Review ──

export class CodeReviewDto {
  @ApiProperty({ example: 'function mergeSort(arr) { ... }' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16000)
  code!: string;

  @ApiProperty({ example: 'javascript' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language!: string;

  @ApiPropertyOptional({ example: 'Review for time complexity and edge cases.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  focus?: string;
}

export class CodeReviewIssueDto {
  @ApiProperty({ enum: ['bug', 'performance', 'readability', 'security', 'best-practice'] })
  severity!: string;

  @ApiProperty()
  line!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  suggestion!: string;
}

export class CodeReviewResultDto {
  @ApiProperty()
  overallAssessment!: string;

  @ApiProperty({ type: [CodeReviewIssueDto] })
  issues!: CodeReviewIssueDto[];

  @ApiProperty()
  timeComplexity!: string;

  @ApiProperty()
  spaceComplexity!: string;

  @ApiProperty({ type: [String] })
  strengths!: string[];

  @ApiProperty()
  improvedCode!: string;
}

// ── Resume Analyzer ──

export class ResumeAnalyzerDto {
  @ApiProperty({ example: 'John Doe\nSoftware Engineer\nSkills: JavaScript, React, Node.js...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16000)
  resumeText!: string;

  @ApiPropertyOptional({ example: 'Backend Developer at a product company' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  targetRole?: string;
}

export class ResumeAnalyzerResultDto {
  @ApiProperty()
  summary!: string;

  @ApiProperty({ type: [String] })
  strengths!: string[];

  @ApiProperty({ type: [String] })
  weaknesses!: string[];

  @ApiProperty({ type: [String] })
  suggestions!: string[];

  @ApiProperty({ example: 72 })
  atsScoreEstimate!: number;
}

// ── Interview Evaluator ──

export class InterviewEvaluatorDto {
  @ApiProperty({ example: 'Tell me about a time you handled a conflict in a team.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;

  @ApiProperty({
    example: 'I once had a disagreement with a teammate about the database schema...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  answer!: string;

  @ApiProperty({ enum: ['hr', 'technical', 'dsa', 'system-design'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['hr', 'technical', 'dsa', 'system-design'])
  interviewType!: string;
}

export class InterviewEvaluationResultDto {
  @ApiProperty({ example: 75 })
  score!: number;

  @ApiProperty()
  feedback!: string;

  @ApiProperty({ type: [String] })
  strengths!: string[];

  @ApiProperty({ type: [String] })
  improvements!: string[];

  @ApiProperty()
  modelAnswer!: string;
}

// ── Question Generator ──

export class QuestionGeneratorDto {
  @ApiProperty({ example: 'Dynamic Programming' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  topic!: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard', 'mixed'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['easy', 'medium', 'hard', 'mixed'])
  difficulty!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  count!: number;

  @ApiPropertyOptional({ example: 'dsa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class GeneratedQuestionDto {
  @ApiProperty()
  question!: string;

  @ApiProperty()
  answer!: string;

  @ApiProperty()
  explanation!: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty!: string;
}

export class QuestionGeneratorResultDto {
  @ApiProperty({ type: [GeneratedQuestionDto] })
  questions!: GeneratedQuestionDto[];
}

// ── Study Planner ──

export class AiStudyPlannerDto {
  @ApiProperty({ example: 'Full Stack Development' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  targetRole!: string;

  @ApiPropertyOptional({ example: ['React', 'Node.js', 'PostgreSQL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSkills?: string[];

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  weeks?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  hoursPerWeek?: number;
}

export class StudyPlanWeekDto {
  @ApiProperty()
  week!: number;

  @ApiProperty()
  theme!: string;

  @ApiProperty({ type: [String] })
  goals!: string[];

  @ApiProperty({ type: [String] })
  activities!: string[];
}

export class AiStudyPlannerResultDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  overview!: string;

  @ApiProperty({ type: [StudyPlanWeekDto] })
  weeks!: StudyPlanWeekDto[];
}
