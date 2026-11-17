import type { LocalDate } from "./model.ts";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isLocalDate(value: string): value is LocalDate {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function toLocalDateKey(date = new Date()): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalDateFromTimestamp(timestamp: string): LocalDate {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Data e hora inválidas.");
  }
  return toLocalDateKey(date);
}

export function addLocalDays(date: LocalDate, amount: number): LocalDate {
  assertLocalDate(date);
  if (!Number.isInteger(amount)) {
    throw new Error("A quantidade de dias precisa ser um número inteiro.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return shifted.toISOString().slice(0, 10);
}

export function daysBetween(start: LocalDate, end: LocalDate): number {
  assertLocalDate(start);
  assertLocalDate(end);
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const endUtc = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((endUtc - startUtc) / DAY_MS);
}

export function weekdayForDate(date: LocalDate): number {
  assertLocalDate(date);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  assertLocalDate(a);
  assertLocalDate(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function assertLocalDate(value: string): asserts value is LocalDate {
  if (!isLocalDate(value)) {
    throw new Error(`Data de calendário inválida: ${value}`);
  }
}
