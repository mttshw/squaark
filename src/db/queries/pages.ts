import { query, queryOne } from '../connection';

export interface PageRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function findPageBySlug(slug: string): PageRow | null {
  return queryOne<PageRow>(`SELECT * FROM pages WHERE slug = ? AND status = 'published'`, [slug]);
}

export function findAllPages(): PageRow[] {
  return query<PageRow>('SELECT * FROM pages ORDER BY title');
}
