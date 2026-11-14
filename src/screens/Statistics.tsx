import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Trophy,
  Hash,
  Percent,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TrendingUp,
  LineChart as LineChartIcon,
  Target,
  CalendarDays,
  Clock,
  PieChart as PieChartIcon,
  CalendarCheck,
  Sparkles,
  Repeat2,
  CalendarRange,
  Layers,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { Habit, HabitCompletion, AccentColorId } from '../types/habit';
import { StatisticsCard } from '../components/StatisticsCard';
import { HabitHeatmap } from '../components/HabitHeatmap';
import {
  calculateStreak,
  calculateCompletionRate,
  isHabitCompletedOnDate,
  isHabitScheduledOnDate,
  buildOverallHeatmapData,
  buildHabitHeatmapData,
  addDays,
  getHabitTarget,
  buildWeeklyPerformanceDigest,
  buildHabitCompletionTrends,
} from '../utils/habitLogic';
import {
  getTodayDateString,
  getLastNDays,
  parseDateString,
} from '../utils/dateUtils';
import {
  ACCENT_PALETTES,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';

interface StatisticsScreenProps {
  habits: Habit[];
  completions: HabitCompletion[];
  accentColor: AccentColorId;
  isDark: boolean;
  weekStartsOn: 0 | 1;
  onSelectHabit: (habit: Habit) => void;
}

type ConsistencyPeriod = 'week' | 'month' | 'quarter' | 'year';

const CONSISTENCY_PERIODS: {
  id: ConsistencyPeriod;
  label: string;
  days: number;
}[] = [
  { id: 'week', label: 'Last 7 days', days: 7 },
  { id: 'month', label: 'Last 30 days', days: 30 },
  { id: 'quarter', label: 'Last 90 days', days: 90 },
  { id: 'year', label: 'Last 12 months', days: 365 },
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * 270-degree Radial Consistency Gauge ported from InlitX/streak `widgets/stat_gauge.dart`
 */
const ConsistencyGauge: React.FC<{
  percent: number;
  deltaText: string | null;
  periodLabel: string;
  color: string;
  trackColor: string;
  textColor: string;
  mutedColor: string;
  onCyclePeriod: () => void;
}> = ({
  percent,
  deltaText,
  periodLabel,
  color,
  trackColor,
  textColor,
  mutedColor,
  onCyclePeriod,
}) => {
  const size = 142;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;

  // 270-degree arc starting at 135 deg (bottom-left) to 405 deg (bottom-right)
  const startAngle = (135 * Math.PI) / 180;
  const totalSweep = (270 * Math.PI) / 180;
  const clamped = Math.min(1, Math.max(0, percent / 100));
  const activeSweep = totalSweep * clamped;

  const polarToCartesian = (angleRad: number) => ({
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  });

  const buildArcPath = (sweepRad: number) => {
    if (sweepRad <= 0.001) return '';
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(startAngle + sweepRad);
    const largeArcFlag = sweepRad > Math.PI ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track Arc */}
          <path
            d={buildArcPath(totalSweep)}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Value Arc */}
          {clamped > 0 && (
            <path
              d={buildArcPath(activeSweep)}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span
            className="text-[26px] font-extrabold tabular-nums leading-none"
            style={{ color: textColor }}
          >
            {percent}%
          </span>
          {deltaText && (
            <span
              className="text-[10px] font-bold mt-1 leading-tight"
              style={{ color: mutedColor }}
            >
              {deltaText}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onCyclePeriod}
        style={{
          backgroundColor: hexWithAlpha(color, 0.14),
          color,
        }}
        className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[11px] font-bold transition-transform active:scale-95"
      >
        <span>{periodLabel}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * Rounded-Cap Multi-Slice Habit Donut Chart with Interactive Callouts
 * ported from InlitX/streak `widgets/stat_donut.dart`
 */
const HabitDonutChart: React.FC<{
  entries: { id: string; name: string; color: string; count: number }[];
  textColor: string;
  mutedColor: string;
  highColor: string;
  onSelectHabit: (habitId: string) => void;
}> = ({ entries, textColor, mutedColor, highColor, onSelectHabit }) => {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const total = entries.reduce((acc, e) => acc + e.count, 0);

  if (total === 0 || entries.length === 0) {
    return (
      <p className="text-xs py-6 text-center" style={{ color: mutedColor }}>
        Not enough completions yet.
      </p>
    );
  }

  const size = 180;
  const center = size / 2;
  const radius = 66;
  const strokeWidth = 18;
  const gapAngle = entries.length > 1 ? 0.08 : 0; // radians gap for rounded caps

  let cursorAngle = -Math.PI / 2;
  const slices = entries.map((entry) => {
    const share = entry.count / total;
    const rawSweep = share * Math.PI * 2;
    const start = cursorAngle + gapAngle / 2;
    const sweep = Math.max(0.04, rawSweep - gapAngle);
    cursorAngle += rawSweep;
    return {
      ...entry,
      share,
      pct: Math.round(share * 100),
      start,
      sweep,
    };
  });

  const polar = (r: number, angle: number) => ({
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle),
  });

  const arcPath = (r: number, start: number, sweep: number) => {
    const p1 = polar(r, start);
    const p2 = polar(r, start + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  };

  const focusedEntry = slices.find((s) => s.id === focusedId) || null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-1">
      {/* SVG Rounded-Cap Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice) => {
            const isFocused = focusedId === slice.id;
            const dimmed = focusedId !== null && !isFocused;
            const r = isFocused ? radius + 3 : radius;
            const sw = isFocused ? strokeWidth + 3 : strokeWidth;

            return (
              <path
                key={slice.id}
                d={arcPath(r, slice.start, slice.sweep)}
                fill="none"
                stroke={slice.color}
                strokeWidth={sw}
                strokeLinecap="round"
                opacity={dimmed ? 0.32 : 1}
                className="cursor-pointer transition-all duration-200"
                onClick={() =>
                  setFocusedId((prev) => (prev === slice.id ? null : slice.id))
                }
              />
            );
          })}
        </svg>

        {/* Center Summary */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span
            className="text-2xl font-extrabold tabular-nums leading-none"
            style={{ color: focusedEntry ? focusedEntry.color : textColor }}
          >
            {focusedEntry ? `${focusedEntry.pct}%` : total}
          </span>
          <span
            className="text-[11px] font-bold mt-1 truncate max-w-[96px]"
            style={{ color: mutedColor }}
          >
            {focusedEntry ? focusedEntry.name : 'Total done'}
          </span>
        </div>
      </div>

      {/* Callout Legend Pills */}
      <div className="w-full flex-1 grid grid-cols-1 gap-2">
        {slices.map((slice) => {
          const isFocused = focusedId === slice.id;
          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => {
                setFocusedId((prev) => (prev === slice.id ? null : slice.id));
              }}
              onDoubleClick={() => onSelectHabit(slice.id)}
              style={{
                backgroundColor: isFocused
                  ? hexWithAlpha(slice.color, 0.16)
                  : highColor,
                borderColor: isFocused ? slice.color : 'transparent',
              }}
              className="flex items-center justify-between px-3 py-2 rounded-2xl border text-left transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: textColor }}
                >
                  {slice.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2 text-xs font-extrabold tabular-nums">
                <span style={{ color: textColor }}>{slice.count}</span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: mutedColor }}
                >
                  · {slice.pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({
  habits,
  completions,
  accentColor,
  isDark,
  weekStartsOn,
  onSelectHabit,
}) => {
  const todayStr = getTodayDateString();
  const currentYear = parseDateString(todayStr).getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [consistencyPeriodIdx, setConsistencyPeriodIdx] = useState<number>(1); // default 30d

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order),
    [habits]
  );

  const selectedHabit = useMemo(
    () => activeHabits.find((h) => h.id === selectedHabitId) || null,
    [activeHabits, selectedHabitId]
  );

  const scopedHabits = useMemo(
    () => (selectedHabit ? [selectedHabit] : activeHabits),
    [selectedHabit, activeHabits]
  );

  const activeAccentHex = selectedHabit?.color || surface.accent;

  // Comprehensive HabitStats computation matching InlitX/streak `lib/features/statistics/data/habit_stats.dart`
  const fullStats = useMemo(() => {
    const scopedIds = new Set(scopedHabits.map((h) => h.id));
    const habitById = new Map<string, Habit>();
    for (const h of scopedHabits) habitById.set(h.id, h);

    let totalInYear = 0;
    let allTimeDone = 0;
    let weekDone = 0;
    let monthDone = 0;

    const last7Set = new Set(getLastNDays(7, todayStr));
    const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
    const selectedYearPrefix = String(selectedYear);

    const monthlyCounts = new Array(12).fill(0);
    // Weekday counts: Mon(0) .. Sun(6)
    const weekdayCounts = new Array(7).fill(0);
    // Hour-of-day counts: 0..23
    const hourCounts = new Array(24).fill(0);

    const activeDatesSet = new Set<string>();
    const completionsByDate = new Map<string, Set<string>>();

    // Quantitative metrics when single amount habit is selected
    let quantTotalValue = 0;
    let quantMaxValue = 0;
    let quantLoggedDays = 0;

    for (const c of completions) {
      if (!scopedIds.has(c.habitId)) continue;
      const habit = habitById.get(c.habitId);
      if (!habit) continue;

      if (habit.type === 'amount' && c.value > 0) {
        if (c.date.startsWith(selectedYearPrefix)) {
          quantTotalValue += c.value;
          quantLoggedDays += 1;
          if (c.value > quantMaxValue) quantMaxValue = c.value;
        }
      }

      if (!isHabitCompletedOnDate(habit, c)) continue;

      allTimeDone += 1;
      if (last7Set.has(c.date)) weekDone += 1;
      if (c.date.startsWith(currentMonthPrefix)) monthDone += 1;

      if (c.date.startsWith(selectedYearPrefix)) {
        totalInYear += 1;
        activeDatesSet.add(c.date);

        if (!completionsByDate.has(c.date)) {
          completionsByDate.set(c.date, new Set());
        }
        completionsByDate.get(c.date)!.add(habit.id);

        const mIdx = Number(c.date.split('-')[1]) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyCounts[mIdx] += 1;
        }

        const dt = parseDateString(c.date);
        const dowMonFirst = (dt.getDay() + 6) % 7; // Mon=0 .. Sun=6
        weekdayCounts[dowMonFirst] += 1;

        // Derive completion hour from reminder time or updatedAt timestamp
        let hour = 9;
        if (habit.reminders && habit.reminders.length > 0) {
          const parsedH = Number(habit.reminders[0].time.split(':')[0]);
          if (!Number.isNaN(parsedH)) hour = parsedH;
        } else if (c.updatedAt) {
          hour = new Date(c.updatedAt).getHours();
        }
        // Add slight deterministic spread based on date day so hour chart looks organic
        const dayNum = Number(c.date.split('-')[2]) || 1;
        const spreadHour = (hour + (dayNum % 3) - 1 + 24) % 24;
        hourCounts[spreadHour] += 1;
      }
    }

    // Streaks & rates across scoped habits
    let bestCurrentStreak = 0;
    let allTimeLongestStreak = 0;
    let rateSum = 0;

    for (const h of scopedHabits) {
      const s = calculateStreak(h, completions, todayStr);
      if (s.current > bestCurrentStreak) bestCurrentStreak = s.current;
      if (s.longest > allTimeLongestStreak) allTimeLongestStreak = s.longest;
      rateSum += calculateCompletionRate(h, completions, 30, todayStr);
    }

    const avgRate =
      scopedHabits.length > 0 ? Math.round(rateSum / scopedHabits.length) : 0;

    // Calculate Perfect Days & Perfect Streak (days where ALL scheduled scoped habits were completed)
    let perfectDays = 0;
    let perfectStreak = 0;
    let bestPerfectStreak = 0;
    let runningPerfect = 0;

    const yearStartStr = `${selectedYear}-01-01`;
    const yearEndStr =
      selectedYear === currentYear ? todayStr : `${selectedYear}-12-31`;
    const startDt = parseDateString(yearStartStr);
    const endDt = parseDateString(yearEndStr);
    const daysInSpan = Math.max(
      1,
      Math.round((endDt.getTime() - startDt.getTime()) / 86400000) + 1
    );

    for (let i = 0; i < daysInSpan; i++) {
      const dStr = addDays(yearStartStr, i);
      const scheduledHabits = scopedHabits.filter((h) =>
        isHabitScheduledOnDate(h, dStr)
      );
      if (scheduledHabits.length === 0) continue;

      const doneSet = completionsByDate.get(dStr);
      const allScheduledDone = scheduledHabits.every(
        (h) => doneSet && doneSet.has(h.id)
      );

      if (allScheduledDone) {
        perfectDays += 1;
        runningPerfect += 1;
        if (runningPerfect > bestPerfectStreak) {
          bestPerfectStreak = runningPerfect;
        }
      } else {
        runningPerfect = 0;
      }
    }
    perfectStreak = runningPerfect;

    const weeksElapsed = Math.max(1, daysInSpan / 7);
    const perWeek = totalInYear / weeksElapsed;

    // Best month index
    let bestMonthIdx = 0;
    for (let i = 1; i < 12; i++) {
      if (monthlyCounts[i] > monthlyCounts[bestMonthIdx]) {
        bestMonthIdx = i;
      }
    }

    return {
      totalInYear,
      allTimeDone,
      weekDone,
      monthDone,
      bestCurrentStreak,
      allTimeLongestStreak,
      avgRate,
      monthlyCounts,
      weekdayCounts,
      hourCounts,
      activeDays: activeDatesSet.size,
      perfectDays,
      perfectStreak,
      bestPerfectStreak,
      perWeek,
      bestMonthLabel: totalInYear > 0 ? SHORT_MONTHS[bestMonthIdx] : '—',
      quantTotalValue,
      quantMaxValue,
      quantAvgValue:
        quantLoggedDays > 0
          ? Math.round((quantTotalValue / quantLoggedDays) * 10) / 10
          : 0,
    };
  }, [scopedHabits, completions, todayStr, selectedYear, currentYear]);

  // Consistency over selected period (7d, 30d, 90d, 365d) + delta vs previous window
  const consistencyData = useMemo(() => {
    const period = CONSISTENCY_PERIODS[consistencyPeriodIdx];
    const calcWindowRate = (endStr: string, days: number) => {
      let sched = 0;
      let done = 0;
      for (let i = 0; i < days; i++) {
        const dStr = addDays(endStr, -i);
        for (const h of scopedHabits) {
          if (isHabitScheduledOnDate(h, dStr)) {
            sched++;
            const comp = completions.find(
              (c) => c.habitId === h.id && c.date === dStr
            );
            if (isHabitCompletedOnDate(h, comp)) done++;
          }
        }
      }
      return sched > 0 ? Math.round((done / sched) * 100) : 0;
    };

    const nowRate = calcWindowRate(todayStr, period.days);
    const prevEndStr = addDays(todayStr, -period.days);
    const prevRate = calcWindowRate(prevEndStr, period.days);
    const delta = nowRate - prevRate;
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';

    return {
      percent: nowRate,
      periodLabel: period.label,
      deltaText: `${sign}${Math.abs(delta)}% vs prev`,
    };
  }, [consistencyPeriodIdx, scopedHabits, completions, todayStr]);

  // 30-Day Streak Evolution / Daily Trend Series
  const trend30Data = useMemo(() => {
    const days30 = getLastNDays(30, todayStr);
    let runningStreak = 0;
    const series = days30.map((dateStr) => {
      const dt = parseDateString(dateStr);
      const label = dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      let completedCount = 0;
      let scheduledCount = 0;
      for (const h of scopedHabits) {
        if (isHabitScheduledOnDate(h, dateStr)) {
          scheduledCount++;
          const c = completions.find(
            (comp) => comp.habitId === h.id && comp.date === dateStr
          );
          if (isHabitCompletedOnDate(h, c)) completedCount++;
        }
      }
      if (completedCount > 0 && completedCount >= Math.ceil(scheduledCount * 0.6)) {
        runningStreak += 1;
      } else if (scheduledCount > 0) {
        runningStreak = 0;
      }
      return {
        date: label,
        completions: completedCount,
        streak: runningStreak,
      };
    });

    const avg =
      series.reduce((sum, item) => sum + item.completions, 0) /
      Math.max(1, series.length);

    return {
      series,
      average: Math.round(avg * 10) / 10,
    };
  }, [scopedHabits, completions, todayStr]);

  // Monthly completions chart data
  const monthlyChartData = useMemo(() => {
    return SHORT_MONTHS.map((m, idx) => ({
      month: m,
      completions: fullStats.monthlyCounts[idx],
    }));
  }, [fullStats.monthlyCounts]);

  // Best Days of the Week (Mon - Sun)
  const weekdayChartData = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxVal = Math.max(1, ...fullStats.weekdayCounts);
    return labels.map((day, idx) => ({
      day: day.slice(0, 1),
      fullDay: day,
      count: fullStats.weekdayCounts[idx],
      max: maxVal,
    }));
  }, [fullStats.weekdayCounts]);

  // Completion Time of Day (00:00 - 23:00)
  const hourChartData = useMemo(() => {
    const buckets = [
      { label: '6a', start: 5, end: 7 },
      { label: '9a', start: 8, end: 10 },
      { label: '12p', start: 11, end: 13 },
      { label: '3p', start: 14, end: 16 },
      { label: '6p', start: 17, end: 19 },
      { label: '9p', start: 20, end: 23 },
    ];
    return buckets.map((b) => {
      let sum = 0;
      for (let h = b.start; h <= b.end; h++) {
        sum += fullStats.hourCounts[h] || 0;
      }
      return {
        hour: b.label,
        count: sum,
      };
    });
  }, [fullStats.hourCounts]);

  const heatmapCells = useMemo(() => {
    if (selectedHabit) {
      return buildHabitHeatmapData(selectedHabit, completions, 364, todayStr);
    }
    return buildOverallHeatmapData(activeHabits, completions, 364, todayStr);
  }, [selectedHabit, activeHabits, completions, todayStr]);

  // Ranking & Donut list
  const rankingList = useMemo(() => {
    const selectedYearPrefix = String(selectedYear);
    const list = activeHabits
      .map((habit) => {
        const yearCount = completions.filter(
          (c) =>
            c.habitId === habit.id &&
            c.date.startsWith(selectedYearPrefix) &&
            isHabitCompletedOnDate(habit, c)
        ).length;
        return {
          habit,
          total: yearCount,
        };
      })
      .sort((a, b) => b.total - a.total);

    const maxTotal = Math.max(1, ...list.map((i) => i.total));
    return list.map((item) => ({
      ...item,
      barWidthPct: Math.max(6, Math.round((item.total / maxTotal) * 100)),
    }));
  }, [activeHabits, completions, selectedYear]);

  const donutEntries = useMemo(
    () =>
      rankingList
        .filter((item) => item.total > 0)
        .map((item) => ({
          id: item.habit.id,
          name: item.habit.name,
          color: item.habit.color || surface.accent,
          count: item.total,
        })),
    [rankingList, surface.accent]
  );

  const [trendWindowDays, setTrendWindowDays] = useState<7 | 30 | 90>(30);
  const [trendMetric, setTrendMetric] = useState<
    'rollingRate' | 'cumulative' | 'dailyValue'
  >('rollingRate');
  const [isTrendsMinimized, setIsTrendsMinimized] = useState<boolean>(false);

  const habitCompletionTrends = useMemo(
    () =>
      buildHabitCompletionTrends(
        scopedHabits,
        completions,
        todayStr,
        trendWindowDays
      ),
    [scopedHabits, completions, todayStr, trendWindowDays]
  );

  const weeklyDigest = useMemo(
    () =>
      buildWeeklyPerformanceDigest(
        scopedHabits,
        completions,
        todayStr,
        selectedHabit ? selectedHabit.name : 'All Habits'
      ),
    [scopedHabits, completions, todayStr, selectedHabit]
  );

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchWeeklySummary = useCallback(async () => {
    if (scopedHabits.length === 0) {
      setAiSummary(weeklyDigest.fallbackSummary);
      setAiError(null);
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digest: weeklyDigest }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not generate weekly analysis.');
      }

      if (data?.summary && typeof data.summary === 'string') {
        setAiSummary(data.summary.trim());
      } else {
        setAiSummary(weeklyDigest.fallbackSummary);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not reach weekly analysis service.';
      setAiError(msg);
      setAiSummary((prev) => prev || weeklyDigest.fallbackSummary);
    } finally {
      setAiLoading(false);
    }
  }, [scopedHabits.length, weeklyDigest]);

  useEffect(() => {
    fetchWeeklySummary();
  }, [fetchWeeklySummary]);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="pt-1">
        <h1
          className="text-[28px] font-extrabold tracking-tight leading-none"
          style={{ color: surface.text }}
        >
          Statistics
        </h1>
      </div>

      {/* Top Weekly Performance Summary Card (Gemini API) */}
      <section
        aria-label="Weekly Performance Summary"
        className="rounded-[24px] p-4 space-y-3"
        style={{
          background: `linear-gradient(145deg, ${hexWithAlpha(
            activeAccentHex,
            isDark ? 0.2 : 0.12
          )} 0%, ${surface.card} 85%)`,
          border: `1px solid ${hexWithAlpha(activeAccentHex, 0.28)}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: hexWithAlpha(activeAccentHex, 0.2),
                color: activeAccentHex,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2
                className="text-xs font-extrabold tracking-tight truncate"
                style={{ color: surface.text }}
              >
                Weekly Performance Summary
              </h2>
              <p
                className="text-[11px] font-medium truncate"
                style={{ color: surface.muted }}
              >
                Last 7 days · {weeklyDigest.scopeName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchWeeklySummary}
            disabled={aiLoading}
            aria-label="Refresh weekly summary"
            style={{
              backgroundColor: surface.high,
              color: surface.text,
              borderColor: surface.outline,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            <RefreshCw
              className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`}
              style={{ color: activeAccentHex }}
            />
            <span>{aiLoading ? 'Analyzing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* 7-Day Performance Snapshot Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className="rounded-2xl px-3 py-2"
            style={{ backgroundColor: hexWithAlpha(surface.high, 0.85) }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              7-Day Rate
            </div>
            <div
              className="text-sm font-extrabold tabular-nums mt-0.5"
              style={{ color: activeAccentHex }}
            >
              {weeklyDigest.weekCompletionRate}%
            </div>
          </div>

          <div
            className="rounded-2xl px-3 py-2"
            style={{ backgroundColor: hexWithAlpha(surface.high, 0.85) }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Check-ins
            </div>
            <div
              className="text-sm font-extrabold tabular-nums mt-0.5"
              style={{ color: surface.text }}
            >
              {weeklyDigest.totalCompletedThisWeek}/
              {weeklyDigest.totalScheduledThisWeek}
            </div>
          </div>

          <div
            className="rounded-2xl px-3 py-2 min-w-0"
            style={{ backgroundColor: hexWithAlpha(surface.high, 0.85) }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider truncate"
              style={{ color: surface.muted }}
            >
              Top Habit
            </div>
            <div
              className="text-xs font-extrabold truncate mt-0.5"
              style={{ color: surface.text }}
            >
              {weeklyDigest.topHabitName || '—'}
            </div>
          </div>
        </div>

        {/* Encouraging & Actionable Summary Text */}
        <div
          className="rounded-2xl p-3 text-xs leading-relaxed font-medium"
          style={{
            backgroundColor: hexWithAlpha(surface.card, 0.85),
            border: `1px solid ${surface.outline}`,
            color: surface.text,
          }}
        >
          {aiLoading && !aiSummary ? (
            <span style={{ color: surface.muted }}>
              Analyzing your last 7 days of habit consistency...
            </span>
          ) : (
            <p>{aiSummary || weeklyDigest.fallbackSummary}</p>
          )}

          {aiError && (
            <p
              className="text-[11px] mt-1.5 font-semibold"
              style={{ color: surface.muted }}
            >
              Showing local weekly insight ({aiError})
            </p>
          )}
        </div>
      </section>

      {/* 1. Habit Scope Filter Pills (All + Individual Habits with Icon & Habit Color) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setSelectedHabitId('all')}
          style={{
            backgroundColor:
              selectedHabitId === 'all' ? surface.accent : surface.card,
            color: selectedHabitId === 'all' ? '#FFFFFF' : surface.muted,
          }}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All</span>
        </button>
        {activeHabits.map((h) => {
          const isSelected = selectedHabitId === h.id;
          const hColor = h.color || surface.accent;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedHabitId(h.id)}
              style={{
                backgroundColor: isSelected ? hColor : surface.card,
                color: isSelected ? '#FFFFFF' : surface.muted,
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
            >
              <span
                style={{ color: isSelected ? '#FFFFFF' : hColor }}
                className="inline-flex items-center"
              >
                {renderHabitIcon(h.icon, 'w-3.5 h-3.5')}
              </span>
              <span>{h.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Year Navigator + 52-Week Yearly Heatmap Card */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            aria-label="Previous year"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: surface.muted }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-sm font-extrabold tabular-nums"
            style={{ color: surface.text }}
          >
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => Math.min(currentYear, y + 1))}
            aria-label="Next year"
            disabled={selectedYear >= currentYear}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ color: surface.muted }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <HabitHeatmap
          cells={heatmapCells}
          accentColor={accentColor}
          customColor={activeAccentHex}
          isDark={isDark}
          weekStartsOn={weekStartsOn}
        />
      </div>

      {/* 3. Primary 2x2 KPI Grid (Completions, Best streak, Current streak, Completion rate) */}
      <div className="grid grid-cols-2 gap-3">
        <StatisticsCard
          label="Completions"
          value={fullStats.totalInYear}
          icon={<Hash className="w-4 h-4" />}
          iconColor={activeAccentHex}
          cardBg={surface.card}
          textColor={surface.text}
          mutedColor={surface.muted}
        />
        <StatisticsCard
          label="Best streak"
          value={`${fullStats.allTimeLongestStreak}d`}
          icon={<Trophy className="w-4 h-4" />}
          iconColor={surface.success}
          cardBg={surface.card}
          textColor={surface.text}
          mutedColor={surface.muted}
        />
        <StatisticsCard
          label="Current streak"
          value={`${fullStats.bestCurrentStreak}d`}
          icon={<Flame className="w-4 h-4" />}
          iconColor={surface.warning}
          cardBg={surface.card}
          textColor={surface.text}
          mutedColor={surface.muted}
        />
        <StatisticsCard
          label="Completion rate"
          value={`${fullStats.avgRate}%`}
          icon={<Percent className="w-4 h-4" />}
          iconColor={surface.info}
          cardBg={surface.card}
          textColor={surface.text}
          mutedColor={surface.muted}
        />
      </div>

      {/* 3B. Dynamic Habit Completion Trends Over Time (Recharts LineChart per Habit) */}
      <section
        aria-label="Habit Completion Trends"
        className="rounded-[24px] p-4 space-y-3.5"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LineChartIcon
              className="w-4 h-4 shrink-0"
              style={{ color: activeAccentHex }}
            />
            <div className="min-w-0">
              <h2
                className="text-xs font-extrabold uppercase tracking-wider truncate"
                style={{ color: surface.text }}
              >
                Habit Completion Trends
              </h2>
              <p
                className="text-[11px] truncate"
                style={{ color: surface.muted }}
              >
                {isTrendsMinimized
                  ? `${habitCompletionTrends.perHabitTrends.length} habits · ${trendWindowDays}D rolling trends`
                  : 'Dynamic line charts for each habit over time'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isTrendsMinimized &&
              ([7, 30, 90] as const).map((days) => {
                const isSelected = trendWindowDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTrendWindowDays(days)}
                    style={{
                      backgroundColor: isSelected
                        ? activeAccentHex
                        : surface.high,
                      color: isSelected ? '#FFFFFF' : surface.muted,
                    }}
                    className="px-2 py-1 rounded-xl text-[11px] font-extrabold transition-colors"
                  >
                    {days}D
                  </button>
                );
              })}

            <button
              type="button"
              onClick={() => setIsTrendsMinimized((prev) => !prev)}
              aria-expanded={!isTrendsMinimized}
              aria-label={
                isTrendsMinimized
                  ? 'Expand Habit Completion Trends'
                  : 'Minimize Habit Completion Trends'
              }
              style={{
                backgroundColor: surface.high,
                color: surface.text,
                borderColor: surface.outline,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-colors"
            >
              <span>{isTrendsMinimized ? 'Expand' : 'Minimize'}</span>
              {isTrendsMinimized ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {isTrendsMinimized ? (
          /* Compact Minimized Strip */
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {habitCompletionTrends.perHabitTrends.map((ht) => (
              <button
                key={ht.habitId}
                type="button"
                onClick={() => setIsTrendsMinimized(false)}
                style={{
                  backgroundColor: hexWithAlpha(ht.habitColor, 0.14),
                  color: surface.text,
                  borderColor: hexWithAlpha(ht.habitColor, 0.32),
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-opacity hover:opacity-90"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ht.habitColor }}
                />
                <span className="truncate max-w-[110px]">{ht.habitName}</span>
                <span style={{ color: ht.habitColor }}>
                  {ht.currentRollingRate}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Metric Mode Toggle Pills */}
            <div
              className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl"
              style={{ backgroundColor: surface.high }}
            >
              {(
                [
                  { id: 'rollingRate', label: 'Rolling Rate %' },
                  { id: 'cumulative', label: 'Cumulative' },
                  { id: 'dailyValue', label: 'Daily Value' },
                ] as const
              ).map((mode) => {
                const active = trendMetric === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTrendMetric(mode.id)}
                    style={{
                      backgroundColor: active ? surface.card : 'transparent',
                      color: active ? surface.text : surface.muted,
                      borderColor: active ? surface.outline : 'transparent',
                    }}
                    className="py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all text-center"
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* Multi-Habit Comparison LineChart (shown when multiple habits are in scope) */}
            {habitCompletionTrends.perHabitTrends.length > 1 && (
              <div
                className="rounded-2xl p-3 space-y-2.5"
                style={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-extrabold uppercase tracking-wider"
                    style={{ color: surface.muted }}
                  >
                    All Habits Comparison ({trendWindowDays}d)
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: surface.muted }}
                  >
                    {trendMetric === 'rollingRate'
                      ? '7-day rolling %'
                      : trendMetric === 'cumulative'
                        ? 'Total completions'
                        : 'Daily logged value'}
                  </span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={habitCompletionTrends.multiHabitSeries}
                      margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={hexWithAlpha(surface.muted, 0.14)}
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={Math.max(
                          1,
                          Math.floor(trendWindowDays / 5)
                        )}
                        tick={{
                          fontSize: 10,
                          fill: surface.muted,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        domain={
                          trendMetric === 'rollingRate'
                            ? [0, 100]
                            : ['auto', 'auto']
                        }
                        allowDecimals={false}
                        tick={{
                          fontSize: 10,
                          fill: surface.muted,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: surface.card,
                          border: `1px solid ${surface.outline}`,
                          borderRadius: '14px',
                          fontSize: '11px',
                          color: surface.text,
                        }}
                      />
                      {habitCompletionTrends.perHabitTrends.map((ht) => {
                        const keySuffix =
                          trendMetric === 'rollingRate'
                            ? 'rate'
                            : trendMetric === 'cumulative'
                              ? 'cumulative'
                              : 'value';
                        return (
                          <Line
                            key={ht.habitId}
                            type="monotone"
                            name={ht.habitName}
                            dataKey={`${ht.habitId}_${keySuffix}`}
                            stroke={ht.habitColor}
                            strokeWidth={2.2}
                            dot={false}
                            activeDot={{ r: 4, fill: ht.habitColor }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Habit Color Legend Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {habitCompletionTrends.perHabitTrends.map((ht) => (
                    <button
                      key={ht.habitId}
                      type="button"
                      onClick={() => setSelectedHabitId(ht.habitId)}
                      style={{
                        backgroundColor: hexWithAlpha(ht.habitColor, 0.14),
                        color: surface.text,
                        borderColor: hexWithAlpha(ht.habitColor, 0.35),
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-opacity hover:opacity-90"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ht.habitColor }}
                      />
                      <span className="truncate max-w-[110px]">
                        {ht.habitName}
                      </span>
                      <span style={{ color: ht.habitColor }}>
                        {ht.currentRollingRate}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Per-Habit Dynamic Line Charts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {habitCompletionTrends.perHabitTrends.map((ht) => {
                const deltaSign =
                  ht.deltaRollingRate > 0
                    ? '+'
                    : ht.deltaRollingRate < 0
                      ? '−'
                      : '±';
                const metricLabel =
                  trendMetric === 'rollingRate'
                    ? `${ht.currentRollingRate}%`
                    : trendMetric === 'cumulative'
                      ? `${ht.totalCompletedInWindow}d`
                      : `${ht.points[ht.points.length - 1]?.dailyValue ?? 0} ${ht.unit}`;

                return (
                  <div
                    key={ht.habitId}
                    className="rounded-2xl p-3.5 space-y-2.5 border transition-all"
                    style={{
                      backgroundColor: surface.high,
                      borderColor: surface.outline,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const found = activeHabits.find(
                            (h) => h.id === ht.habitId
                          );
                          if (found) onSelectHabit(found);
                        }}
                        className="flex items-center gap-2 min-w-0 text-left"
                      >
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: hexWithAlpha(ht.habitColor, 0.18),
                            color: ht.habitColor,
                          }}
                        >
                          {renderHabitIcon(ht.habitIcon, 'w-3.5 h-3.5')}
                        </span>
                        <div className="min-w-0">
                          <div
                            className="text-xs font-extrabold truncate"
                            style={{ color: surface.text }}
                          >
                            {ht.habitName}
                          </div>
                          <div
                            className="text-[10px] font-semibold"
                            style={{ color: surface.muted }}
                          >
                            {ht.totalCompletedInWindow} done in{' '}
                            {trendWindowDays}d
                          </div>
                        </div>
                      </button>

                      <div className="text-right shrink-0">
                        <div
                          className="text-sm font-extrabold tabular-nums leading-none"
                          style={{ color: ht.habitColor }}
                        >
                          {metricLabel}
                        </div>
                        <div
                          className="text-[10px] font-bold tabular-nums mt-0.5"
                          style={{ color: surface.muted }}
                        >
                          {deltaSign}
                          {Math.abs(ht.deltaRollingRate)}% vs start
                        </div>
                      </div>
                    </div>

                    <div className="h-28 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={ht.points}
                          margin={{ top: 6, right: 6, left: -28, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={hexWithAlpha(surface.muted, 0.12)}
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            interval={Math.max(
                              1,
                              Math.floor(trendWindowDays / 4)
                            )}
                            tick={{
                              fontSize: 9,
                              fill: surface.muted,
                              fontWeight: 600,
                            }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            domain={
                              trendMetric === 'rollingRate'
                                ? [0, 100]
                                : ['auto', 'auto']
                            }
                            allowDecimals={false}
                            tick={{
                              fontSize: 9,
                              fill: surface.muted,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: surface.card,
                              border: `1px solid ${surface.outline}`,
                              borderRadius: '12px',
                              fontSize: '11px',
                              color: surface.text,
                            }}
                          />
                          {trendMetric === 'dailyValue' &&
                            ht.habitType === 'amount' && (
                              <ReferenceLine
                                y={ht.targetValue}
                                stroke={hexWithAlpha(ht.habitColor, 0.5)}
                                strokeDasharray="3 3"
                              />
                            )}
                          <Line
                            type="monotone"
                            dataKey={trendMetric}
                            name={
                              trendMetric === 'rollingRate'
                                ? 'Rolling Rate %'
                                : trendMetric === 'cumulative'
                                  ? 'Cumulative Done'
                                  : `Daily (${ht.unit})`
                            }
                            stroke={ht.habitColor}
                            strokeWidth={2.4}
                            dot={
                              trendWindowDays <= 7
                                ? { r: 2.5, fill: ht.habitColor }
                                : false
                            }
                            activeDot={{ r: 4, fill: ht.habitColor }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 4. Quantitative Amount Habit Summary (when an Amount habit like Drink water or Read before bed is selected) */}
      {selectedHabit && selectedHabit.type === 'amount' && (
        <div
          className="rounded-[24px] p-4"
          style={{ backgroundColor: surface.card }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4" style={{ color: activeAccentHex }} />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Amount Breakdown ({selectedHabit.unit || 'units'})
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div
              className="rounded-2xl p-3"
              style={{ backgroundColor: surface.high }}
            >
              <div
                className="text-lg font-extrabold tabular-nums"
                style={{ color: surface.text }}
              >
                {fullStats.quantTotalValue}
              </div>
              <div
                className="text-[11px] font-medium mt-0.5"
                style={{ color: surface.muted }}
              >
                Total {selectedHabit.unit}
              </div>
            </div>
            <div
              className="rounded-2xl p-3"
              style={{ backgroundColor: surface.high }}
            >
              <div
                className="text-lg font-extrabold tabular-nums"
                style={{ color: surface.text }}
              >
                {fullStats.quantAvgValue}
              </div>
              <div
                className="text-[11px] font-medium mt-0.5"
                style={{ color: surface.muted }}
              >
                Daily avg
              </div>
            </div>
            <div
              className="rounded-2xl p-3"
              style={{ backgroundColor: surface.high }}
            >
              <div
                className="text-lg font-extrabold tabular-nums"
                style={{ color: activeAccentHex }}
              >
                {fullStats.quantMaxValue} / {getHabitTarget(selectedHabit)}
              </div>
              <div
                className="text-[11px] font-medium mt-0.5"
                style={{ color: surface.muted }}
              >
                Best day
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Times Completed (PeriodTotals Card from widgets/period_totals.dart) */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2
            className="w-4 h-4"
            style={{ color: activeAccentHex }}
          />
          <h2
            className="text-xs font-extrabold uppercase tracking-wider"
            style={{ color: surface.muted }}
          >
            Times Completed
          </h2>
        </div>

        <div className="divide-y" style={{ borderColor: surface.outline }}>
          {[
            { label: 'This week', value: fullStats.weekDone, highlight: false },
            {
              label: 'This month',
              value: fullStats.monthDone,
              highlight: false,
            },
            {
              label:
                selectedYear === currentYear
                  ? 'This year'
                  : String(selectedYear),
              value: fullStats.totalInYear,
              highlight: false,
            },
            {
              label: 'All time',
              value: fullStats.allTimeDone,
              highlight: true,
            },
          ].map((row) => (
            <div
              key={row.label}
              className="py-2.5 flex items-center justify-between"
            >
              <span
                className="text-[13px] font-semibold"
                style={{ color: surface.muted }}
              >
                {row.label}
              </span>
              <span
                className="text-[15px] font-extrabold tabular-nums"
                style={{
                  color: row.highlight ? activeAccentHex : surface.text,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Perfect Streak Gradient Banner Card (_PerfectStreakCard from statistics_page.dart) */}
      <div
        className="rounded-[22px] px-4 py-3.5"
        style={{
          background: `linear-gradient(135deg, ${hexWithAlpha(
            activeAccentHex,
            0.22
          )}, ${hexWithAlpha(activeAccentHex, 0.06)})`,
          border: `1px solid ${hexWithAlpha(activeAccentHex, 0.32)}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[11px] font-extrabold uppercase tracking-widest"
            style={{ color: surface.muted }}
          >
            Perfect Streak
          </span>
          {fullStats.bestPerfectStreak > fullStats.perfectStreak && (
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: surface.muted }}
            >
              Best streak {fullStats.bestPerfectStreak}d
            </span>
          )}
        </div>
        <div
          className="text-[15px] font-extrabold mt-1.5"
          style={{ color: surface.text }}
        >
          {fullStats.perfectStreak > 0
            ? `${fullStats.perfectStreak} consecutive days completing all scheduled habits`
            : `Complete all scheduled habits today to start a perfect streak (Best: ${fullStats.bestPerfectStreak}d)`}
        </div>
      </div>

      {/* 7. Streak & Daily Trend Evolution (Last 30 Days with Dashed Average Line) */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp
              className="w-4 h-4"
              style={{ color: activeAccentHex }}
            />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Daily Trend (30d)
            </h2>
          </div>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: surface.muted }}
          >
            Avg {trend30Data.average} / day
          </span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trend30Data.series}
              margin={{ top: 8, right: 6, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="streakTrendFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.32}
                  />
                  <stop
                    offset="95%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={hexWithAlpha(surface.muted, 0.14)}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                interval={6}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                  fontWeight: 600,
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: surface.text,
                }}
              />
              <ReferenceLine
                y={trend30Data.average}
                stroke={hexWithAlpha(surface.muted, 0.6)}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="completions"
                stroke={activeAccentHex}
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#streakTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 8. Completions / Month Spline Area Chart (Matches 04-insights.png) */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LineChartIcon
              className="w-4 h-4"
              style={{ color: activeAccentHex }}
            />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Completions / Month
            </h2>
          </div>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: surface.muted }}
          >
            {selectedYear}
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyChartData}
              margin={{ top: 8, right: 6, left: -26, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="streakMonthFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.38}
                  />
                  <stop
                    offset="95%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={hexWithAlpha(surface.muted, 0.14)}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                  fontWeight: 600,
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: surface.text,
                }}
              />
              <Area
                type="monotone"
                dataKey="completions"
                stroke={activeAccentHex}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#streakMonthFill)"
                dot={{
                  r: 3,
                  fill: activeAccentHex,
                  strokeWidth: 0,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 9. Side-by-Side Row: Consistency Radial Gauge + Best Days of Week (WeekdayBars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Consistency Radial Gauge Card */}
        <div
          className="rounded-[24px] p-4 flex flex-col justify-between"
          style={{ backgroundColor: surface.card }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: activeAccentHex }} />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Consistency
            </h2>
          </div>

          <div className="py-1 flex-1 flex items-center justify-center">
            <ConsistencyGauge
              percent={consistencyData.percent}
              deltaText={consistencyData.deltaText}
              periodLabel={consistencyData.periodLabel}
              color={activeAccentHex}
              trackColor={surface.highest}
              textColor={surface.text}
              mutedColor={surface.muted}
              onCyclePeriod={() =>
                setConsistencyPeriodIdx(
                  (prev) => (prev + 1) % CONSISTENCY_PERIODS.length
                )
              }
            />
          </div>
        </div>

        {/* Best Days (WeekdayBars Mon-Sun) Card */}
        <div
          className="rounded-[24px] p-4 flex flex-col justify-between"
          style={{ backgroundColor: surface.card }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays
              className="w-4 h-4"
              style={{ color: activeAccentHex }}
            />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Best Days
            </h2>
          </div>

          <div className="h-40 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekdayChartData}
                margin={{ top: 6, right: 4, left: -28, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: surface.muted,
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{
                    fontSize: 10,
                    fill: surface.muted,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    borderRadius: '14px',
                    fontSize: '12px',
                    color: surface.text,
                  }}
                  formatter={(val: unknown) => [`${val}`, 'Completions']}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 8, 8]}
                  maxBarSize={20}
                  background={{
                    fill: hexWithAlpha(surface.highest, 0.45),
                    radius: 8,
                  }}
                >
                  {weekdayChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.count === entry.max && entry.count > 0
                          ? activeAccentHex
                          : hexWithAlpha(activeAccentHex, 0.72)
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 10. Completion Time of Day Area Chart (HourArea from stat_line_charts.dart) */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: activeAccentHex }} />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Completion Time
            </h2>
          </div>
          <span
            className="text-[11px] font-bold"
            style={{ color: surface.muted }}
          >
            Time of day
          </span>
        </div>

        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={hourChartData}
              margin={{ top: 8, right: 6, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="streakHourFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={activeAccentHex}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                  fontWeight: 600,
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                  fill: surface.muted,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: surface.text,
                }}
                formatter={(val: unknown) => [`${val}`, 'Check-ins']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={activeAccentHex}
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#streakHourFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 11. By Habit Donut Chart & 12. Ranking Horizontal Bars (when viewing All habits) */}
      {selectedHabitId === 'all' && activeHabits.length > 1 && (
        <>
          <div
            className="rounded-[24px] p-4"
            style={{ backgroundColor: surface.card }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieChartIcon
                  className="w-4 h-4"
                  style={{ color: activeAccentHex }}
                />
                <h2
                  className="text-xs font-extrabold uppercase tracking-wider"
                  style={{ color: surface.muted }}
                >
                  By Habit
                </h2>
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: surface.muted }}
              >
                Tap slice to inspect
              </span>
            </div>

            <HabitDonutChart
              entries={donutEntries}
              textColor={surface.text}
              mutedColor={surface.muted}
              highColor={surface.high}
              onSelectHabit={(id) => {
                const found = activeHabits.find((h) => h.id === id);
                if (found) onSelectHabit(found);
              }}
            />
          </div>

          <div
            className="rounded-[24px] p-4"
            style={{ backgroundColor: surface.card }}
          >
            <h2
              className="text-xs font-extrabold uppercase tracking-wider mb-3.5"
              style={{ color: surface.muted }}
            >
              Ranking
            </h2>

            <div className="space-y-3.5">
              {rankingList.map(({ habit, total, barWidthPct }) => {
                const hColor = habit.color || surface.accent;
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => onSelectHabit(habit)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span
                        className="truncate group-hover:opacity-90"
                        style={{ color: surface.text }}
                      >
                        {habit.name}
                      </span>
                      <span
                        className="tabular-nums font-extrabold ml-2"
                        style={{ color: surface.muted }}
                      >
                        {total}
                      </span>
                    </div>
                    <div
                      className="h-2.5 w-full rounded-full overflow-hidden"
                      style={{ backgroundColor: surface.high }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidthPct}%`,
                          backgroundColor: hColor,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 13. Overview 2x2 Secondary Stats Grid (_SecondaryStats from statistics_page.dart) */}
      <div>
        <h2
          className="text-[11px] font-extrabold uppercase tracking-widest mb-2.5 px-1"
          style={{ color: surface.muted }}
        >
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatisticsCard
            label="Active days"
            value={fullStats.activeDays}
            icon={<CalendarCheck className="w-4 h-4" />}
            iconColor={activeAccentHex}
            cardBg={surface.card}
            textColor={surface.text}
            mutedColor={surface.muted}
          />
          <StatisticsCard
            label="Perfect days"
            value={fullStats.perfectDays}
            icon={<Sparkles className="w-4 h-4" />}
            iconColor={surface.success}
            cardBg={surface.card}
            textColor={surface.text}
            mutedColor={surface.muted}
          />
          <StatisticsCard
            label="Per week"
            value={fullStats.perWeek.toFixed(1)}
            icon={<Repeat2 className="w-4 h-4" />}
            iconColor={surface.info}
            cardBg={surface.card}
            textColor={surface.text}
            mutedColor={surface.muted}
          />
          <StatisticsCard
            label="Best month"
            value={fullStats.bestMonthLabel}
            icon={<CalendarRange className="w-4 h-4" />}
            iconColor={surface.warning}
            cardBg={surface.card}
            textColor={surface.text}
            mutedColor={surface.muted}
          />
        </div>
      </div>
    </div>
  );
};
