const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  // Normalize the non-breaking space Intl inserts so the text is the same in WhatsApp and HTML
  return copFormatter.format(value).replace(/\s/g, ' ');
}

export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug || 'producto';
}

export function uniqueSlug(base: string, takenSlugs: string[]): string {
  const taken = new Set(takenSlugs);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export function imageUrl(key: string): string {
  return key ? `/img/${key}` : '/logo.png';
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

// D1 guarda las fechas en UTC ("2026-11-09 17:30:00"); se muestran en hora de Colombia
export function formatDateTime(utcSqliteDate: string): string {
  return dateTimeFormatter.format(new Date(`${utcSqliteDate.replace(' ', 'T')}Z`)).replace(/\s/g, ' ');
}

// JSON placed inside a <script> tag: "<" is escaped so no text (like a product title) can close the tag early
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
