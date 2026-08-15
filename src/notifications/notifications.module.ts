import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../config/app-config.service';
import { NotificationService, NOTIFICATION_QUEUE } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { NotificationFanOutProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';
import { AnnouncementsController } from './announcements.controller';
import { BroadcastController } from './broadcast.controller';
import { NotificationTemplatesController } from './notification-templates.controller';
import { DsaModule } from '../dsa/dsa.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: { url: config.get().redisUrl },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    DsaModule,
    MailerModule,
  ],
  controllers: [
    NotificationController,
    AnnouncementsController,
    BroadcastController,
    NotificationTemplatesController,
  ],
  providers: [NotificationService, NotificationRepository, NotificationFanOutProcessor],
  exports: [NotificationService, NotificationRepository],
})
export class NotificationsModule {}
