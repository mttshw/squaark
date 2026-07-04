import nodemailer from 'nodemailer';
import type { EmailMessage, EmailTransport, EmailSettings } from '../types';

export function createSmtpTransport(settings: EmailSettings): EmailTransport {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass } : undefined,
  });

  return {
    id: 'smtp',
    async send(message: EmailMessage): Promise<void> {
      await transporter.sendMail({
        to: message.to,
        from: `${message.fromName} <${message.from}>`,
        subject: message.subject,
        html: message.html,
      });
    },
  };
}
