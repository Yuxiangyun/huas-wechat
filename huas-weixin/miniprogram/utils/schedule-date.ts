import { getBeijingNow } from './util';

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatBeijingToday(): string {
  const now = getBeijingNow();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonday(date: Date): Date {
  const normalized = new Date(date);
  const day = normalized.getDay() || 7;
  normalized.setDate(normalized.getDate() - day + 1);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
