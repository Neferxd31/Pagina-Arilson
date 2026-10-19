// Small helpers to read untrusted JSON fields while collecting user-facing errors

export type Source = Record<string, unknown>;

export function asSource(value: unknown): Source {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Source) : {};
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// label goes lowercase with its article ("la ciudad") so messages read naturally in Spanish
export function readText(
  source: Source,
  key: string,
  label: string,
  options: { max: number; required?: boolean },
  errors: string[],
): string {
  const raw = source[key];
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (options.required && !text) errors.push(`Falta ${label}.`);
  if (text.length > options.max) errors.push(`${capitalize(label)} no puede superar ${options.max} caracteres.`);
  return text;
}

export function readInteger(
  source: Source,
  key: string,
  label: string,
  options: { min: number; max: number },
  errors: string[],
): number {
  const value = Number(source[key]);
  if (!Number.isInteger(value) || value < options.min || value > options.max) {
    errors.push(`${capitalize(label)} debe ser un número entero entre ${options.min} y ${options.max}.`);
    return options.min;
  }
  return value;
}
