import {
  Habit,
  HabitCompletion,
  HabitSchedule,
  FocusSession,
  IslandState,
} from '../types/habit';

export interface HeatmapCell {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  ratio: number;
}

/**
 * Format a Date object into local YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a local Date at noon (to avoid DST shifts)
 */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export function addDays(dateStr: string, delta: number): string {
  const dt = parseDateKey(dateStr);
  dt.setDate(dt.getDate() + delta);
  return formatDateKey(dt);
}

/**
 * Difference in calendar days between two YYYY-MM-DD strings (a - b)
 */
export function diffDays(dateA: string, dateB: string): number {
  const a = parseDateKey(dateA);
  const b = parseDateKey(dateB);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Human-readable schedule summary (Streak style)
 */
export function formatScheduleLabel(schedule: HabitSchedule): string {
  switch (schedule.type) {
    case 'everyday':
      return 'Every day';
    case 'weekdays': {
      const days = schedule.weekdays ?? [];
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && !days.includes(0) && !days.includes(6))
        return 'Weekdays';
      if (days.length === 2 && days.includes(0) && days.includes(6))
        return 'Weekends';
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days.map((d) => names[d]).join(', ');
    }
    case 'times_per_week':
      return `${schedule.timesPerWeek ?? 3}x / week`;
    case 'times_per_month':
      return `${schedule.timesPerMonth ?? 10}x / month`;
    case 'every_n_days':
      return `Every ${schedule.everyNDays ?? schedule.intervalDays ?? 2} days`;
    default:
      return 'Every day';
  }
}

/**
 * Determine whether a habit is scheduled on a given YYYY-MM-DD date.
 */
export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.archived) return false;
  const { schedule } = habit;
  const dateObj = parseDateKey(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0..6

  switch (schedule.type) {
    case 'everyday':
      return true;
    case 'weekdays': {
      const days = schedule.weekdays ?? [0, 1, 2, 3, 4, 5, 6];
      return days.includes(dayOfWeek);
    }
    case 'every_n_days': {
      const n = Math.max(1, schedule.everyNDays ?? schedule.intervalDays ?? 2);
      const anchor = (schedule.anchorDate || habit.createdAt || dateStr).slice(
        0,
        10
      );
      const diff = diffDays(dateStr, anchor);
      if (diff < 0) return true;
      return diff % n === 0;
    }
    case 'times_per_week':
    case 'times_per_month':
      return true;
    default:
      return true;
  }
}

export function getHabitTarget(habit: Habit): number {
  const raw = habit.target ?? habit.dailyTarget ?? 1;
  return raw > 0 ? raw : 1;
}

/**
 * Evaluate if a completion record satisfies the habit's goal for a day
 */
export function isEntryCompleted(
  habit: Habit,
  record: HabitCompletion | undefined
): boolean {
  if (!record) return false;
  if (habit.type === 'amount') {
    const target = getHabitTarget(habit);
    return record.value >= target;
  }
  if (habit.type === 'avoid') {
    return record.completed && record.value > 0;
  }
  return record.completed && record.value > 0;
}

export const isHabitCompletedOnDate = isEntryCompleted;

/**
 * Return intensity level 0..4 for heatmap cells (Streak / GitHub style)
 */
export function getEntryIntensity(
  habit: Habit,
  record: HabitCompletion | undefined
): 0 | 1 | 2 | 3 | 4 {
  if (!record) return 0;
  if (habit.type === 'amount') {
    const target = getHabitTarget(habit);
    if (record.value <= 0) return 0;
    const ratio = record.value / target;
    if (ratio >= 1) return 4;
    if (ratio >= 0.7) return 3;
    if (ratio >= 0.35) return 2;
    return 1;
  }
  if (habit.type === 'avoid') {
    if (record.value < 0) return 0;
    return record.completed ? 4 : 0;
  }
  return record.completed ? 4 : 0;
}

/**
 * Calculate Habit Strength (0..100%) using InlitX/streak's exact exponential
 * 12-day half-life over a 90-day window (`lib/features/habits/data/habit.dart`: `_strength()`).
 * Instead of resetting to 0 on a missed day like a raw streak, habit strength
 * builds with consistency and decays gradually on missed days.
 */
export function calculateHabitStrength(
  habit: Habit,
  recordsInput: Record<string, HabitCompletion> | HabitCompletion[],
  referenceDateStr: string
): {
  ratio: number; // 0.0 .. 1.0
  percentage: number; // 0 .. 100
  label: 'Starting' | 'Building' | 'Steady' | 'Strong' | 'Unbreakable';
} {
  const list = Array.isArray(recordsInput)
    ? recordsInput
    : Object.values(recordsInput);
  const byDate = new Map<string, HabitCompletion>();
  for (const r of list) {
    if (r.habitId === habit.id) {
      byDate.set(r.date, r);
    }
  }

  if (byDate.size === 0 && habit.type !== 'avoid') {
    return { ratio: 0, percentage: 0, label: 'Starting' };
  }

  const createdKey = (habit.createdAt || referenceDateStr).slice(0, 10);
  let floorDate = createdKey;
  for (const d of byDate.keys()) {
    if (d < floorDate) floorDate = d;
  }

  const halfLife = 12.0;
  const windowDays = 90;
  let score = 0.0;
  let norm = 0.0;
  const target = getHabitTarget(habit);

  for (let i = 0; i < windowDays; i++) {
    const dayStr = addDays(referenceDateStr, -i);
    if (dayStr < floorDate) continue;
    if (!isHabitScheduledOnDate(habit, dayStr)) continue;

    // If today isn't completed yet, don't penalize today's in-progress weight
    const rec = byDate.get(dayStr);
    if (i === 0 && !rec) continue;

    const weight = Math.pow(0.5, i / halfLife);
    norm += weight;

    let dayVal = 0.0;
    if (habit.type === 'amount') {
      const val = rec?.value ?? 0;
      dayVal = Math.min(1, Math.max(0, val / target));
    } else if (habit.type === 'avoid') {
      if (rec) {
        dayVal = rec.value > 0 && rec.completed ? 1.0 : 0.0;
      } else {
        dayVal = 0.0;
      }
    } else {
      dayVal = isEntryCompleted(habit, rec) ? 1.0 : 0.0;
    }

    score += weight * dayVal;
  }

  const ratio = norm === 0 ? 0 : Math.min(1, Math.max(0, score / norm));
  const percentage = Math.round(ratio * 100);

  let label: 'Starting' | 'Building' | 'Steady' | 'Strong' | 'Unbreakable' =
    'Starting';
  if (percentage >= 90) label = 'Unbreakable';
  else if (percentage >= 75) label = 'Strong';
  else if (percentage >= 50) label = 'Steady';
  else if (percentage >= 20) label = 'Building';

  return { ratio, percentage, label };
}

/**
 * Calculate Current Streak, Longest Streak, Total Completions, and Completion Rate (%)
 * up to a reference date (typically today).
 */
export function calculateHabitStats(
  habit: Habit,
  recordsInput: Record<string, HabitCompletion> | HabitCompletion[],
  referenceDateStr: string
): {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  strength: number;
} {
  const list = Array.isArray(recordsInput)
    ? recordsInput
    : Object.values(recordsInput);
  const allRecords = list.filter((r) => r.habitId === habit.id);
  const completedDatesSet = new Set<string>();

  for (const r of allRecords) {
    if (isEntryCompleted(habit, r)) {
      completedDatesSet.add(r.date);
    }
  }

  const totalCompletions = completedDatesSet.size;

  const createdKey = (habit.createdAt || referenceDateStr).slice(0, 10);
  let earliestStr = createdKey || addDays(referenceDateStr, -30);
  for (const d of completedDatesSet) {
    if (d < earliestStr) earliestStr = d;
  }
  if (earliestStr > referenceDateStr) {
    earliestStr = addDays(referenceDateStr, -30);
  }

  const totalDaysSpan = Math.max(
    1,
    diffDays(referenceDateStr, earliestStr) + 1
  );

  let currentStreak = 0;
  let cursor = referenceDateStr;

  if (!completedDatesSet.has(cursor)) {
    cursor = addDays(referenceDateStr, -1);
  }

  for (let i = 0; i < 400; i++) {
    const d = addDays(cursor, -i);
    if (completedDatesSet.has(d)) {
      currentStreak++;
    } else if (!isHabitScheduledOnDate(habit, d)) {
      continue;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < totalDaysSpan; i++) {
    const d = addDays(earliestStr, i);
    const scheduled = isHabitScheduledOnDate(habit, d);
    const done = completedDatesSet.has(d);

    if (done) {
      runningStreak++;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else if (scheduled) {
      runningStreak = 0;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const rateWindowDays = Math.min(30, Math.max(7, totalDaysSpan));
  let windowScheduled = 0;
  let windowCompleted = 0;
  for (let i = 0; i < rateWindowDays; i++) {
    const d = addDays(referenceDateStr, -i);
    if (isHabitScheduledOnDate(habit, d)) {
      windowScheduled++;
      if (completedDatesSet.has(d)) {
        windowCompleted++;
      }
    }
  }

  const completionRate =
    windowScheduled > 0
      ? Math.min(100, Math.round((windowCompleted / windowScheduled) * 100))
      : 0;

  const strengthObj = calculateHabitStrength(
    habit,
    allRecords,
    referenceDateStr
  );

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    strength: strengthObj.percentage,
  };
}

export function calculateStreak(
  habit: Habit,
  completions: HabitCompletion[] | Record<string, HabitCompletion>,
  referenceDateStr: string
): {
  current: number;
  longest: number;
  totalCompletions: number;
} {
  const stats = calculateHabitStats(habit, completions, referenceDateStr);
  return {
    current: stats.currentStreak,
    longest: stats.longestStreak,
    totalCompletions: stats.totalCompletions,
  };
}

export function calculateCompletionRate(
  habit: Habit,
  completions: HabitCompletion[] | Record<string, HabitCompletion>,
  daysWindow: number,
  referenceDateStr: string
): number {
  const list = Array.isArray(completions)
    ? completions
    : Object.values(completions);
  const map = new Map<string, HabitCompletion>();
  for (const c of list) {
    if (c.habitId === habit.id) {
      map.set(c.date, c);
    }
  }

  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i < daysWindow; i++) {
    const d = addDays(referenceDateStr, -i);
    if (isHabitScheduledOnDate(habit, d)) {
      scheduled++;
      if (isEntryCompleted(habit, map.get(d))) {
        completed++;
      }
    }
  }
  return scheduled > 0
    ? Math.min(100, Math.round((completed / scheduled) * 100))
    : 0;
}

export function buildHabitHeatmapData(
  habit: Habit,
  completions: HabitCompletion[] | Record<string, HabitCompletion>,
  daysCount: number,
  referenceDateStr: string
): HeatmapCell[] {
  const list = Array.isArray(completions)
    ? completions
    : Object.values(completions);
  const map = new Map<string, HabitCompletion>();
  for (const c of list) {
    if (c.habitId === habit.id) {
      map.set(c.date, c);
    }
  }

  const cells: HeatmapCell[] = [];
  const target = getHabitTarget(habit);

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = addDays(referenceDateStr, -i);
    const rec = map.get(date);
    const level = getEntryIntensity(habit, rec);
    let ratio = 0;
    if (habit.type === 'amount' && rec) {
      ratio = Math.min(1, Math.max(0, rec.value / target));
    } else if (level > 0) {
      ratio = 1;
    }
    cells.push({ date, level, ratio });
  }

  return cells;
}

export function buildOverallHeatmapData(
  habits: Habit[],
  completions: HabitCompletion[] | Record<string, HabitCompletion>,
  daysCount: number,
  referenceDateStr: string
): HeatmapCell[] {
  const list = Array.isArray(completions)
    ? completions
    : Object.values(completions);
  const byDate = new Map<string, Map<string, HabitCompletion>>();
  for (const c of list) {
    if (!byDate.has(c.date)) {
      byDate.set(c.date, new Map());
    }
    byDate.get(c.date)!.set(c.habitId, c);
  }

  const activeHabits = habits.filter((h) => !h.archived);
  const cells: HeatmapCell[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = addDays(referenceDateStr, -i);
    const dayMap = byDate.get(date);
    let scheduled = 0;
    let completed = 0;

    for (const h of activeHabits) {
      if (isHabitScheduledOnDate(h, date)) {
        scheduled++;
        if (isEntryCompleted(h, dayMap?.get(h.id))) {
          completed++;
        }
      }
    }

    const ratio = scheduled > 0 ? completed / scheduled : 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (ratio >= 0.95) level = 4;
    else if (ratio >= 0.65) level = 3;
    else if (ratio >= 0.35) level = 2;
    else if (ratio > 0) level = 1;

    cells.push({ date, level, ratio });
  }

  return cells;
}

/**
 * Island Ledger Coin Economy matching InlitX/streak (`lib/features/island/data/island_ledger.dart`)
 * - 10 coins per habit completion check
 * - 1 coin per focus minute
 * - 25 coins per perfect day
 * - Milestone bonuses per habit longestStreak: 7d (+30), 30d (+150), 100d (+600), 365d (+2500)
 */
export interface IslandLedgerSummary {
  checks: number;
  focusMinutes: number;
  perfectDays: number;
  milestones: number;
  totalEarned: number;
}

export function calculateIslandLedger(
  habits: Habit[],
  completions: HabitCompletion[],
  focusSessions: FocusSession[],
  referenceDateStr: string
): IslandLedgerSummary {
  const activeHabits = habits.filter((h) => !h.archived);
  let checks = 0;
  let milestones = 0;
  const checkedDates = new Set<string>();

  const milestoneSteps: [number, number][] = [
    [7, 30],
    [30, 150],
    [100, 600],
    [365, 2500],
  ];

  const compByHabitDate = new Map<string, HabitCompletion>();
  for (const c of completions) {
    compByHabitDate.set(`${c.habitId}_${c.date}`, c);
  }

  for (const h of activeHabits) {
    const streak = calculateStreak(h, completions, referenceDateStr);
    for (const [daysReq, bonus] of milestoneSteps) {
      if (streak.longest >= daysReq) {
        milestones += bonus;
      }
    }

    const hComps = completions.filter(
      (c) => c.habitId === h.id && c.date <= referenceDateStr
    );
    for (const c of hComps) {
      if (isEntryCompleted(h, c)) {
        checks++;
        checkedDates.add(c.date);
      }
    }
  }

  let perfectDays = 0;
  for (const dateStr of checkedDates) {
    let dueCount = 0;
    let allDone = true;
    for (const h of activeHabits) {
      if (isHabitScheduledOnDate(h, dateStr)) {
        dueCount++;
        const rec = compByHabitDate.get(`${h.id}_${dateStr}`);
        if (!isEntryCompleted(h, rec)) {
          allDone = false;
          break;
        }
      }
    }
    if (dueCount > 0 && allDone) {
      perfectDays++;
    }
  }

  const focusMinutes = focusSessions.reduce(
    (sum, s) => sum + Math.max(0, s.minutes),
    0
  );

  const totalEarned =
    checks * 10 + focusMinutes * 1 + perfectDays * 25 + milestones;

  return {
    checks,
    focusMinutes,
    perfectDays,
    milestones,
    totalEarned,
  };
}

/**
 * Parse CSV exports from Loop Habit Tracker, HabitKit, Habitica, HabitBull, or Generic CSV
 * matching `lib/services/import_service.dart` in InlitX/streak.
 */
const IMPORT_PALETTE = [
  '#7C3AED',
  '#5856D6',
  '#30D158',
  '#5AC8FA',
  '#FF9500',
  '#4ECDC4',
  '#FF2D55',
  '#AF52DE',
];

function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeDateToken(raw: string): string | null {
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  // YYYY/MM/DD
  const slashMatch = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[3].padStart(2, '0')}`;
  }
  // MM/DD/YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const year = dmyMatch[3];
    const month = p1 > 12 ? p2 : p1;
    const day = p1 > 12 ? p1 : p2;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

export function parseHabitImportCSV(
  rawText: string,
  todayStr: string
): {
  source: string;
  habits: Habit[];
  completions: HabitCompletion[];
  focusSessions: FocusSession[];
  entriesCount: number;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row.');
  }

  const headerCols = splitCsvRow(lines[0]);
  const lowerHeader = headerCols.map((h) => h.toLowerCase());

  // Case 0: Streak Full Export CSV (`RecordType,Date,Year,MonthNumber,MonthName,...`)
  if (lowerHeader[0] === 'recordtype' && lowerHeader.includes('habitname')) {
    const habitById = new Map<string, Habit>();
    const completionsMap = new Map<string, HabitCompletion>();
    const focusSessions: FocusSession[] = [];

    const idxRecordType = lowerHeader.indexOf('recordtype');
    const idxDate = lowerHeader.indexOf('date');
    const idxTimestamp = lowerHeader.indexOf('timestampiso');
    const idxHabitId = lowerHeader.indexOf('habitid');
    const idxHabitName = lowerHeader.indexOf('habitname');
    const idxCategory = lowerHeader.indexOf('category');
    const idxHabitType = lowerHeader.indexOf('habittype');
    const idxSchedule = lowerHeader.indexOf('scheduletype');
    const idxStatus = lowerHeader.indexOf('status');
    const idxVal = lowerHeader.indexOf('loggedvalue');
    const idxTarget = lowerHeader.indexOf('dailytarget');
    const idxUnit = lowerHeader.indexOf('unit');
    const idxTimerMode = lowerHeader.indexOf('timermode');
    const idxTimerMins = lowerHeader.indexOf('timerdurationminutes');

    for (let r = 1; r < lines.length; r++) {
      const cols = splitCsvRow(lines[r]);
      const recType = (cols[idxRecordType] || '').trim().toLowerCase();
      const dateStr = normalizeDateToken(cols[idxDate] || '') || todayStr;
      const habitId = (cols[idxHabitId] || '').trim() || `import-habit-${r}`;
      const habitName = (cols[idxHabitName] || '').trim() || 'Imported Habit';
      const category = (cols[idxCategory] || 'General').trim();
      const rawType = (cols[idxHabitType] || 'normal').trim().toLowerCase();
      const hType: 'normal' | 'amount' | 'avoid' =
        rawType === 'amount' || rawType === 'avoid' ? rawType : 'normal';
      const rawSched = (cols[idxSchedule] || 'everyday').trim();
      const status = (cols[idxStatus] || '').trim().toLowerCase();
      const numVal = Number(cols[idxVal] || '1');
      const numTarget = Number(cols[idxTarget] || '1');
      const unitStr = (cols[idxUnit] || '').trim();

      if (recType === 'habit summary') {
        const idx = habitById.size;
        habitById.set(habitId, {
          id: habitId,
          name: habitName,
          icon: 'Sparkles',
          type: hType,
          category: category || 'General',
          color: IMPORT_PALETTE[idx % IMPORT_PALETTE.length],
          target: !Number.isNaN(numTarget) && numTarget > 0 ? numTarget : 1,
          dailyTarget: !Number.isNaN(numTarget) && numTarget > 0 ? numTarget : 1,
          unit: hType === 'amount' ? unitStr || 'units' : undefined,
          schedule: {
            type:
              rawSched === 'weekdays' ||
              rawSched === 'times_per_week' ||
              rawSched === 'times_per_month' ||
              rawSched === 'every_n_days'
                ? rawSched
                : 'everyday',
          },
          reminders: [],
          order: idx,
          archived: status === 'archived',
          createdAt: dateStr,
        });
      } else if (recType === 'habit log') {
        if (!habitById.has(habitId)) {
          const idx = habitById.size;
          habitById.set(habitId, {
            id: habitId,
            name: habitName,
            icon: 'Sparkles',
            type: hType,
            category: category || 'General',
            color: IMPORT_PALETTE[idx % IMPORT_PALETTE.length],
            target: !Number.isNaN(numTarget) && numTarget > 0 ? numTarget : 1,
            dailyTarget:
              !Number.isNaN(numTarget) && numTarget > 0 ? numTarget : 1,
            unit: hType === 'amount' ? unitStr || 'units' : undefined,
            schedule: { type: 'everyday' },
            reminders: [],
            order: idx,
            archived: false,
            createdAt: addDays(todayStr, -90),
          });
        }
        const compId = `${habitId}_${dateStr}`;
        const val = !Number.isNaN(numVal) ? numVal : 1;
        completionsMap.set(compId, {
          id: compId,
          habitId,
          date: dateStr,
          value: val,
          completed: status === 'completed',
          updatedAt:
            idxTimestamp >= 0 && cols[idxTimestamp]
              ? Date.parse(cols[idxTimestamp]) || Date.now()
              : Date.now(),
        });
      } else if (recType === 'timer log') {
        const mins =
          Number(cols[idxTimerMins] || cols[idxVal] || '25') || 25;
        const modeRaw = (cols[idxTimerMode] || 'pomodoro')
          .trim()
          .toLowerCase();
        focusSessions.push({
          id: `import-focus-${Date.now()}-${r}`,
          habitId: habitId !== 'free-focus' ? habitId : undefined,
          label: habitName,
          minutes: mins,
          mode: modeRaw === 'free' ? 'free' : 'pomodoro',
          date: dateStr,
          completedAt:
            idxTimestamp >= 0 && cols[idxTimestamp]
              ? Date.parse(cols[idxTimestamp]) || Date.now()
              : Date.now(),
        });
      }
    }

    const habits = Array.from(habitById.values());
    const completions = Array.from(completionsMap.values());
    if (habits.length === 0 && focusSessions.length === 0) {
      throw new Error('No valid records found in Cadence CSV export.');
    }
    return {
      source: 'Cadence CSV Backup',
      habits,
      completions,
      focusSessions,
      entriesCount: completions.length + focusSessions.length,
    };
  }

  // Case 1: Loop Habit Tracker wide matrix format:
  // Header: Date, Habit A, Habit B, Habit C...
  const firstColIsDate =
    lowerHeader[0] === 'date' || lowerHeader[0] === 'timestamp';
  const hasKnownColumnNames = lowerHeader.some((h) =>
    ['habit', 'habit name', 'habitname', 'name', 'title', 'task'].includes(h)
  );

  const habitMap = new Map<string, Habit>();
  const completionsMap = new Map<string, HabitCompletion>();
  let detectedSource = 'CSV Import';

  const getOrCreateHabit = (
    name: string,
    type: 'normal' | 'amount' | 'avoid' = 'normal',
    unit?: string
  ): Habit => {
    const key = name.trim().toLowerCase();
    const existing = habitMap.get(key);
    if (existing) return existing;

    const idx = habitMap.size;
    const created: Habit = {
      id: `import-habit-${Date.now()}-${idx}`,
      name: name.trim(),
      icon: 'Sparkles',
      type,
      unit,
      target: type === 'amount' ? 1 : 1,
      dailyTarget: type === 'amount' ? 1 : 1,
      category: 'Imported',
      color: IMPORT_PALETTE[idx % IMPORT_PALETTE.length],
      schedule: { type: 'everyday' },
      reminders: [],
      order: idx,
      archived: false,
      createdAt: addDays(todayStr, -90),
    };
    habitMap.set(key, created);
    return created;
  };

  if (firstColIsDate && !hasKnownColumnNames && headerCols.length >= 2) {
    // Loop Habit Tracker wide table (`Checkmarks.csv` / `Scores.csv`)
    detectedSource = 'Loop Habit Tracker';
    const habitColumns = headerCols.slice(1);
    for (const hName of habitColumns) {
      if (hName) getOrCreateHabit(hName);
    }

    for (let r = 1; r < lines.length; r++) {
      const cols = splitCsvRow(lines[r]);
      const dateStr = normalizeDateToken(cols[0] || '');
      if (!dateStr) continue;

      for (let c = 1; c < cols.length && c <= habitColumns.length; c++) {
        const hName = habitColumns[c - 1];
        if (!hName) continue;
        const rawVal = (cols[c] || '').trim();
        const numVal = Number(rawVal);
        // In Loop Habit Tracker, 2 = YES_MANUAL, >0 in scores/values = completed
        if (
          rawVal === '2' ||
          rawVal === '1' ||
          rawVal.toLowerCase() === 'yes' ||
          rawVal.toLowerCase() === 'true' ||
          (!Number.isNaN(numVal) && numVal > 0)
        ) {
          const habit = getOrCreateHabit(hName);
          const compId = `${habit.id}_${dateStr}`;
          completionsMap.set(compId, {
            id: compId,
            habitId: habit.id,
            date: dateStr,
            value: numVal > 2 ? Math.round(numVal / 1000) || 1 : 1,
            completed: true,
            updatedAt: Date.now(),
          });
        }
      }
    }
  } else {
    // Row-based CSV: HabitBull, HabitKit, Habitica, Cadence CSV, or Generic CSV
    const nameIdx = lowerHeader.findIndex((h) =>
      [
        'habitname',
        'habit name',
        'habit',
        'name',
        'title',
        'task',
      ].includes(h)
    );
    const dateIdx = lowerHeader.findIndex((h) =>
      [
        'calendardate',
        'calendar date',
        'date',
        'day',
        'timestamp',
        'completed_at',
      ].includes(h)
    );
    const valIdx = lowerHeader.findIndex((h) =>
      ['value', 'count', 'amount', 'status', 'completed', 'done'].includes(h)
    );
    const unitIdx = lowerHeader.findIndex((h) => ['unit', 'units'].includes(h));

    if (lowerHeader.includes('calendardate') || lowerHeader.includes('habitname')) {
      detectedSource = 'HabitBull';
    } else if (lowerHeader.includes('streak') || lowerHeader.includes('habitkit')) {
      detectedSource = 'HabitKit';
    } else if (lowerHeader.includes('task') || lowerHeader.includes('habitica')) {
      detectedSource = 'Habitica';
    }

    const effectiveNameIdx = nameIdx >= 0 ? nameIdx : 1;
    const effectiveDateIdx = dateIdx >= 0 ? dateIdx : 0;

    for (let r = 1; r < lines.length; r++) {
      const cols = splitCsvRow(lines[r]);
      if (cols.length < 2) continue;

      const rawDate =
        cols[effectiveDateIdx] ?? cols[0] ?? '';
      const rawName =
        cols[effectiveNameIdx] ?? cols[1] ?? '';

      const dateStr = normalizeDateToken(rawDate) || normalizeDateToken(cols[0] || '') || normalizeDateToken(cols[1] || '');
      const habitName = rawName && !normalizeDateToken(rawName) ? rawName : cols[0] && !normalizeDateToken(cols[0]) ? cols[0] : cols[1];

      if (!dateStr || !habitName) continue;

      const rawVal = valIdx >= 0 ? (cols[valIdx] || '1').trim() : '1';
      const lowerVal = rawVal.toLowerCase();
      if (
        lowerVal === '0' ||
        lowerVal === 'no' ||
        lowerVal === 'false' ||
        lowerVal === 'missed'
      ) {
        getOrCreateHabit(habitName);
        continue;
      }

      const numericVal = Number(rawVal);
      const val = !Number.isNaN(numericVal) && numericVal > 0 ? numericVal : 1;
      const unitStr = unitIdx >= 0 ? cols[unitIdx] : undefined;
      const habit = getOrCreateHabit(
        habitName,
        val > 1 || unitStr ? 'amount' : 'normal',
        unitStr || undefined
      );
      if (val > (habit.target || 1)) {
        habit.target = val;
        habit.dailyTarget = val;
      }

      const compId = `${habit.id}_${dateStr}`;
      completionsMap.set(compId, {
        id: compId,
        habitId: habit.id,
        date: dateStr,
        value: val,
        completed: true,
        updatedAt: Date.now(),
      });
    }
  }

  const habits = Array.from(habitMap.values());
  const completions = Array.from(completionsMap.values());

  if (habits.length === 0) {
    throw new Error('No valid habits or dates found in the CSV file.');
  }

  return {
    source: detectedSource,
    habits,
    completions,
    focusSessions: [],
    entriesCount: completions.length,
  };
}

export interface ShowcaseDataset {
  habits: Habit[];
  completions: HabitCompletion[];
  focusSessions: FocusSession[];
  islandState: IslandState;
}

/**
 * Generates rich duplicate & showcase data for app demonstration while keeping
 * original data untouched in a snapshot so the user can switch back at any time.
 */
export function buildShowcaseDuplicateData(
  todayStr: string,
  originalHabits: Habit[],
  originalCompletions: HabitCompletion[]
): ShowcaseDataset {
  const createdStr = addDays(todayStr, -340);
  const coverCycle = [
    'aurora_violet',
    'midnight_peaks',
    'emerald_forest',
    'sunset_dunes',
    'ocean_tide',
  ];

  // 1. Keep original habits enhanced with cover images if missing
  const baseHabits: Habit[] = originalHabits.map((h, idx) => ({
    ...h,
    coverImage: h.coverImage || coverCycle[idx % coverCycle.length],
    order: idx,
  }));

  // 2. Duplicate / additional showcase habits to demonstrate every card type, category, and schedule
  const extraShowcaseTemplates: Omit<Habit, 'order'>[] = [
    {
      id: 'showcase-deep-work',
      name: 'Deep Work Sprint',
      icon: 'Flame',
      type: 'amount',
      category: 'Work',
      color: '#AF52DE',
      coverImage: 'aurora_violet',
      target: 90,
      dailyTarget: 90,
      unit: 'mins',
      schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
      reminders: [{ id: 'rem-sw-1', enabled: true, time: '09:30', days: [1, 2, 3, 4, 5] }],
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'showcase-zero-scrolling',
      name: 'No Late-Night Scrolling',
      icon: 'Moon',
      type: 'avoid',
      category: 'Mindfulness',
      color: '#FF2D55',
      coverImage: 'sunset_dunes',
      schedule: { type: 'everyday' },
      reminders: [{ id: 'rem-sw-2', enabled: true, time: '22:30', days: [0, 1, 2, 3, 4, 5, 6] }],
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'showcase-evening-journal',
      name: 'Evening Stoic Journal',
      icon: 'PenTool',
      type: 'normal',
      category: 'Mindfulness',
      color: '#FFCC00',
      coverImage: 'emerald_forest',
      schedule: { type: 'everyday' },
      reminders: [{ id: 'rem-sw-3', enabled: true, time: '21:00', days: [0, 1, 2, 3, 4, 5, 6] }],
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'showcase-Zone2-cycling',
      name: 'Zone 2 Cardio Ride',
      icon: 'Bike',
      type: 'amount',
      category: 'Fitness',
      color: '#34C759',
      coverImage: 'midnight_peaks',
      target: 45,
      dailyTarget: 45,
      unit: 'mins',
      schedule: { type: 'times_per_week', timesPerWeek: 4 },
      reminders: [],
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'showcase-cold-plunge',
      name: 'Morning Cold Plunge',
      icon: 'Sparkles',
      type: 'normal',
      category: 'Health',
      color: '#00C7BE',
      coverImage: 'ocean_tide',
      schedule: { type: 'everyday' },
      reminders: [],
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'showcase-archived-guitar',
      name: 'Acoustic Guitar Practice',
      icon: 'Music',
      type: 'amount',
      category: 'Learning',
      color: '#FF9500',
      coverImage: 'sunset_dunes',
      target: 30,
      dailyTarget: 30,
      unit: 'mins',
      schedule: { type: 'everyday' },
      reminders: [],
      archived: true,
      isSample: true,
      createdAt: createdStr,
    },
  ];

  // Also create a duplicated showcase variant of the first 2 user habits if they exist
  const duplicatedFromUser: Habit[] = originalHabits.slice(0, 2).map((h, i) => ({
    ...h,
    id: `showcase-dup-${h.id}`,
    name: `${h.name} (Pro Showcase)`,
    coverImage: coverCycle[(i + 2) % coverCycle.length],
    archived: false,
    isSample: true,
    order: baseHabits.length + i,
  }));

  const existingIds = new Set([
    ...baseHabits.map((h) => h.id),
    ...duplicatedFromUser.map((h) => h.id),
  ]);

  const filteredExtras: Habit[] = extraShowcaseTemplates
    .filter((t) => !existingIds.has(t.id))
    .map((t, i) => ({
      ...t,
      order: baseHabits.length + duplicatedFromUser.length + i,
    }));

  const allHabits: Habit[] = [
    ...baseHabits,
    ...duplicatedFromUser,
    ...filteredExtras,
  ];

  const completionMap = new Map<string, HabitCompletion>();
  for (const c of originalCompletions) {
    completionMap.set(`${c.habitId}_${c.date}`, c);
  }

  for (let offset = 320; offset >= 0; offset--) {
    const dateStr = addDays(todayStr, -offset);

    for (let hIdx = 0; hIdx < allHabits.length; hIdx++) {
      const h = allHabits[hIdx];
      if (!isHabitScheduledOnDate(h, dateStr)) continue;

      const key = `${h.id}_${dateStr}`;
      if (completionMap.has(key) && offset > 21) continue;

      const hash = (offset * 37 + (hIdx + 1) * 23) % 100;
      const isRecentStreak = offset <= 21;

      if (offset === 0) {
        // Complete ~85% of habits today for an impressive showcase progress ring
        if (hIdx % 6 !== 5) {
          const target = h.type === 'amount' ? h.target || h.dailyTarget || 1 : 1;
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: target,
            completed: true,
            updatedAt: Date.now(),
            isSample: true,
          });
        } else if (h.type === 'amount') {
          const target = h.target || h.dailyTarget || 8;
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: Math.max(1, Math.round(target * 0.75)),
            completed: false,
            updatedAt: Date.now(),
            isSample: true,
          });
        }
        continue;
      }

      if (h.type === 'amount') {
        const target = h.target || h.dailyTarget || 1;
        if (isRecentStreak || hash < 84) {
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: target,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        } else if (hash < 95) {
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: Math.max(1, Math.round(target * 0.6)),
            completed: false,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      } else if (h.type === 'avoid') {
        if (offset <= 45 || hash < 90) {
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: 1,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      } else {
        if (isRecentStreak || hash < 85) {
          completionMap.set(key, {
            id: key,
            habitId: h.id,
            date: dateStr,
            value: 1,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      }
    }
  }

  const focusSessions: FocusSession[] = [
    {
      id: 'showcase-focus-1',
      habitId: 'showcase-deep-work',
      label: 'Deep Work Architecture Sprint',
      minutes: 50,
      mode: 'pomodoro',
      date: todayStr,
      completedAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'showcase-focus-2',
      habitId: allHabits[0]?.id || 'sample-reading',
      label: 'Evening Literature Immersion',
      minutes: 25,
      mode: 'pomodoro',
      date: todayStr,
      completedAt: Date.now() - 3600000 * 5,
    },
    {
      id: 'showcase-focus-3',
      habitId: 'showcase-deep-work',
      label: 'Morning Flow State Block',
      minutes: 60,
      mode: 'free',
      date: addDays(todayStr, -1),
      completedAt: Date.now() - 86400000,
    },
    {
      id: 'showcase-focus-4',
      habitId: 'showcase-evening-journal',
      label: 'Reflective Writing & Synthesis',
      minutes: 30,
      mode: 'free',
      date: addDays(todayStr, -2),
      completedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'showcase-focus-5',
      habitId: 'showcase-deep-work',
      label: 'Double Pomodoro Sprint',
      minutes: 50,
      mode: 'pomodoro',
      date: addDays(todayStr, -3),
      completedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'showcase-focus-6',
      habitId: 'showcase-Zone2-cycling',
      label: 'Mindful Endurance Session',
      minutes: 45,
      mode: 'free',
      date: addDays(todayStr, -4),
      completedAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'showcase-focus-7',
      habitId: 'showcase-deep-work',
      label: 'Deep Research Pomodoro',
      minutes: 40,
      mode: 'pomodoro',
      date: addDays(todayStr, -5),
      completedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'showcase-focus-8',
      habitId: 'showcase-evening-journal',
      label: 'Weekly Review Session',
      minutes: 35,
      mode: 'free',
      date: addDays(todayStr, -6),
      completedAt: Date.now() - 86400000 * 6,
    },
  ];

  const islandState: IslandState = {
    name: 'Aegean Showcase Sanctuary',
    unlockedIds: [
      'pueblo_villa',
      'cala_lighthouse',
      'huerta_olive',
      'caleta_boat',
      'molino_windmill',
      'capilla_chapel',
      'puente_arch',
      'terrazas_cliff',
      'faro_sol',
    ],
    rotation: 0,
    lighting: 'sunset',
  };

  return {
    habits: allHabits,
    completions: Array.from(completionMap.values()),
    focusSessions,
    islandState,
  };
}

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FULL_WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getDateBreakdown(dateStr: string): {
  year: number;
  monthNumber: number;
  monthName: string;
  dayOfMonth: number;
  dayOfWeek: string;
} {
  const dt = parseDateKey(dateStr);
  return {
    year: dt.getFullYear(),
    monthNumber: dt.getMonth() + 1,
    monthName: FULL_MONTH_NAMES[dt.getMonth()] || '',
    dayOfMonth: dt.getDate(),
    dayOfWeek: FULL_WEEKDAY_NAMES[dt.getDay()] || '',
  };
}

/**
 * Generates a comprehensive CSV export containing all Habit Definitions,
 * all Habit Completion Logs, and all Focus / Pomodoro Timer Logs with full
 * Year, Month, Date, Day of Week, Streak, Strength, and Duration details.
 */
export function generateFullExportCSV(
  habits: Habit[],
  completions: HabitCompletion[],
  focusSessions: FocusSession[],
  todayStr: string
): string {
  const headers = [
    'RecordType',
    'Date',
    'Year',
    'MonthNumber',
    'MonthName',
    'DayOfMonth',
    'DayOfWeek',
    'TimestampISO',
    'HabitId',
    'HabitName',
    'Category',
    'HabitType',
    'ScheduleType',
    'Status',
    'LoggedValue',
    'DailyTarget',
    'Unit',
    'CurrentStreak',
    'BestStreak',
    'HabitStrengthPercent',
    'TimerMode',
    'TimerDurationMinutes',
    'Details',
  ];

  const rows: string[] = [headers.join(',')];

  const habitMap = new Map<string, Habit>();
  const habitSummaryStats = new Map<
    string,
    { currentStreak: number; bestStreak: number; strengthPct: number; totalDone: number }
  >();

  for (const h of habits) {
    habitMap.set(h.id, h);
    const stats = calculateHabitStats(h, completions, todayStr);
    const strength = calculateHabitStrength(h, completions, todayStr);
    habitSummaryStats.set(h.id, {
      currentStreak: stats.currentStreak,
      bestStreak: stats.longestStreak,
      strengthPct: strength.percentage,
      totalDone: stats.totalCompletions,
    });
  }

  // 1. Habit Summary Rows
  for (const h of habits) {
    const createdDate = (h.createdAt || todayStr).slice(0, 10);
    const bd = getDateBreakdown(createdDate);
    const st = habitSummaryStats.get(h.id) || {
      currentStreak: 0,
      bestStreak: 0,
      strengthPct: 0,
      totalDone: 0,
    };
    const target = h.type === 'amount' ? h.target ?? h.dailyTarget ?? 1 : 1;
    const unit = h.type === 'amount' ? h.unit || 'units' : 'check-in';

    rows.push(
      [
        'Habit Summary',
        createdDate,
        bd.year,
        bd.monthNumber,
        bd.monthName,
        bd.dayOfMonth,
        bd.dayOfWeek,
        h.createdAt || `${createdDate}T00:00:00.000Z`,
        h.id,
        h.name,
        h.category || 'General',
        h.type,
        h.schedule.type,
        h.archived ? 'Archived' : 'Active',
        st.totalDone,
        target,
        unit,
        st.currentStreak,
        st.bestStreak,
        `${st.strengthPct}%`,
        '',
        '',
        `Total completions: ${st.totalDone}`,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  // 2. Habit Completion Log Rows (sorted newest to oldest)
  const sortedCompletions = [...completions].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  for (const c of sortedCompletions) {
    const h = habitMap.get(c.habitId);
    const bd = getDateBreakdown(c.date);
    const st = habitSummaryStats.get(c.habitId);
    const isDone = h ? isEntryCompleted(h, c) : c.completed;
    const target = h && h.type === 'amount' ? h.target ?? h.dailyTarget ?? 1 : 1;
    const unit = h && h.type === 'amount' ? h.unit || 'units' : 'check-in';
    const statusLabel = isDone
      ? 'Completed'
      : h?.type === 'avoid' && c.value < 0
      ? 'Relapsed'
      : 'Partial';
    const iso = c.updatedAt
      ? new Date(c.updatedAt).toISOString()
      : `${c.date}T12:00:00.000Z`;

    rows.push(
      [
        'Habit Log',
        c.date,
        bd.year,
        bd.monthNumber,
        bd.monthName,
        bd.dayOfMonth,
        bd.dayOfWeek,
        iso,
        c.habitId,
        h?.name || c.habitId,
        h?.category || 'General',
        h?.type || 'normal',
        h?.schedule.type || 'everyday',
        statusLabel,
        c.value,
        target,
        unit,
        st?.currentStreak ?? 0,
        st?.bestStreak ?? 0,
        st ? `${st.strengthPct}%` : '0%',
        '',
        '',
        `${h?.name || 'Habit'} (${statusLabel}: ${c.value}/${target} ${unit})`,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  // 3. Focus / Pomodoro Timer Log Rows (sorted newest to oldest)
  const sortedSessions = [...focusSessions].sort(
    (a, b) => b.completedAt - a.completedAt
  );

  for (const s of sortedSessions) {
    const h = s.habitId ? habitMap.get(s.habitId) : undefined;
    const bd = getDateBreakdown(s.date);
    const st = s.habitId ? habitSummaryStats.get(s.habitId) : undefined;
    const iso = s.completedAt
      ? new Date(s.completedAt).toISOString()
      : `${s.date}T12:00:00.000Z`;

    rows.push(
      [
        'Timer Log',
        s.date,
        bd.year,
        bd.monthNumber,
        bd.monthName,
        bd.dayOfMonth,
        bd.dayOfWeek,
        iso,
        s.habitId || 'free-focus',
        h?.name || s.label || 'Free Focus',
        h?.category || 'Focus',
        h?.type || 'normal',
        h?.schedule.type || '',
        'Focus Session Completed',
        s.minutes,
        '',
        'mins',
        st?.currentStreak ?? '',
        st?.bestStreak ?? '',
        st ? `${st.strengthPct}%` : '',
        s.mode,
        s.minutes,
        `${s.label} (${s.minutes} mins · ${s.mode})`,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return rows.join('\n');
}

export interface HabitWeekBreakdown {
  id: string;
  name: string;
  completedDays: number;
  scheduledDays: number;
  ratePercent: number;
  currentStreak: number;
}

export interface WeeklyPerformanceDigest {
  scopeName: string;
  weekCompletionRate: number;
  totalCompletedThisWeek: number;
  totalScheduledThisWeek: number;
  bestStreakDays: number;
  topHabitName: string | null;
  focusHabitName: string | null;
  habits: HabitWeekBreakdown[];
  fallbackSummary: string;
}

/**
 * Builds a structured 7-day habit performance digest for the Statistics Weekly AI Summary card
 */
export function buildWeeklyPerformanceDigest(
  scopedHabits: Habit[],
  completions: HabitCompletion[],
  todayStr: string,
  scopeName = 'All Habits'
): WeeklyPerformanceDigest {
  const active = scopedHabits.filter((h) => !h.archived);
  if (active.length === 0) {
    return {
      scopeName,
      weekCompletionRate: 0,
      totalCompletedThisWeek: 0,
      totalScheduledThisWeek: 0,
      bestStreakDays: 0,
      topHabitName: null,
      focusHabitName: null,
      habits: [],
      fallbackSummary:
        'Add your first active habit to start tracking weekly momentum and receive personalized coaching insights.',
    };
  }

  let totalCompletedThisWeek = 0;
  let totalScheduledThisWeek = 0;
  let bestStreakDays = 0;

  const habitItems: HabitWeekBreakdown[] = active.map((habit) => {
    let completedDays = 0;
    let scheduledDays = 0;

    for (let offset = 0; offset < 7; offset++) {
      const dateStr = addDays(todayStr, -offset);
      if (isHabitScheduledOnDate(habit, dateStr)) {
        scheduledDays += 1;
        const entry = completions.find(
          (c) => c.habitId === habit.id && c.date === dateStr
        );
        if (isEntryCompleted(habit, entry)) {
          completedDays += 1;
        }
      }
    }

    totalCompletedThisWeek += completedDays;
    totalScheduledThisWeek += scheduledDays;

    const stats = calculateHabitStats(habit, completions, todayStr);
    if (stats.currentStreak > bestStreakDays) {
      bestStreakDays = stats.currentStreak;
    }

    const ratePercent =
      scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0;

    return {
      id: habit.id,
      name: habit.name,
      completedDays,
      scheduledDays,
      ratePercent,
      currentStreak: stats.currentStreak,
    };
  });

  const weekCompletionRate =
    totalScheduledThisWeek > 0
      ? Math.round((totalCompletedThisWeek / totalScheduledThisWeek) * 100)
      : 0;

  const sortedByRate = [...habitItems].sort(
    (a, b) => b.ratePercent - a.ratePercent || b.currentStreak - a.currentStreak
  );
  const topHabit = sortedByRate[0] || null;
  const focusHabit =
    sortedByRate.length > 1
      ? sortedByRate[sortedByRate.length - 1]
      : sortedByRate[0] || null;

  let fallbackSummary = '';
  if (weekCompletionRate >= 80 && topHabit) {
    fallbackSummary = `Outstanding consistency at ${weekCompletionRate}% this week (${totalCompletedThisWeek}/${totalScheduledThisWeek} check-ins), led by ${topHabit.name} (${topHabit.completedDays}/${topHabit.scheduledDays} days). Keep your ${bestStreakDays}-day streak alive by knocking out ${focusHabit?.name || topHabit.name} early today.`;
  } else if (weekCompletionRate >= 50 && topHabit) {
    fallbackSummary = `Solid momentum at ${weekCompletionRate}% this week with ${totalCompletedThisWeek} completions and a ${bestStreakDays}-day best streak on ${topHabit.name}. Focus on completing ${focusHabit?.name || topHabit.name} today to push your weekly score past 80%.`;
  } else if (topHabit) {
    fallbackSummary = `You've logged ${totalCompletedThisWeek} check-ins over the last 7 days (${weekCompletionRate}%), with ${topHabit.name} leading the way. Pick just one quick win—starting with ${focusHabit?.name || topHabit.name} today—to spark a fresh streak.`;
  }

  return {
    scopeName,
    weekCompletionRate,
    totalCompletedThisWeek,
    totalScheduledThisWeek,
    bestStreakDays,
    topHabitName: topHabit?.name || null,
    focusHabitName:
      focusHabit && focusHabit.id !== topHabit?.id ? focusHabit.name : null,
    habits: habitItems,
    fallbackSummary,
  };
}

export interface PerHabitTrendPoint {
  date: string;
  isoDate: string;
  rollingRate: number;
  cumulative: number;
  dailyValue: number;
  targetValue: number;
}

export interface HabitTrendSummary {
  habitId: string;
  habitName: string;
  habitIcon: string;
  habitColor: string;
  habitType: Habit['type'];
  unit: string;
  targetValue: number;
  currentRollingRate: number;
  deltaRollingRate: number;
  totalCompletedInWindow: number;
  points: PerHabitTrendPoint[];
}

export interface HabitCompletionTrendsResult {
  windowDays: number;
  multiHabitSeries: Record<string, string | number>[];
  perHabitTrends: HabitTrendSummary[];
}

/**
 * Computes time-series completion trends (7-day rolling rate %, cumulative completions, and daily values)
 * for each specific habit over a configurable window (e.g. 7, 14, 30, 90 days) for Recharts LineCharts.
 */
export function buildHabitCompletionTrends(
  habits: Habit[],
  completions: HabitCompletion[],
  todayStr: string,
  windowDays = 30
): HabitCompletionTrendsResult {
  const activeHabits = habits
    .filter((h) => !h.archived)
    .sort((a, b) => a.order - b.order);

  const safeWindow = Math.max(7, Math.min(365, windowDays));
  const lookup: Record<string, HabitCompletion> = {};
  for (const c of completions) {
    lookup[`${c.habitId}_${c.date}`] = c;
  }

  const dates: { isoDate: string; label: string }[] = [];
  for (let offset = safeWindow - 1; offset >= 0; offset--) {
    const isoDate = addDays(todayStr, -offset);
    const dt = parseDateKey(isoDate);
    const label = dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    dates.push({ isoDate, label });
  }

  const fallbackColors = [
    '#7C3AED',
    '#30D158',
    '#0A84FF',
    '#FF9F0A',
    '#FF375F',
    '#64D2FF',
  ];

  const multiHabitSeries: Record<string, string | number>[] = dates.map(
    (d) => ({
      date: d.label,
      isoDate: d.isoDate,
    })
  );

  const perHabitTrends: HabitTrendSummary[] = activeHabits.map((habit, hIdx) => {
    const habitColor =
      habit.color || fallbackColors[hIdx % fallbackColors.length];
    const targetVal = getHabitTarget(habit);
    const unit =
      habit.type === 'amount' ? habit.unit || 'units' : 'check-in';

    let cumulativeCount = 0;
    const points: PerHabitTrendPoint[] = dates.map((d, dIdx) => {
      const entry = lookup[`${habit.id}_${d.isoDate}`];
      const done = isEntryCompleted(habit, entry);
      if (done) {
        cumulativeCount += 1;
      }

      const dailyValue =
        habit.type === 'amount'
          ? entry?.value ?? 0
          : done
            ? 1
            : 0;

      // 7-day rolling completion rate ending on d.isoDate
      let rollingSched = 0;
      let rollingDone = 0;
      for (let r = 0; r < 7; r++) {
        const rDate = addDays(d.isoDate, -r);
        if (isHabitScheduledOnDate(habit, rDate)) {
          rollingSched += 1;
          const rEntry = lookup[`${habit.id}_${rDate}`];
          if (isEntryCompleted(habit, rEntry)) {
            rollingDone += 1;
          }
        }
      }
      const rollingRate =
        rollingSched > 0 ? Math.round((rollingDone / rollingSched) * 100) : 0;

      multiHabitSeries[dIdx][`${habit.id}_rate`] = rollingRate;
      multiHabitSeries[dIdx][`${habit.id}_cumulative`] = cumulativeCount;
      multiHabitSeries[dIdx][`${habit.id}_value`] = dailyValue;

      return {
        date: d.label,
        isoDate: d.isoDate,
        rollingRate,
        cumulative: cumulativeCount,
        dailyValue,
        targetValue: targetVal,
      };
    });

    const firstRate = points[0]?.rollingRate ?? 0;
    const lastRate = points[points.length - 1]?.rollingRate ?? 0;

    return {
      habitId: habit.id,
      habitName: habit.name,
      habitIcon: habit.icon,
      habitColor,
      habitType: habit.type,
      unit,
      targetValue: targetVal,
      currentRollingRate: lastRate,
      deltaRollingRate: lastRate - firstRate,
      totalCompletedInWindow: cumulativeCount,
      points,
    };
  });

  return {
    windowDays: safeWindow,
    multiHabitSeries,
    perHabitTrends,
  };
}
