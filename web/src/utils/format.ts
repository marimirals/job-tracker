import type { Vacancy } from '../api/types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUR: '₽',
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KZT: '₸',
};

const numberFormat = new Intl.NumberFormat('ru-RU');
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export function formatSalary({
  salaryFrom,
  salaryTo,
  currency,
}: Pick<Vacancy, 'salaryFrom' | 'salaryTo' | 'currency'>): string {
  if (salaryFrom === null && salaryTo === null) {
    return 'Не указана';
  }

  const symbol = currency ? (CURRENCY_SYMBOLS[currency] ?? currency) : '';
  const from = salaryFrom !== null ? numberFormat.format(salaryFrom) : null;
  const to = salaryTo !== null ? numberFormat.format(salaryTo) : null;

  let range: string;
  if (from && to) {
    range = `${from} – ${to}`;
  } else if (from) {
    range = `от ${from}`;
  } else {
    range = `до ${to}`;
  }

  return `${range} ${symbol}`.trim();
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}