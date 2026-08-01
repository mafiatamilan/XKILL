import { Injectable } from '@nestjs/common';
import { MailMessage, MailService } from '../../src/mailer/mailer.service';

/**
 * In-memory mail transport used by the e2e suite. Captures every message so tests
 * can extract emailed tokens/links without a real SMTP server.
 */
@Injectable()
export class FakeMailer extends MailService {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  clear(): void {
    this.sent.length = 0;
  }

  byTemplate(template: string): MailMessage[] {
    return this.sent.filter((m) => m.template === template);
  }

  last(template: string): MailMessage | undefined {
    const matches = this.byTemplate(template);
    return matches[matches.length - 1];
  }

  extractToken(template: string, param: string): string {
    const message = this.last(template);
    if (!message) {
      throw new Error(`No email captured for template '${template}'`);
    }
    const match = message.html.match(new RegExp(`${param}=([A-Za-z0-9_-]+)`));
    if (!match) {
      throw new Error(`No '${param}' found in ${template} email`);
    }
    return match[1];
  }
}
