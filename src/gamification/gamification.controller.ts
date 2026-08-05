import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { GamificationService } from './gamification.service';
import { ClaimDailyRewardDto } from './dto/gamification.dto';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('me/summary')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'Get gamification summary (XP, level, streak, badges, daily reward)' })
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.getSummary(user.id);
  }

  @Post('daily-reward/claim')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'Claim daily reward (idempotent per day)' })
  claimDailyReward(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClaimDailyRewardDto) {
    return this.gamification.claimDailyReward(user.id, dto);
  }

  @Get('badges')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'List all available badges' })
  listBadges() {
    return this.gamification.listBadges();
  }

  @Get('achievements')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'List my earned achievements' })
  listAchievements(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.listAchievements(user.id);
  }

  @Get('missions')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'List active missions' })
  listMissions() {
    return this.gamification.listMissions();
  }

  @Get('weekly-challenges')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'List current weekly challenges' })
  listWeeklyChallenges() {
    return this.gamification.listWeeklyChallenges();
  }

  @Get('seasonal-events')
  @Roles('student')
  @Resource('gamification')
  @ApiOperation({ summary: 'List active seasonal events' })
  listSeasonalEvents() {
    return this.gamification.listSeasonalEvents();
  }
}
