/**
 * @file format.ts
 * @purpose Formatadores puros de moeda/número/data via Intl — zero dependências de runtime.
 * @techniques União em parâmetro (Date | number); valores padrão de parâmetro.
 * @usedBy demos/* (UI), tests/unit/format.test.ts.
 */

/** Locale e fuso PINADOS: sem isso o teste depende do relógio/ICU da máquina que roda. */
const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

export function formatCurrency(value: number, currency = 'BRL', locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** `Date | number`: `Intl.DateTimeFormat` aceita os dois — a união documenta a entrada real. */
export function formatDate(value: Date | number, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: DEFAULT_TIME_ZONE,
  }).format(value);
}
