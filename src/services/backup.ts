import { Habit, HabitCompletion, UserPreferences } from '../types/habit';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  app: 'Cadence';
  habits: Habit[];
  completions: HabitCompletion[];
  preferences: UserPreferences;
}

export function createBackupJSON(
  habits: Habit[],
  completionsMap: Record<string, HabitCompletion>,
  preferences: UserPreferences
): string {
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Cadence',
    habits,
    completions: Object.values(completionsMap),
    preferences,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJSON(rawText: string): BackupPayload {
  const parsed = JSON.parse(rawText);
  if (!parsed || !Array.isArray(parsed.habits) || !Array.isArray(parsed.completions)) {
    throw new Error('Invalid backup file format. Expected habits and completions arrays.');
  }
  return parsed as BackupPayload;
}

export function createHabitHistoryCSV(
  habits: Habit[],
  completionsMap: Record<string, HabitCompletion>
): string {
  const habitById = new Map<string, Habit>();
  for (const h of habits) habitById.set(h.id, h);

  const header = ['Date', 'Habit Name', 'Type', 'Completed', 'Value', 'Unit'];
  const rows = Object.values(completionsMap)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((c) => {
      const h = habitById.get(c.habitId);
      const name = (h?.name || c.habitId).replace(/"/g, '""');
      const type = h?.type || 'normal';
      const unit = (h?.unit || '').replace(/"/g, '""');
      return `${c.date},"${name}",${type},${c.completed ? 'Yes' : 'No'},${c.value},"${unit}"`;
    });

  return [header.join(','), ...rows].join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
