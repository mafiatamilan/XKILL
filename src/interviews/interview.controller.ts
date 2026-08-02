import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { InterviewService } from './interview.service';
import {
  AddInterviewTurnDto,
  CreateInterviewSessionDto,
  InterviewListQueryDto,
} from './dto/interview.dto';

@ApiTags('interviews')
@ApiBearerAuth()
@Roles('student')
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviews: InterviewService) {}

  @Post('sessions')
  @Resource('interviews')
  @ApiOperation({
    summary:
      'Create an interview session and generate the AI opening question. `type: dsa` requires a catalog problemId.',
  })
  createSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInterviewSessionDto) {
    return this.interviews.createSession(user.id, dto, user.email);
  }

  @Get('sessions')
  @Resource('interviews')
  @ApiOperation({ summary: 'List my interview sessions (history)' })
  listSessions(@CurrentUser() user: AuthenticatedUser, @Query() query: InterviewListQueryDto) {
    return this.interviews.listSessions(user.id, query.page, query.limit);
  }

  @Get('sessions/:id')
  @Resource('interviews')
  @ApiOperation({ summary: 'Get one of my sessions with its transcript' })
  getSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interviews.getSession(user.id, id);
  }

  @Post('sessions/:id/turns')
  @Resource('interviews')
  @ApiOperation({
    summary:
      'Submit an answer → AI next question + running feedback. For dsa sessions a code answer is graded by Judge0 first.',
  })
  addTurn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddInterviewTurnDto,
  ) {
    return this.interviews.addTurn(user.id, id, dto, user.email);
  }

  @Post('sessions/:id/end')
  @Resource('interviews')
  @ApiOperation({ summary: 'End the session and trigger report generation' })
  endSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interviews.endSession(user.id, id, user.email);
  }

  @Get('sessions/:id/report')
  @Resource('interview-reports')
  @ApiOperation({ summary: 'Get the final report (available only after the session is ended)' })
  getReport(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interviews.getReport(user.id, id);
  }
}
