import type { VacancyStatus, WorkFormat } from './api/types';

export const STATUS_LABELS: Record<VacancyStatus, string> = {
  saved: 'Сохранена',
  applied: 'Откликнулась',
  responded: 'Ответили',
  interview: 'Собеседование',
  offer: 'Оффер',
  rejected: 'Отказ',
};

export const STATUSES = Object.keys(STATUS_LABELS) as VacancyStatus[];

export const WORK_FORMAT_LABELS: Record<WorkFormat, string> = {
  remote: 'Удалёнка',
  hybrid: 'Гибрид',
  office: 'Офис',
};

export const HIGH_MATCH = 80;
export const MEDIUM_MATCH = 50;