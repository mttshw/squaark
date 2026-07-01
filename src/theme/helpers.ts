import Handlebars from 'handlebars';
import type { Money } from './context';

export type AssetResolver = (filename: string) => string;
export type UrlResolver = (type: string, slugs: string[]) => string;

export function registerHelpers(
  hbs: typeof Handlebars,
  resolveAsset: AssetResolver,
  resolveUrl: UrlResolver,
): void {
  hbs.registerHelper('money', (m: Money | null | undefined) => {
    if (!m) return '';
    return m.formatted;
  });

  hbs.registerHelper('asset', (filename: string) => resolveAsset(filename));

  hbs.registerHelper('url', (type: string, ...rest: unknown[]) => {
    // Handlebars appends an options object as the last argument
    const slugs = rest.slice(0, -1) as string[];
    return resolveUrl(type, slugs);
  });

  hbs.registerHelper('csrf_field', function (this: { csrfToken?: string }) {
    const token = Handlebars.escapeExpression(this.csrfToken ?? '');
    return new Handlebars.SafeString(
      `<input type="hidden" name="_csrf" value="${token}">`,
    );
  });

  hbs.registerHelper('stock_badge', (variant: { available: boolean } | null) => {
    if (!variant) return '';
    return variant.available ? 'In Stock' : 'Sold Out';
  });

  hbs.registerHelper('gt', (a: number, b: number) => a > b);
  hbs.registerHelper('lt', (a: number, b: number) => a < b);
  hbs.registerHelper('gte', (a: number, b: number) => a >= b);
  hbs.registerHelper('lte', (a: number, b: number) => a <= b);
  hbs.registerHelper('or', (a: unknown, b: unknown) => a || b);
  hbs.registerHelper('and', (a: unknown, b: unknown) => a && b);

  // Works both as a block helper {{#is a b}}...{{/is}} and subexpression (is a b)
  hbs.registerHelper('is', function (
    this: unknown,
    a: unknown,
    b: unknown,
    options: Handlebars.HelperOptions,
  ) {
    if (typeof options?.fn === 'function') {
      return a === b ? options.fn(this) : options.inverse(this);
    }
    return a === b;
  });

  hbs.registerHelper('if_eq', function (
    this: unknown,
    a: unknown,
    b: unknown,
    options: Handlebars.HelperOptions,
  ) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper('pluralize', (count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural,
  );

  hbs.registerHelper('truncate', (text: string, length: number) => {
    if (!text || text.length <= length) return text;
    return text.slice(0, length).trimEnd() + '…';
  });

  // Stub for Phase 1 — real i18n locale files wired up in Phase 6
  hbs.registerHelper('t', (key: string) => key);

  hbs.registerHelper('json', (obj: unknown) =>
    new Handlebars.SafeString(`<pre class="text-xs">${JSON.stringify(obj, null, 2)}</pre>`),
  );

  hbs.registerHelper('timestamp', (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  hbs.registerHelper('meta_title', function (this: { store?: { name: string }; pageTitle?: string }) {
    const title = this.pageTitle
      ? `${this.pageTitle} – ${this.store?.name ?? ''}`
      : (this.store?.name ?? '');
    return new Handlebars.SafeString(`<title>${Handlebars.escapeExpression(title)}</title>`);
  });

  hbs.registerHelper('meta_description', function (this: { metaDescription?: string }) {
    const desc = this.metaDescription ?? '';
    return new Handlebars.SafeString(
      `<meta name="description" content="${Handlebars.escapeExpression(desc)}">`,
    );
  });

  hbs.registerHelper('canonical_url', function (this: {
    store?: { url: string };
    currentPath?: string;
  }) {
    const url = (this.store?.url ?? '') + (this.currentPath ?? '');
    return new Handlebars.SafeString(`<link rel="canonical" href="${url}">`);
  });

  hbs.registerHelper('structured_data', () => new Handlebars.SafeString(''));

  hbs.registerHelper('pagination', (pagination: {
    hasPrev: boolean; prevUrl: string | null;
    hasNext: boolean; nextUrl: string | null;
  } | null) => {
    if (!pagination) return '';
    const prev = pagination.hasPrev && pagination.prevUrl
      ? `<a href="${pagination.prevUrl}" class="pagination__prev">← Prev</a>`
      : '';
    const next = pagination.hasNext && pagination.nextUrl
      ? `<a href="${pagination.nextUrl}" class="pagination__next">Next →</a>`
      : '';
    return new Handlebars.SafeString(`<nav class="pagination">${prev}${next}</nav>`);
  });
}
