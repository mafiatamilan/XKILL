import nodemailer from 'nodemailer';
import { SmtpMailer } from './smtp-mailer';
import { mockConfig } from '../testing/mocks';

jest.mock('nodemailer');

describe('SmtpMailer', () => {
  let sendMail: jest.Mock;
  let createTransport: jest.Mock;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });
    createTransport = jest.fn().mockReturnValue({ sendMail });
    (nodemailer.createTransport as jest.Mock) = createTransport;
  });

  it('builds a transporter with auth when credentials are provided', () => {
    new SmtpMailer(
      mockConfig({
        mail: {
          from: 'noreply@xkill.app',
          driver: 'smtp',
          host: 'smtp.test',
          port: 587,
          user: 'u',
          pass: 'p',
        },
      }),
    );
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.test',
        port: 587,
        secure: false,
        auth: { user: 'u', pass: 'p' },
      }),
    );
  });

  it('builds a transporter without auth for open relays', () => {
    new SmtpMailer(
      mockConfig({
        mail: {
          from: 'noreply@xkill.app',
          driver: 'smtp',
          host: 'smtp.test',
          port: 465,
          user: '',
          pass: '',
        },
      }),
    );
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, auth: undefined }),
    );
  });

  it('sends the message via the transporter', async () => {
    const mailer = new SmtpMailer(
      mockConfig({
        mail: {
          from: 'noreply@xkill.app',
          driver: 'smtp',
          host: 'smtp.test',
          port: 587,
          user: '',
          pass: '',
        },
      }),
    );
    await mailer.send({ to: 'a@b.com', subject: 'S', html: '<p>hi</p>', template: 't' });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'noreply@xkill.app',
      to: 'a@b.com',
      subject: 'S',
      html: '<p>hi</p>',
    });
  });
});
