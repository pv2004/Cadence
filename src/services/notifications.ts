import { Habit, HabitCompletion } from '../types/habit';
import {
  getNotificationPermissionState as getState,
  requestBrowserNotificationPermission,
  checkDueReminders,
} from './reminders';

const firedKeys = new Set<string>();

export function getNotificationPermissionState(): string {
  return getState();
}

export async function requestNotificationPermission(): Promise<boolean> {
  const res = await requestBrowserNotificationPermission();
  return res === 'granted';
}

export function evaluateDueReminders(
  habits: Habit[],
  completions: HabitCompletion[],
  notificationsEnabled: boolean
): void {
  if (!notificationsEnabled) return;
  if (getState() !== 'granted') return;

  const compMap: Record<string, HabitCompletion> = {};
  for (const c of completions) {
    compMap[c.id] = c;
  }

  const due = checkDueReminders(habits, compMap, new Date(), firedKeys);
  for (const alert of due) {
    try {
      new Notification(`Cadence Reminder: ${alert.habitName}`, {
        body: `Time for "${alert.habitName}" (${alert.reminderTime})`,
        icon: '/icon.svg',
      });
    } catch {
      // Ignore notification construction errors on restricted platforms
    }
  }
}
