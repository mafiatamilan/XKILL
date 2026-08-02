import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { DsaCompeteService } from './dsa-compete.service';
import {
  AntiCheatEventDto,
  ContestStatusQueryDto,
  CreateContestDto,
  LeaderboardQueryDto,
  UpdateContestDto,
} from './dto/dsa-compete.dto';

@ApiTags('dsa')
@ApiBearerAuth()
@Controller('dsa')
export class DsaCompeteController {
  constructor(private readonly compete: DsaCompeteService) {}

  @Post('contests')
  @Roles('faculty', 'college_admin')
  @Resource('dsa-contests')
  @ApiOperation({ summary: 'Create a DSA contest (faculty/college admin)' })
  createContest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContestDto) {
    return this.compete.createContest(user.id, dto);
  }

  @Get('contests')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('dsa-contests')
  @ApiOperation({ summary: 'List contests' })
  listContests(@Query() query: ContestStatusQueryDto) {
    return this.compete.listContests(query.page, query.limit, query.status);
  }

  @Get('contests/:id')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('dsa-contests')
  @ApiOperation({ summary: 'Get one contest with its problems' })
  getContest(@Param('id') id: string) {
    return this.compete.getContest(id);
  }

  @Patch('contests/:id')
  @Roles('faculty', 'college_admin')
  @Resource('dsa-contests')
  @ApiOperation({ summary: 'Update a contest (faculty/college admin)' })
  updateContest(@Param('id') id: string, @Body() dto: UpdateContestDto) {
    return this.compete.updateContest(id, dto);
  }

  @Delete('contests/:id')
  @Roles('faculty', 'college_admin')
  @Resource('dsa-contests')
  @ApiOperation({ summary: 'Delete a contest (faculty/college admin)' })
  deleteContest(@Param('id') id: string) {
    return this.compete.deleteContest(id);
  }

  @Post('contests/:id/register')
  @Roles('student')
  @Resource('dsa-registrations')
  @ApiOperation({ summary: 'Register for a contest' })
  registerContest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.compete.registerContest(user.id, id);
  }

  @Get('contests/:id/leaderboard')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('dsa-leaderboard')
  @ApiOperation({ summary: 'Live contest leaderboard (updates as verdicts land)' })
  getLeaderboard(@Param('id') id: string, @Query() query: LeaderboardQueryDto) {
    const limit = Math.min(query.limit ?? 100, 500);
    return this.compete.getLeaderboard(id, limit, (query.page - 1) * limit);
  }

  @Get('rating/me')
  @Roles('student')
  @Resource('dsa-rating')
  @ApiOperation({ summary: 'My current rating, tier and global rank' })
  getMyRating(@CurrentUser() user: AuthenticatedUser) {
    return this.compete.getMyRating(user.id);
  }

  @Get('rating/history')
  @Roles('student')
  @Resource('dsa-rating')
  @ApiOperation({ summary: 'My per-contest rating history' })
  getRatingHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.compete.getRatingHistory(user.id);
  }

  @Post('anti-cheat/event')
  @Roles('student')
  @Resource('dsa-anti-cheat')
  @ApiOperation({ summary: 'Report a client-side anti-cheat event (tab switch, copy-paste, …)' })
  reportAntiCheatEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: AntiCheatEventDto) {
    return this.compete.reportAntiCheatEvent(user.id, dto);
  }
}
