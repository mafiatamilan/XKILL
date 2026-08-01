import { Controller, Delete, Get, HttpCode, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me/sessions')
  @ApiOperation({ summary: 'List the current user active sessions (devices)' })
  listSessions(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.users.listSessions(user.id, user.sessionId, query.page, query.limit);
  }

  @Delete('me/sessions/:sessionId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke one of the current user sessions' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.users.revokeSession(user.id, sessionId);
  }
}
