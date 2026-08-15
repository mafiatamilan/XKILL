import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationRepository } from './notification.repository';
import { NOTIFICATION_QUEUE, FanOutJobData } from './notification.service';
import { MailService } from '../mailer/mailer.service';
import { DsaGateway } from '../dsa/dsa.gateway';

@Processor(NOTIFICATION_QUEUE)
export class NotificationFanOutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanOutProcessor.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly mailer: MailService,
    private readonly dsaGateway: DsaGateway,
  ) {
    super();
  }

  async process(job: Job<FanOutJobData>): Promise<void> {
    const { broadcastMessageId, channel, targetUserIds, title, body, metadata } = job.data;

    await this.repository.updateBroadcastMessage(broadcastMessageId, {
      status: 'processing',
    });

    let sentCount = 0;
    let failedCount = 0;

    try {
      switch (channel) {
        case 'in_app':
          await this.deliverInApp(targetUserIds, title, body, metadata, broadcastMessageId);
          sentCount = targetUserIds.length;
          break;

        case 'email':
          ({ sentCount, failedCount } = await this.deliverEmail(targetUserIds, title, body));
          break;

        case 'push':
          ({ sentCount, failedCount } = await this.deliverPush(
            targetUserIds,
            title,
            body,
            metadata,
          ));
          break;

        case 'sms':
          ({ sentCount, failedCount } = await this.deliverSms(targetUserIds, body));
          break;

        default:
          this.logger.warn(`Unknown channel: ${channel}`);
          failedCount = targetUserIds.length;
      }

      await this.repository.updateBroadcastMessage(broadcastMessageId, {
        status: 'completed',
        sentCount,
        failedCount,
      });

      job.updateProgress(100);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Broadcast ${broadcastMessageId} failed: ${message}`);
      await this.repository.updateBroadcastMessage(broadcastMessageId, {
        status: 'failed',
        sentCount,
        failedCount: targetUserIds.length - sentCount,
      });
      throw error;
    }
  }

  private async deliverInApp(
    userIds: string[],
    title: string,
    message: string,
    metadata: Record<string, unknown> | undefined,
    broadcastMessageId: string,
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'broadcast',
      title,
      message,
      metadata: { ...metadata, broadcastMessageId },
    }));

    await this.repository.createManyNotifications(notifications);

    for (const userId of userIds) {
      this.dsaGateway.emitToUser(userId, 'notification.new', {
        type: 'broadcast',
        title,
        message,
      });
    }
  }

  private async deliverEmail(
    userIds: string[],
    subject: string,
    body: string,
  ): Promise<{ sentCount: number; failedCount: number }> {
    const users = await this.repository.findUserEmails(userIds);
    let sentCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        await this.mailer.send({
          to: user.email,
          subject,
          html: body,
          template: 'broadcast',
          data: { userId: user.id },
        });
        sentCount++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Email delivery failed for ${user.id}: ${message}`);
        failedCount++;
      }
    }

    return { sentCount, failedCount };
  }

  private async deliverPush(
    userIds: string[],
    _title: string,
    _body: string,
    _metadata: Record<string, unknown> | undefined,
  ): Promise<{ sentCount: number; failedCount: number }> {
    const devices = await this.repository.findDevicePushTokens(userIds);
    let sentCount = 0;
    let failedCount = 0;

    for (const device of devices) {
      if (!device.pushToken) continue;
      try {
        this.logger.log(
          `Push notification would be sent to ${device.pushToken} (provider not configured)`,
        );
        sentCount++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Push delivery failed for device: ${message}`);
        failedCount++;
      }
    }

    return { sentCount, failedCount };
  }

  private async deliverSms(
    userIds: string[],
    _body: string,
  ): Promise<{ sentCount: number; failedCount: number }> {
    this.logger.log(`SMS delivery to ${userIds.length} users (provider not configured)`);
    return { sentCount: 0, failedCount: userIds.length };
  }
}
