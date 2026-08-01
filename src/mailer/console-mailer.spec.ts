import { ConsoleMailer } from './console-mailer';
import { MailMessage } from './mailer.service';

describe('ConsoleMailer', () => {
  it('logs the message as JSON', async () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const mailer = new ConsoleMailer();
      const message: MailMessage = {
        to: 'a@b.com',
        subject: 'Verify',
        html: '<b>hi</b>',
        template: 'email-verification',
      };
      await mailer.send(message);
      const output = writeSpy.mock.calls.map((c) => String(c[0])).join('');
      expect(output).toContain('email-verification');
      expect(output).toContain('a@b.com');
    } finally {
      writeSpy.mockRestore();
    }
  });
});
