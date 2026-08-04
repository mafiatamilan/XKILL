import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { LeaderboardService } from './leaderboards.service';
import { LeaderboardQueryDto } from './dto/leaderboard.dto';

@ApiTags('leaderboards')
@ApiBearerAuth()
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardService) {}

  @Get('global')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Global leaderboard by rating (Redis-backed)' })
  getGlobal(@Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getGlobal(limit, offset);
  }

  @Get('college/:id')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Leaderboard scoped to a college name' })
  getCollege(@Param('id') id: string, @Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getCollege(id, limit, offset);
  }

  @Get('department/:id')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Leaderboard scoped to a department' })
  getDepartment(@Param('id') id: string, @Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getDepartment(id, limit, offset);
  }

  @Get('company/:name')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Leaderboard of users targeting a specific company' })
  getCompany(@Param('name') name: string, @Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getCompany(name, limit, offset);
  }

  @Get('weekly')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Top rating gainers in the last 7 days' })
  getWeekly(@Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getWeekly(limit, offset);
  }

  @Get('monthly')
  @Roles('student', 'faculty', 'college_admin')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Top rating gainers in the last 30 days' })
  getMonthly(@Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getMonthly(limit, offset);
  }

  @Get('nearby-me')
  @Roles('student')
  @Resource('leaderboards')
  @ApiOperation({ summary: 'Leaderboard of users in my city' })
  getNearbyMe(@CurrentUser() user: AuthenticatedUser, @Query() query: LeaderboardQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    return this.leaderboards.getNearbyMe(user.id, limit, offset);
  }
}
