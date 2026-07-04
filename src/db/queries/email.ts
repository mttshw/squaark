import { query, queryOne, execute } from '../connection';

export interface EmailTemplateRow {
  key: string;
  name: string;
  subject: string;
  body: string;
  enabled: number;
  updated_at: string;
}

export function listEmailTemplates(): EmailTemplateRow[] {
  return query<EmailTemplateRow>('SELECT * FROM email_templates ORDER BY name');
}

export function findEmailTemplate(key: string): EmailTemplateRow | null {
  return queryOne<EmailTemplateRow>('SELECT * FROM email_templates WHERE key = ?', [key]);
}

export function updateEmailTemplate(
  key: string,
  subject: string,
  body: string,
  enabled: boolean,
): void {
  execute(
    `UPDATE email_templates
     SET subject = ?, body = ?, enabled = ?, updated_at = datetime('now')
     WHERE key = ?`,
    [subject, body, enabled ? 1 : 0, key],
  );
}

export interface EmailLogRow {
  id: string;
  template_key: string | null;
  to_address: string;
  subject: string;
  provider: string;
  status: string;
  error: string | null;
  created_at: string;
}

export function logEmailAttempt(entry: {
  templateKey: string | null;
  to: string;
  subject: string;
  provider: string;
  status: 'sent' | 'failed';
  error?: string;
}): void {
  execute(
    `INSERT INTO email_log (id, template_key, to_address, subject, provider, status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      entry.templateKey,
      entry.to,
      entry.subject,
      entry.provider,
      entry.status,
      entry.error ?? null,
    ],
  );
}

export function listRecentEmailLog(limit = 20): EmailLogRow[] {
  return query<EmailLogRow>('SELECT * FROM email_log ORDER BY created_at DESC LIMIT ?', [limit]);
}
