import { execute, query, queryOne } from '../connection';

export interface DailyCount { date: string; views: number }
export interface PathCount  { path: string; views: number }
export interface RefCount   { referrer: string; views: number }

export interface AnalyticsSummary {
  visitsToday: number;
  visits7d: number;
  visits30d: number;
  uniqueVisitors7d: number;
  topPages: PathCount[];
  topReferrers: RefCount[];
  daily7d: DailyCount[];
}

export function recordPageView(path: string, referrer: string | null, ipHash: string): void {
  try {
    execute(
      `INSERT INTO page_views (id, path, referrer, ip_hash) VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), path, referrer, ipHash],
    );
  } catch {
    // never crash the request over analytics
  }
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const visitsToday = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM page_views WHERE date(created_at) = date('now')`,
  )?.n ?? 0;

  const visits7d = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM page_views WHERE created_at >= datetime('now', '-7 days')`,
  )?.n ?? 0;

  const visits30d = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM page_views WHERE created_at >= datetime('now', '-30 days')`,
  )?.n ?? 0;

  const uniqueVisitors7d = queryOne<{ n: number }>(
    `SELECT COUNT(DISTINCT ip_hash) AS n FROM page_views WHERE created_at >= datetime('now', '-7 days')`,
  )?.n ?? 0;

  const topPages = query<PathCount>(
    `SELECT path, COUNT(*) AS views FROM page_views
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY path ORDER BY views DESC LIMIT 8`,
  );

  const topReferrers = query<RefCount>(
    `SELECT referrer, COUNT(*) AS views FROM page_views
     WHERE referrer IS NOT NULL AND created_at >= datetime('now', '-30 days')
     GROUP BY referrer ORDER BY views DESC LIMIT 8`,
  );

  const daily7d = query<DailyCount>(
    `SELECT date(created_at) AS date, COUNT(*) AS views FROM page_views
     WHERE created_at >= datetime('now', '-7 days')
     GROUP BY date(created_at) ORDER BY date ASC`,
  );

  return { visitsToday, visits7d, visits30d, uniqueVisitors7d, topPages, topReferrers, daily7d };
}
