import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateKey,
  addDays,
  diffDays,
  isHabitScheduledOnDate,
  isEntryCompleted,
  getEntryIntensity,
  calculateHabitStats,
  calculateHabitStrength,
  calculateIslandLedger,
  parseHabitImportCSV,
  buildShowcaseDuplicateData,
  generateFullExportCSV,
  buildWeeklyPerformanceDigest,
  buildHabitCompletionTrends,
} from './habitLogic';
import {
  triggerHaptic,
  setHapticsEnabled,
  HAPTIC_PATTERNS,
} from './haptics';
import {
  getHourlyQuoteSlot,
  selectHourlyMotivationalQuote,
  MAX_SINGLE_LINE_QUOTE_LENGTH,
} from './themes';
import { Habit, HabitCompletion, FocusSession } from '../types/habit';

const mockNormalHabit: Habit = {
  id: 'h1',
  name: 'Read 20 mins',
  icon: 'BookOpen',
  type: 'normal',
  schedule: { type: 'everyday' },
  reminders: [],
  order: 0,
  archived: false,
  createdAt: '2026-11-01',
};

const mockAmountHabit: Habit = {
  id: 'h2',
  name: 'Hydrate',
  icon: 'Droplets',
  type: 'amount',
  target: 3,
  unit: 'L',
  schedule: { type: 'everyday' },
  reminders: [],
  order: 1,
  archived: false,
  createdAt: '2026-11-01',
};

const mockWeekdayHabit: Habit = {
  id: 'h3',
  name: 'Deep Code',
  icon: 'Code',
  type: 'normal',
  schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] }, // Mon-Fri
  reminders: [],
  order: 2,
  archived: false,
  createdAt: '2026-11-01',
};

test('date helpers format, add, and diff accurately', () => {
  const next = addDays('2026-11-10', 2);
  assert.equal(next, '2026-11-12');
  assert.equal(diffDays('2026-11-12', '2026-11-10'), 2);
  const dt = new Date(2026, 10, 12);
  assert.equal(formatDateKey(dt), '2026-11-12');
});

test('amount habit completion and intensity thresholds', () => {
  const partial: HabitCompletion = {
    id: 'h2_2026-11-12',
    habitId: 'h2',
    date: '2026-11-12',
    value: 1.5,
    completed: false,
    updatedAt: 100,
  };
  const full: HabitCompletion = {
    ...partial,
    value: 3,
    completed: true,
  };

  assert.equal(isEntryCompleted(mockAmountHabit, partial), false);
  assert.equal(getEntryIntensity(mockAmountHabit, partial), 2);
  assert.equal(isEntryCompleted(mockAmountHabit, full), true);
  assert.equal(getEntryIntensity(mockAmountHabit, full), 4);
});

test('streak calculation tracks consecutive days and preserves streak if today not yet done', () => {
  const records: Record<string, HabitCompletion> = {
    'h1_2026-11-09': {
      id: 'h1_2026-11-09',
      habitId: 'h1',
      date: '2026-11-09',
      value: 1,
      completed: true,
      updatedAt: 1,
    },
    'h1_2026-11-10': {
      id: 'h1_2026-11-10',
      habitId: 'h1',
      date: '2026-11-10',
      value: 1,
      completed: true,
      updatedAt: 2,
    },
    'h1_2026-11-11': {
      id: 'h1_2026-11-11',
      habitId: 'h1',
      date: '2026-11-11',
      value: 1,
      completed: true,
      updatedAt: 3,
    },
  };

  const statsBefore = calculateHabitStats(mockNormalHabit, records, '2026-11-12');
  assert.equal(statsBefore.currentStreak, 3);
  assert.equal(statsBefore.longestStreak, 3);
  assert.equal(statsBefore.totalCompletions, 3);

  records['h1_2026-11-12'] = {
    id: 'h1_2026-11-12',
    habitId: 'h1',
    date: '2026-11-12',
    value: 1,
    completed: true,
    updatedAt: 4,
  };
  const statsAfter = calculateHabitStats(mockNormalHabit, records, '2026-11-12');
  assert.equal(statsAfter.currentStreak, 4);
  assert.equal(statsAfter.longestStreak, 4);
});

test('weekday schedule skips weekend without breaking streak', () => {
  assert.equal(isHabitScheduledOnDate(mockWeekdayHabit, '2026-11-06'), true);
  assert.equal(isHabitScheduledOnDate(mockWeekdayHabit, '2026-11-07'), false);
  assert.equal(isHabitScheduledOnDate(mockWeekdayHabit, '2026-11-08'), false);
  assert.equal(isHabitScheduledOnDate(mockWeekdayHabit, '2026-11-09'), true);

  const records: Record<string, HabitCompletion> = {
    'h3_2026-11-06': {
      id: 'h3_2026-11-06',
      habitId: 'h3',
      date: '2026-11-06',
      value: 1,
      completed: true,
      updatedAt: 1,
    },
    'h3_2026-11-09': {
      id: 'h3_2026-11-09',
      habitId: 'h3',
      date: '2026-11-09',
      value: 1,
      completed: true,
      updatedAt: 2,
    },
  };

  const stats = calculateHabitStats(mockWeekdayHabit, records, '2026-11-09');
  assert.equal(stats.currentStreak, 2);
});

test('calculateHabitStrength decays gently on a missed day instead of resetting to 0', () => {
  const completions: HabitCompletion[] = [];
  // Complete 10 days in a row from 2026-11-01 to 2026-11-10, miss 2026-11-11, complete 2026-11-12
  for (let d = 1; d <= 12; d++) {
    if (d === 11) continue; // missed yesterday!
    const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
    completions.push({
      id: `h1_${dateStr}`,
      habitId: 'h1',
      date: dateStr,
      value: 1,
      completed: true,
      updatedAt: d,
    });
  }

  const stats = calculateHabitStats(mockNormalHabit, completions, '2026-11-12');
  const strength = calculateHabitStrength(mockNormalHabit, completions, '2026-11-12');
  assert.equal(stats.currentStreak, 1); // Raw streak dropped to 1 because of missed yesterday
  assert.ok(strength.percentage > 80); // Momentum strength stays above 80%!
  assert.equal(strength.label, 'Strong');
});

test('calculateIslandLedger computes coins from checks, focus minutes, perfect days, and milestones', () => {
  const completions: HabitCompletion[] = [];
  for (let d = 1; d <= 7; d++) {
    const dateStr = `2026-11-0${d}`;
    completions.push({
      id: `h1_${dateStr}`,
      habitId: 'h1',
      date: dateStr,
      value: 1,
      completed: true,
      updatedAt: d,
    });
  }
  const sessions: FocusSession[] = [
    {
      id: 'f1',
      habitId: 'h1',
      label: 'Reading',
      minutes: 25,
      mode: 'pomodoro',
      date: '2026-11-07',
      completedAt: 100,
    },
  ];
  const ledger = calculateIslandLedger([mockNormalHabit], completions, sessions, '2026-11-07');
  assert.equal(ledger.checks, 7);
  assert.equal(ledger.focusMinutes, 25);
  assert.equal(ledger.perfectDays, 7);
  assert.equal(ledger.milestones, 30); // 7-day streak milestone = +30
  assert.equal(ledger.totalEarned, 7 * 10 + 25 * 1 + 7 * 25 + 30);
});

test('parseHabitImportCSV parses Loop Habit Tracker wide matrix and HabitBull/Generic CSVs', () => {
  const loopCsv = [
    'Date,Read Books,Meditate',
    '2026-11-10,2,2',
    '2026-11-11,2,0',
    '2026-11-12,2,2',
  ].join('\n');
  const loopResult = parseHabitImportCSV(loopCsv, '2026-11-12');
  assert.equal(loopResult.source, 'Loop Habit Tracker');
  assert.equal(loopResult.habits.length, 2);
  assert.equal(loopResult.entriesCount, 5);

  const habitBullCsv = [
    'HabitName,CalendarDate,Value',
    'Morning Stretch,2026-11-11,1',
    'Morning Stretch,2026-11-12,1',
  ].join('\n');
  const hbResult = parseHabitImportCSV(habitBullCsv, '2026-11-12');
  assert.equal(hbResult.source, 'HabitBull');
  assert.equal(hbResult.habits.length, 1);
  assert.equal(hbResult.entriesCount, 2);
});

test('triggerHaptic calls window.navigator.vibrate with iOS patterns and respects setHapticsEnabled', () => {
  const calls: (number | number[])[] = [];
  (globalThis as unknown as { window: unknown }).window = {
    navigator: {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    },
  };

  setHapticsEnabled(true);
  assert.equal(triggerHaptic('success'), true);
  assert.deepEqual(calls[0], HAPTIC_PATTERNS.success);

  assert.equal(triggerHaptic('light'), true);
  assert.deepEqual(calls[1], HAPTIC_PATTERNS.light);

  setHapticsEnabled(false);
  assert.equal(triggerHaptic('heavy'), false);
  assert.equal(calls.length, 2);
  setHapticsEnabled(true);
});

test('buildShowcaseDuplicateData creates duplicate & showcase habits, 320-day completions, focus sessions, and island state without mutating original input', () => {
  const origHabits = [mockNormalHabit];
  const origCompletions: HabitCompletion[] = [
    {
      id: 'h1_2026-11-12',
      habitId: 'h1',
      date: '2026-11-12',
      value: 1,
      completed: true,
      updatedAt: 1,
    },
  ];

  const showcase = buildShowcaseDuplicateData('2026-11-12', origHabits, origCompletions);

  // Original input remains unmutated
  assert.equal(origHabits.length, 1);
  assert.equal(origCompletions.length, 1);

  // Showcase includes original habit + duplicated variant + extra showcase templates
  assert.ok(showcase.habits.length >= 8);
  assert.ok(showcase.habits.some((h) => h.id === 'showcase-dup-h1'));
  assert.ok(showcase.habits.some((h) => h.id === 'showcase-deep-work'));
  assert.ok(showcase.completions.length > 500);
  assert.equal(showcase.focusSessions.length, 8);
  assert.ok(showcase.islandState.unlockedIds.length >= 9);
});

test('getHourlyQuoteSlot and selectHourlyMotivationalQuote rotate motivational quote every single hour and on manual reload', () => {
  const baseTime = 1762988400000; // arbitrary timestamp
  const slot1 = getHourlyQuoteSlot(baseTime);
  const slot2 = getHourlyQuoteSlot(baseTime + 3600000); // +1 hour

  assert.equal(slot2, slot1 + 1);

  const q1 = selectHourlyMotivationalQuote(slot1, 0, []);
  const q2 = selectHourlyMotivationalQuote(slot2, 0, []);
  const qReload = selectHourlyMotivationalQuote(slot1, 1, []);

  assert.notEqual(q1, q2);
  assert.equal(q2, qReload);
  assert.ok(q1.length <= MAX_SINGLE_LINE_QUOTE_LENGTH);
  assert.ok(q2.length <= MAX_SINGLE_LINE_QUOTE_LENGTH);

  // Oversized multi-line quote is skipped in favor of a single-line quote
  const oversized =
    'This quote is intentionally way too long and would wrap onto multiple lines on a mobile screen so it must be skipped.';
  const filtered = selectHourlyMotivationalQuote(slot1, 0, [oversized]);
  assert.notEqual(filtered, oversized);
  assert.ok(filtered.length <= MAX_SINGLE_LINE_QUOTE_LENGTH);
});

test('generateFullExportCSV exports Habit Summary, Habit Log, and Timer Log rows with full month, date, year, and weekday details', () => {
  const completions: HabitCompletion[] = [
    {
      id: 'h1_2026-11-12',
      habitId: 'h1',
      date: '2026-11-12',
      value: 1,
      completed: true,
      updatedAt: 1762948800000,
    },
  ];
  const sessions: FocusSession[] = [
    {
      id: 'f1',
      habitId: 'h1',
      label: 'Read 20 mins',
      minutes: 35,
      mode: 'pomodoro',
      date: '2026-11-12',
      completedAt: 1762952400000,
    },
  ];

  const csv = generateFullExportCSV(
    [mockNormalHabit],
    completions,
    sessions,
    '2026-11-12'
  );
  const lines = csv.split('\n');

  assert.equal(lines.length, 4); // 1 header + 1 Habit Summary + 1 Habit Log + 1 Timer Log
  assert.ok(lines[0].includes('RecordType,Date,Year,MonthNumber,MonthName,DayOfMonth,DayOfWeek'));
  assert.ok(lines[1].startsWith('Habit Summary,'));
  assert.ok(lines[2].startsWith('Habit Log,2026-11-12,2026,11,November,12,Thursday,'));
  assert.ok(lines[3].startsWith('Timer Log,2026-11-12,2026,11,November,12,Thursday,'));
  assert.ok(lines[3].includes(',pomodoro,35,'));

  // Round-trip import of Streak Full Export CSV restores habits, completions, and timer logs
  const roundTrip = parseHabitImportCSV(csv, '2026-11-12');
  assert.equal(roundTrip.source, 'Streak CSV Backup');
  assert.equal(roundTrip.habits.length, 1);
  assert.equal(roundTrip.habits[0].name, 'Read 20 mins');
  assert.equal(roundTrip.completions.length, 1);
  assert.equal(roundTrip.completions[0].date, '2026-11-12');
  assert.equal(roundTrip.focusSessions.length, 1);
  assert.equal(roundTrip.focusSessions[0].minutes, 35);
  assert.equal(roundTrip.focusSessions[0].mode, 'pomodoro');
});

test('buildWeeklyPerformanceDigest computes 7-day completion rate, top habit, focus habit, and actionable summary', () => {
  const completions: HabitCompletion[] = [];
  // Complete mockNormalHabit 6 of last 7 days, mockAmountHabit 3 of last 7 days
  for (let i = 0; i < 6; i++) {
    const d = addDays('2026-11-12', -i);
    completions.push({
      id: `h1_${d}`,
      habitId: 'h1',
      date: d,
      value: 1,
      completed: true,
      updatedAt: 1,
    });
  }
  for (let i = 0; i < 3; i++) {
    const d = addDays('2026-11-12', -i);
    completions.push({
      id: `h2_${d}`,
      habitId: 'h2',
      date: d,
      value: 3,
      completed: true,
      updatedAt: 1,
    });
  }

  const digest = buildWeeklyPerformanceDigest(
    [mockNormalHabit, mockAmountHabit],
    completions,
    '2026-11-12',
    'All Habits'
  );

  assert.equal(digest.totalCompletedThisWeek, 9);
  assert.equal(digest.totalScheduledThisWeek, 14);
  assert.equal(digest.weekCompletionRate, Math.round((9 / 14) * 100));
  assert.equal(digest.topHabitName, 'Read 20 mins');
  assert.equal(digest.focusHabitName, 'Hydrate');
  assert.equal(digest.bestStreakDays, 6);
  assert.ok(digest.fallbackSummary.includes('Read 20 mins'));
});

test('buildHabitCompletionTrends builds per-habit dynamic line chart series with rolling rate, cumulative completions, and daily values', () => {
  const completions: HabitCompletion[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays('2026-11-12', -i);
    completions.push({
      id: `h1_${d}`,
      habitId: 'h1',
      date: d,
      value: 1,
      completed: true,
      updatedAt: 1,
    });
  }
  completions.push({
    id: 'h2_2026-11-12',
    habitId: 'h2',
    date: '2026-11-12',
    value: 3,
    completed: true,
    updatedAt: 1,
  });

  const trends = buildHabitCompletionTrends(
    [mockNormalHabit, mockAmountHabit],
    completions,
    '2026-11-12',
    14
  );

  assert.equal(trends.windowDays, 14);
  assert.equal(trends.multiHabitSeries.length, 14);
  assert.equal(trends.perHabitTrends.length, 2);

  const h1Trend = trends.perHabitTrends.find((t) => t.habitId === 'h1')!;
  const h2Trend = trends.perHabitTrends.find((t) => t.habitId === 'h2')!;

  assert.equal(h1Trend.currentRollingRate, 100);
  assert.equal(h1Trend.totalCompletedInWindow, 7);
  assert.equal(h1Trend.points.length, 14);
  assert.equal(h1Trend.points[13].cumulative, 7);

  assert.equal(h2Trend.totalCompletedInWindow, 1);
  assert.equal(h2Trend.points[13].dailyValue, 3);
  assert.equal(trends.multiHabitSeries[13]['h1_rate'], 100);
});
