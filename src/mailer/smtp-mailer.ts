import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';
import { MailMessage, MailService } from './mailer.service';

@Injectable()
export class SmtpMailer extends MailService {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfigService) {
    super();
    const mail = config.get().mail;
    this.transporter = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.port === 465,
      auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get().mail.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    this.logger.log(`Sent ${message.template} email to ${message.to}`);
  }
}
