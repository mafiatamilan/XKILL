import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { validateEnv } from './config/env.validation';
import { AppConfigService } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuditModule } from './audit/audit.module';
import { MailerModule } from './mailer/mailer.module';
import { AiModule } from './ai/ai.module';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { StudentsModule } from './students/students.module';
import { AcademicsModule } from './academics/academics.module';
import { PlacementModule } from './placement/placement.module';
import { DsaModule } from './dsa/dsa.module';
import { JudgeModule } from './judge/judge.module';
import { InterviewsModule } from './interviews/interview.module';
import { CareerCoachModule } from './career-coach/career-coach.module';
import { ResumesModule } from './resumes/resume.module';
import { BattlesModule } from './battles/battles.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: config.get().rateLimit.ttlMs,
            limit: config.get().rateLimit.limit,
          },
        ],
        storage: new ThrottlerStorageRedisService(config.get().redisUrl),
      }),
    }),
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    MailerModule,
    AiModule,
    AuthModule,
    UsersModule,
    AdminModule,
    StudentsModule,
    AcademicsModule,
    PlacementModule,
    DsaModule,
    JudgeModule,
    InterviewsModule,
    CareerCoachModule,
    ResumesModule,
    BattlesModule,
    LeaderboardsModule,
    HealthModule,
  ],
  providers: [
    JsonLoggerService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
