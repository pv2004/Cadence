import { Habit, HabitCompletion } from '../types/habit';
import { formatDateKey, isEntryCompleted, isHabitScheduledOnDate } from '../utils/habitLogic';

export function getNotificationPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'default';
  }
}

export interface DueReminderAlert {
  habitId: string;
  habitName: string;
  reminderTime: string;
}

/**
 * Checks if any habit has an enabled reminder matching current HH:mm that hasn't been completed today
 */
export function checkDueReminders(
  habits: Habit[],
  completions: Record<string, HabitCompletion>,
  now: Date,
  alreadyFiredKeys: Set<string>
): DueReminderAlert[] {
  const todayStr = formatDateKey(now);
  const dayOfWeek = now.getDay();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  const alerts: DueReminderAlert[] = [];

  for (const habit of habits) {
    if (habit.archived) continue;
    if (!isHabitScheduledOnDate(habit, todayStr)) continue;

    const record = completions[`${habit.id}_${todayStr}`];
    if (isEntryCompleted(habit, record)) continue;

    for (const rem of habit.reminders || []) {
      if (!rem.enabled) continue;
      if (!rem.days.includes(dayOfWeek)) continue;
      const fireKey = `${habit.id}_${todayStr}_${rem.time}`;
      if (rem.time === currentTime && !alreadyFiredKeys.has(fireKey)) {
        alreadyFiredKeys.add(fireKey);
        alerts.push({
          habitId: habit.id,
          habitName: habit.name,
          reminderTime: rem.time,
        });
      }
    }
  }

  return alerts;
}
