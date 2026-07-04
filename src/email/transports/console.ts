import type { EmailMessage, EmailTransport } from '../types';

/** Default transport when no provider is configured yet — logs instead of failing. */
export const consoleTransport: EmailTransport = {
  id: 'console',
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `\n── Email (no provider configured) ──────────────────────────\n` +
        `To: ${message.to}\nFrom: ${message.fromName} <${message.from}>\nSubject: ${message.subject}\n\n${message.html}\n` +
        `─────────────────────────────────────────────────────────────\n`,
    );
  },
};
