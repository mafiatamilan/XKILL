import { Body, Controller, Get, Ip, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { DsaService } from './dsa.service';
import {
  ListProblemsQueryDto,
  ListSubmissionsQueryDto,
  RunCodeDto,
  SubmitCodeDto,
  UnlockHintDto,
} from './dto/dsa.dto';

@ApiTags('dsa')
@ApiBearerAuth()
@Roles('student')
@Controller('dsa')
export class DsaController {
  constructor(private readonly dsa: DsaService) {}

  @Get('problems')
  @Resource('dsa-problems')
  @ApiOperation({ summary: 'List problems with difficulty/topic/company/tag filters' })
  listProblems(@Query() query: ListProblemsQueryDto) {
    return this.dsa.listProblems(
      {
        difficulty: query.difficulty,
        topic: query.topic,
        company: query.company,
        tag: query.tag,
        search: query.search,
      },
      query.page,
      query.limit,
      query.sortBy,
      query.order,
    );
  }

  @Get('problems/:id')
  @Resource('dsa-problems')
  @ApiOperation({ summary: 'Get a problem with its sample test cases' })
  getProblem(@Param('id') id: string) {
    return this.dsa.getProblem(id);
  }

  @Post('problems/:id/run')
  @Resource('dsa-problems')
  @ApiOperation({ summary: 'Run code against custom stdin (ephemeral, no submission row)' })
  runCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RunCodeDto,
    @Ip() ip: string,
  ) {
    return this.dsa.runCode(user.id, id, dto, ip);
  }

  @Post('problems/:id/submit')
  @Resource('dsa-submissions')
  @ApiOperation({ summary: 'Submit a solution — queued, verdict delivered async via WebSocket' })
  submitCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitCodeDto,
    @Ip() ip: string,
  ) {
    return this.dsa.submitCode(user.id, id, dto, ip);
  }

  @Get('submissions/me')
  @Resource('dsa-submissions')
  @ApiOperation({ summary: 'List my submission history' })
  listMySubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSubmissionsQueryDto,
  ) {
    return this.dsa.listMySubmissions(
      user.id,
      query.problemId,
      query.verdict,
      query.page,
      query.limit,
    );
  }

  @Get('submissions/:id')
  @Resource('dsa-submissions')
  @ApiOperation({ summary: 'Get one submission and its verdict' })
  getSubmission(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dsa.getSubmission(user.id, id);
  }

  @Get('problems/:id/editorial')
  @Resource('dsa-editorial')
  @ApiOperation({ summary: 'Get the editorial for a problem' })
  getEditorial(@Param('id') id: string) {
    return this.dsa.getEditorial(id);
  }

  @Get('problems/:id/hints')
  @Resource('dsa-hints')
  @ApiOperation({ summary: 'Get hints for a problem (progressive per-user unlock)' })
  getHints(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dsa.getHints(user.id, id);
  }

  @Post('problems/:id/hints/unlock')
  @Resource('dsa-hints')
  @ApiOperation({ summary: 'Unlock the next hint (must be sequential per user)' })
  unlockHint(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UnlockHintDto,
    @Ip() ip: string,
  ) {
    return this.dsa.unlockHint(user.id, id, dto.hintOrder, ip);
  }
}
