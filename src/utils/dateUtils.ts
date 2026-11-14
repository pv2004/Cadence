import { addDays, formatDateKey, parseDateKey } from './habitLogic';

export function getTodayDateString(): string {
  return formatDateKey(new Date());
}

export function parseDateString(dateStr: string): Date {
  return parseDateKey(dateStr);
}

export function getWeekdayShortLabels(weekStartsOn: 0 | 1 = 1): string[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (weekStartsOn === 1) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  return labels;
}

export function getMonthDaysGrid(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 1
): (string | null)[] {
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0, 12, 0, 0).getDate();
  const startDow = firstDay.getDay();
  const offset = (startDow - weekStartsOn + 7) % 7;

  const grid: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d, 12, 0, 0);
    grid.push(formatDateKey(dt));
  }
  return grid;
}

export function getLastNDays(count: number, endDateStr: string): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(addDays(endDateStr, -i));
  }
  return days;
}

export function formatShortDate(dateStr: string): string {
  const dt = parseDateKey(dateStr);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
