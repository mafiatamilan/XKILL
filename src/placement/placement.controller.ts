import { Body, Controller, Get, Ip, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { PlacementService } from './placement.service';
import { GenerateStudyPlanDto } from './dto/placement.dto';

@ApiTags('placement')
@ApiBearerAuth()
@Roles('student')
@Controller('placement')
export class PlacementController {
  constructor(private readonly placement: PlacementService) {}

  @Get('roadmap')
  @Resource('placement-roadmap')
  @ApiOperation({ summary: 'Get (and generate on first access) the personalized 10-week roadmap' })
  roadmap(@CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.placement.getRoadmap(user.id, ip);
  }

  @Get('roadmap/:week/tasks')
  @Resource('placement-roadmap')
  @ApiOperation({ summary: 'Get the tasks for one roadmap week' })
  weekTasks(@CurrentUser() user: AuthenticatedUser, @Param('week', ParseIntPipe) week: number) {
    return this.placement.getWeekTasks(user.id, week);
  }

  @Patch('tasks/:id/complete')
  @Resource('placement-tasks')
  @ApiOperation({ summary: 'Mark a daily task as complete' })
  completeTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Ip() ip: string) {
    return this.placement.completeTask(user.id, id, ip);
  }

  @Get('companies/:company/prep')
  @Resource('placement-company-prep')
  @ApiOperation({ summary: 'Get the prep track for a target company' })
  companyPrep(@Param('company') company: string) {
    return this.placement.getCompanyPrep(company);
  }

  @Get('progress')
  @Resource('placement-progress')
  @ApiOperation({ summary: 'Get roadmap progress (overall + per-week percentages)' })
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.placement.getProgress(user.id);
  }

  @Get('readiness-prediction')
  @Resource('placement-readiness')
  @ApiOperation({
    summary: 'Get the placement readiness prediction (extends the 5.2 ReadinessScore)',
  })
  readinessPrediction(@CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.placement.getReadinessPrediction(user.id, ip);
  }

  @Get('daily-challenge')
  @Resource('placement-daily-challenge')
  @ApiOperation({ summary: 'Get the daily challenge for today' })
  dailyChallenge() {
    return this.placement.getDailyChallenge();
  }

  @Post('study-planner/generate')
  @Resource('placement-study-planner')
  @ApiOperation({ summary: 'Generate a personalized study plan via the AI service' })
  generateStudyPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateStudyPlanDto,
    @Ip() ip: string,
  ) {
    return this.placement.generateStudyPlan(user.id, dto, ip);
  }
}
