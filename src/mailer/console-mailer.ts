import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailService } from './mailer.service';

/**
 * Development transport: writes the message to the structured log so no SMTP
 * server is required locally. Never used in production (see SmtpMailer).
 */
@Injectable()
export class ConsoleMailer extends MailService {
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      JSON.stringify({
        to: message.to,
        subject: message.subject,
        template: message.template,
        html: message.html,
      }),
    );
  }
}
