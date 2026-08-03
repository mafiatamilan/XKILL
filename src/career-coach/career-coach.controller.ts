import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { CareerCoachService } from './career-coach.service';
import { CareerCoachChatDto, CareerCoachListQueryDto } from './dto/career-coach.dto';

@ApiTags('career-coach')
@ApiBearerAuth()
@Roles('student')
@Controller('career-coach')
export class CareerCoachController {
  constructor(private readonly careerCoach: CareerCoachService) {}

  @Get('roadmap')
  @Resource('career-coach-roadmap')
  @ApiOperation({
    summary:
      'Get the long-horizon career roadmap (phases over months-years) anchored on the active career goal.',
  })
  getRoadmap(@CurrentUser() user: AuthenticatedUser) {
    return this.careerCoach.getRoadmap(user.id);
  }

  @Get('recommendations')
  @Resource('career-coach-recommendations')
  @ApiOperation({
    summary: 'Get learning recommendations that close the skill gap for the target role.',
  })
  getRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.careerCoach.getRecommendations(user.id);
  }

  @Get('salary-prediction')
  @Resource('career-coach-salary')
  @ApiOperation({
    summary:
      'Get a personalized, explicitly-estimated salary range for the target role at target companies.',
  })
  getSalaryPrediction(@CurrentUser() user: AuthenticatedUser) {
    return this.careerCoach.getSalaryPrediction(user.id);
  }

  @Get('skill-gap')
  @Resource('career-coach-skill-gap')
  @ApiOperation({
    summary: 'Get the deterministic skill-gap analysis vs the target role.',
  })
  getSkillGap(@CurrentUser() user: AuthenticatedUser) {
    return this.careerCoach.getSkillGap(user.id);
  }

  @Post('chat')
  @Resource('career-coach-chat')
  @ApiOperation({
    summary:
      'Send a message to the AI career coach and receive a coaching reply. History is persisted; a failed AI call persists nothing.',
  })
  sendChatMessage(@CurrentUser() user: AuthenticatedUser, @Body() dto: CareerCoachChatDto) {
    return this.careerCoach.sendChatMessage(user.id, dto.message, user.email);
  }

  @Get('chat')
  @Resource('career-coach-chat')
  @ApiOperation({ summary: 'List the chat history (paginated)' })
  listChat(@CurrentUser() user: AuthenticatedUser, @Query() query: CareerCoachListQueryDto) {
    return this.careerCoach.listChat(user.id, query.page, query.limit);
  }
}
