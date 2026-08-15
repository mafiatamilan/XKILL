import { Body, Controller, Post, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { AiService, AiServiceError } from './ai.service';
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
import {
  TutorAskDto,
  DoubtSolverDto,
  CodeReviewDto,
  ResumeAnalyzerDto,
  InterviewEvaluatorDto,
  QuestionGeneratorDto,
  AiStudyPlannerDto,
} from './dto/ai.dto';

@ApiTags('AI Services')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('tutor/ask')
  @Roles('student')
  @Resource('ai-tutor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask an AI tutor a CS question' })
  @ApiResponse({ status: 200, description: 'Tutor answer returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async tutorAsk(@Body() dto: TutorAskDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({ ...buildTutorPrompt(dto), schema: tutorAnswerSchema }),
    );
  }

  @Post('doubt-solver')
  @Roles('student')
  @Resource('ai-doubt-solver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get help solving a coding doubt' })
  @ApiResponse({ status: 200, description: 'Doubt solution returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async doubtSolver(@Body() dto: DoubtSolverDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({ ...buildDoubtSolverPrompt(dto), schema: doubtSolutionSchema }),
    );
  }

  @Post('code-review')
  @Roles('student')
  @Resource('ai-code-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI code review' })
  @ApiResponse({ status: 200, description: 'Code review returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async codeReview(@Body() dto: CodeReviewDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({ ...buildCodeReviewPrompt(dto), schema: codeReviewResultSchema }),
    );
  }

  @Post('resume-analyzer')
  @Roles('student')
  @Resource('ai-resume-analyzer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI resume analysis' })
  @ApiResponse({ status: 200, description: 'Resume analysis returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async resumeAnalyzer(@Body() dto: ResumeAnalyzerDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({
        ...buildResumeAnalyzerPrompt(dto),
        schema: resumeAnalyzerResultSchema,
      }),
    );
  }

  @Post('interview-evaluator')
  @Roles('student')
  @Resource('ai-interview-evaluator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate an interview answer' })
  @ApiResponse({ status: 200, description: 'Interview evaluation returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async interviewEvaluator(@Body() dto: InterviewEvaluatorDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({
        ...buildInterviewEvaluationPrompt(dto),
        schema: interviewEvaluationResultSchema,
      }),
    );
  }

  @Post('question-generator')
  @Roles('student')
  @Resource('ai-question-generator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate practice questions on a topic' })
  @ApiResponse({ status: 200, description: 'Questions generated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async questionGenerator(@Body() dto: QuestionGeneratorDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({
        ...buildQuestionGeneratorPrompt(dto),
        schema: questionGeneratorResultSchema,
      }),
    );
  }

  @Post('study-planner')
  @Roles('student')
  @Resource('ai-study-planner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a study plan for a target role' })
  @ApiResponse({ status: 200, description: 'Study plan generated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async studyPlanner(@Body() dto: AiStudyPlannerDto) {
    return this.wrapAiCall(() =>
      this.ai.generateStructured({
        ...buildAiStudyPlanPrompt(dto),
        schema: aiStudyPlanResultSchema,
      }),
    );
  }

  private async wrapAiCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AiServiceError) {
        throw new BadRequestException({
          statusCode: 502,
          error: 'AI Service Error',
          message: err.message,
          code: err.code,
        });
      }
      throw err;
    }
  }
}
