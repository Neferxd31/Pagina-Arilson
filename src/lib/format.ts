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
