export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  template: string;
  data?: Record<string, unknown>;
}

export abstract class MailService {
  abstract send(message: MailMessage): Promise<void>;
}
