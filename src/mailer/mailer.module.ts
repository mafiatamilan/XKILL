import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { ConsoleMailer } from './console-mailer';
import { MailService } from './mailer.service';
import { SmtpMailer } from './smtp-mailer';

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): MailService => {
        return config.get().mail.driver === 'smtp' ? new SmtpMailer(config) : new ConsoleMailer();
      },
    },
  ],
  exports: [MailService],
})
export class MailerModule {}
