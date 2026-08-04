import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { BattlesService } from './battles.service';
import {
  BattleHistoryQueryDto,
  CreatePracticeBattleDto,
  CreatePrivateBattleDto,
  JoinPrivateBattleDto,
  SubmitBattleCodeDto,
} from './dto/battle.dto';

@ApiTags('battles')
@ApiBearerAuth()
@Controller('battles')
export class BattlesController {
  constructor(private readonly battles: BattlesService) {}

  // ---- Matchmaking (ranked) ----

  @Post('ranked/join-queue')
  @Roles('student')
  @Resource('battle-queue')
  @ApiOperation({ summary: 'Join the ranked matchmaking queue' })
  joinQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.battles.joinQueue(user.id);
  }

  @Delete('ranked/leave-queue')
  @Roles('student')
  @Resource('battle-queue')
  @ApiOperation({ summary: 'Leave the ranked matchmaking queue' })
  leaveQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.battles.leaveQueue(user.id);
  }

  // ---- Practice / Private (static routes before :id) ----

  @Post('practice')
  @Roles('student')
  @Resource('battles')
  @ApiOperation({ summary: 'Create a solo practice battle' })
  createPractice(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePracticeBattleDto) {
    return this.battles.createPracticeBattle(user.id, dto);
  }

  @Post('private')
  @Roles('student')
  @Resource('battles')
  @ApiOperation({ summary: 'Create a private battle and generate an invite code' })
  createPrivate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePrivateBattleDto) {
    return this.battles.createPrivateBattle(user.id, dto);
  }

  @Post('private/join')
  @Roles('student')
  @Resource('battles')
  @ApiOperation({ summary: 'Join a private battle using an invite code' })
  joinPrivate(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinPrivateBattleDto) {
    return this.battles.joinPrivateBattle(user.id, dto);
  }

  @Get('ratings/me')
  @Roles('student')
  @Resource('battle-ratings')
  @ApiOperation({ summary: 'My current battle rating, tier, and global rank' })
  getMyRating(@CurrentUser() user: AuthenticatedUser) {
    return this.battles.getMyRating(user.id);
  }

  @Get('ratings/history')
  @Roles('student')
  @Resource('battle-ratings')
  @ApiOperation({ summary: 'My per-battle rating history' })
  getRatingHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.battles.getRatingHistory(user.id);
  }

  @Get('history')
  @Roles('student')
  @Resource('battle-history')
  @ApiOperation({ summary: 'My match history with pagination' })
  getHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: BattleHistoryQueryDto) {
    return this.battles.getHistory(user.id, query.page, query.limit);
  }

  // ---- Single battle (param route after static routes) ----

  @Get(':id')
  @Roles('student')
  @Resource('battles')
  @ApiOperation({ summary: 'Get battle details with participants and problem' })
  getBattle(@Param('id') id: string) {
    return this.battles.getBattle(id);
  }

  // ---- Submit code ----

  @Post(':id/submit')
  @Roles('student')
  @Resource('battle-submissions')
  @ApiOperation({ summary: 'Submit code for the battle problem' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitBattleCodeDto,
  ) {
    return this.battles.submitCode(user.id, id, dto);
  }
}
