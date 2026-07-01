import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const ADMIN_VIEWS = path.resolve(process.cwd(), 'admin');

const hbs = Handlebars.create();

function loadPartials() {
  const partialsDir = path.join(ADMIN_VIEWS, 'partials');
  if (!fs.existsSync(partialsDir)) return;
  for (const file of fs.readdirSync(partialsDir)) {
    if (!file.endsWith('.hbs')) continue;
    const name = path.basename(file, '.hbs');
    hbs.registerPartial(name, fs.readFileSync(path.join(partialsDir, file), 'utf-8'));
  }
}

loadPartials();

hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
hbs.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
hbs.registerHelper('or', (a: unknown, b: unknown) => a || b);
hbs.registerHelper('and', (a: unknown, b: unknown) => a && b);
hbs.registerHelper('not', (a: unknown) => !a);
hbs.registerHelper('gt', (a: number, b: number) => a > b);
hbs.registerHelper('lt', (a: number, b: number) => a < b);
hbs.registerHelper('add', (a: number, b: number) => a + b);
hbs.registerHelper('subtract', (a: number, b: number) => a - b);
hbs.registerHelper('concat', (...args: unknown[]) => args.slice(0, -1).join(''));
hbs.registerHelper('lookup', (obj: Record<string, unknown>, key: string) => obj?.[key]);
hbs.registerHelper('money_pence', (pence: number) => (pence / 100).toFixed(2));
hbs.registerHelper('date_short', (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
);
hbs.registerHelper('json_pretty', (v: unknown) =>
  new Handlebars.SafeString(`<pre>${JSON.stringify(v, null, 2)}</pre>`),
);
hbs.registerHelper('hasNonImageFields', (fields: Array<{ type: string }>) =>
  Array.isArray(fields) && fields.some((f) => f.type !== 'image'),
);
hbs.registerHelper('status_badge', (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-700';
  return new Handlebars.SafeString(
    `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${status}</span>`,
  );
});

const AUTH_TEMPLATES = new Set(['login', 'setup']);

export function render(template: string, context: Record<string, unknown>): string {
  const file = path.join(ADMIN_VIEWS, `${template}.hbs`);
  const src = fs.readFileSync(file, 'utf-8');
  const body = hbs.compile(src)(context);

  if (AUTH_TEMPLATES.has(template)) return body;

  const layoutSrc = fs.readFileSync(path.join(ADMIN_VIEWS, 'partials', 'layout.hbs'), 'utf-8');
  return hbs.compile(layoutSrc)({ ...context, body: new Handlebars.SafeString(body) });
}
