import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Flame,
  Trophy,
  CheckCircle2,
  Percent,
  Calendar,
  Plus,
  Minus,
  GlassWater,
  Zap,
} from 'lucide-react';
import { Habit, HabitCompletion, AccentColorId } from '../types/habit';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { CalendarView } from '../components/CalendarView';
import { StrengthBar } from '../components/StrengthBar';
import { resolveCoverImageUrl } from '../components/HabitCard';
import {
  calculateStreak,
  calculateCompletionRate,
  calculateHabitStrength,
  buildHabitHeatmapData,
  isHabitCompletedOnDate,
} from '../utils/habitLogic';
import {
  getTodayDateString,
  formatShortDate,
  getLastNDays,
} from '../utils/dateUtils';
import {
  ACCENT_PALETTES,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';

interface HabitDetailsScreenProps {
  habit: Habit;
  completions: HabitCompletion[];
  accentColor: AccentColorId;
  isDark: boolean;
  weekStartsOn: 0 | 1;
  onBack: () => void;
  onEdit: (habit: Habit) => void;
  onToggleDate: (habit: Habit, dateStr: string) => void;
  onIncrementAmount: (habit: Habit, dateStr: string, delta: number) => void;
}

export const HabitDetailsScreen: React.FC<HabitDetailsScreenProps> = ({
  habit,
  completions,
  accentColor,
  isDark,
  weekStartsOn,
  onBack,
  onEdit,
  onToggleDate,
  onIncrementAmount,
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const habitColor = habit.color || surface.accent;
  const coverUrl = resolveCoverImageUrl(habit.coverImage);

  const streak = useMemo(
    () => calculateStreak(habit, completions, todayStr),
    [habit, completions, todayStr]
  );

  const strength = useMemo(
    () => calculateHabitStrength(habit, completions, todayStr),
    [habit, completions, todayStr]
  );

  const completionRate30 = useMemo(
    () => calculateCompletionRate(habit, completions, 30, todayStr),
    [habit, completions, todayStr]
  );

  // Completions this week (last 7 days)
  const thisWeekCount = useMemo(() => {
    const last7 = getLastNDays(7, todayStr);
    let count = 0;
    for (const d of last7) {
      const c = completions.find(
        (comp) => comp.habitId === habit.id && comp.date === d
      );
      if (isHabitCompletedOnDate(habit, c)) count++;
    }
    return count;
  }, [habit, completions, todayStr]);

  const heatmapCells = useMemo(
    () => buildHabitHeatmapData(habit, completions, 364, todayStr),
    [habit, completions, todayStr]
  );

  const selectedCompletion = useMemo(
    () =>
      completions.find(
        (c) => c.habitId === habit.id && c.date === selectedDate
      ),
    [completions, habit.id, selectedDate]
  );

  const isSelectedCompleted = isHabitCompletedOnDate(habit, selectedCompletion);
  const currentAmount = selectedCompletion?.value ?? 0;
  const targetAmount = habit.target ?? habit.dailyTarget ?? 8;

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [habit.id]);

  const recentHistory = useMemo(() => {
    return completions
      .filter((c) => c.habitId === habit.id && isHabitCompletedOnDate(habit, c))
      .sort((a, b) => (a.date > b.date ? -1 : 1))
      .slice(0, 10);
  }, [completions, habit]);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
          style={{ color: surface.muted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(habit)}
          style={{
            backgroundColor: surface.card,
            color: surface.text,
            border: `1px solid ${surface.outline}`,
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      </div>

      {/* Habit Identity Banner (with Cover Photo support) */}
      <div
        className="relative rounded-[24px] p-4 flex items-center gap-3.5 overflow-hidden"
        style={{ backgroundColor: surface.card }}
      >
        {coverUrl && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover opacity-35"
            />
            <div
              className="absolute inset-0"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, rgba(13,13,13,0.88) 0%, rgba(19,19,23,0.6) 100%)'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.68) 100%)',
              }}
            />
          </div>
        )}
        <div
          className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: hexWithAlpha(habitColor, 0.18),
            color: habitColor,
          }}
        >
          {renderHabitIcon(habit.icon, 'w-6 h-6')}
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <h1
            className="text-lg font-extrabold tracking-tight truncate"
            style={{ color: surface.text }}
          >
            {habit.name}
          </h1>
          <p
            className="text-xs font-medium mt-0.5 capitalize"
            style={{ color: surface.muted }}
          >
            {habit.category ? `${habit.category} · ` : ''}
            {habit.type === 'amount'
              ? `Daily goal: ${targetAmount} ${habit.unit}`
              : habit.type === 'avoid'
              ? 'Avoidance habit'
              : 'Regular habit'}
          </p>
        </div>
      </div>

      {/* Habit Strength Score Card (`lib/features/habits/widgets/strength_bar.dart`) */}
      <div
        className="rounded-[24px] p-4 space-y-2.5"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: hexWithAlpha(habitColor, 0.16),
                color: habitColor,
              }}
            >
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2
                className="text-xs font-extrabold"
                style={{ color: surface.text }}
              >
                Habit Strength · {strength.label}
              </h2>
              <p
                className="text-[10px]"
                style={{ color: surface.muted }}
              >
                12-day exponential momentum (decays gently on misses)
              </p>
            </div>
          </div>
          <span
            className="text-lg font-extrabold font-mono-tabular"
            style={{ color: habitColor }}
          >
            {strength.percentage}%
          </span>
        </div>
        <StrengthBar
          value={strength.percentage}
          color={habitColor}
          trackColor={surface.high}
          height={7}
        />
      </div>

      {/* Interactive Amount Visual Cup/Unit Card (Matches 05-amount.png) */}
      {habit.type === 'amount' && (
        <div
          className="rounded-[24px] p-5 text-center space-y-4"
          style={{ backgroundColor: surface.card }}
        >
          <div>
            <div
              className="text-2xl font-extrabold tabular-nums"
              style={{ color: surface.text }}
            >
              {currentAmount} / {targetAmount} {habit.unit || 'units'}
            </div>
            <div
              className="text-xs font-medium mt-0.5"
              style={{ color: surface.muted }}
            >
              {selectedDate === todayStr
                ? 'Daily goal'
                : formatShortDate(selectedDate)}
            </div>
          </div>

          {/* Visual Unit / Glass Grid */}
          <div className="grid grid-cols-4 gap-2.5 max-w-[240px] mx-auto py-1">
            {Array.from({ length: Math.min(16, targetAmount) }).map((_, idx) => {
              const filled = idx < currentAmount;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const desired = idx + 1 === currentAmount ? idx : idx + 1;
                    const delta = desired - currentAmount;
                    if (delta !== 0) {
                      onIncrementAmount(habit, selectedDate, delta);
                    }
                  }}
                  style={{
                    backgroundColor: filled
                      ? hexWithAlpha(habitColor, 0.22)
                      : surface.high,
                    borderColor: filled ? habitColor : 'transparent',
                    color: filled ? habitColor : surface.muted,
                  }}
                  className="h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-95"
                >
                  <GlassWater className="w-5 h-5" />
                </button>
              );
            })}
          </div>

          {/* Circular - and + Buttons (Matches 05-amount.png) */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => onIncrementAmount(habit, selectedDate, -1)}
              aria-label="Decrease amount"
              style={{
                backgroundColor: surface.high,
                color: surface.text,
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onIncrementAmount(habit, selectedDate, 1)}
              aria-label="Increase amount"
              style={{
                backgroundColor: habitColor,
                color: '#FFFFFF',
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STREAKS 3-Column Section (Matches 05-amount.png: Current | Best | This week) */}
      <div>
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2.5 px-1"
          style={{ color: surface.muted }}
        >
          Streaks
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <div
            className="rounded-[24px] p-3.5 text-center"
            style={{ backgroundColor: surface.card }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{
                backgroundColor: hexWithAlpha(habitColor, 0.16),
                color: habitColor,
              }}
            >
              <Flame className="w-4 h-4" />
            </div>
            <div
              className="text-lg font-extrabold tabular-nums"
              style={{ color: surface.text }}
            >
              {streak.current} days
            </div>
            <div
              className="text-[11px] font-medium mt-0.5"
              style={{ color: surface.muted }}
            >
              Current
            </div>
          </div>

          <div
            className="rounded-[24px] p-3.5 text-center"
            style={{ backgroundColor: surface.card }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{
                backgroundColor: hexWithAlpha(surface.warning, 0.16),
                color: surface.warning,
              }}
            >
              <Trophy className="w-4 h-4" />
            </div>
            <div
              className="text-lg font-extrabold tabular-nums"
              style={{ color: surface.text }}
            >
              {streak.longest} days
            </div>
            <div
              className="text-[11px] font-medium mt-0.5"
              style={{ color: surface.muted }}
            >
              Best
            </div>
          </div>

          <div
            className="rounded-[24px] p-3.5 text-center"
            style={{ backgroundColor: surface.card }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{
                backgroundColor: hexWithAlpha(surface.success, 0.16),
                color: surface.success,
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div
              className="text-lg font-extrabold tabular-nums"
              style={{ color: surface.text }}
            >
              {thisWeekCount}/7
            </div>
            <div
              className="text-[11px] font-medium mt-0.5"
              style={{ color: surface.muted }}
            >
              This week
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Quick Action Bar (for normal/avoid habits or inspecting past dates) */}
      <div
        className="rounded-[24px] p-4 flex items-center justify-between gap-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4" style={{ color: habitColor }} />
          <div>
            <div
              className="text-xs font-bold"
              style={{ color: surface.text }}
            >
              {selectedDate === todayStr
                ? 'Today'
                : formatShortDate(selectedDate)}{' '}
              <span
                className="font-normal"
                style={{ color: surface.muted }}
              >
                ({selectedDate})
              </span>
            </div>
            <div
              className="text-[11px] font-medium"
              style={{ color: surface.muted }}
            >
              {isSelectedCompleted
                ? 'Completed · 30d rate ' + completionRate30 + '%'
                : 'Not completed · 30d rate ' + completionRate30 + '%'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleDate(habit, selectedDate)}
          style={{
            backgroundColor: isSelectedCompleted ? habitColor : surface.high,
            color: isSelectedCompleted ? '#FFFFFF' : surface.text,
          }}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
        >
          {isSelectedCompleted ? 'Completed ✓' : 'Mark Done'}
        </button>
      </div>

      {/* Yearly Activity Heatmap */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: surface.muted }}
          >
            Yearly Activity
          </h2>
          <span
            className="text-[11px] font-bold flex items-center gap-1"
            style={{ color: surface.muted }}
          >
            <Percent className="w-3 h-3" />
            {completionRate30}% (30d)
          </span>
        </div>
        <HabitHeatmap
          cells={heatmapCells}
          accentColor={accentColor}
          customColor={habitColor}
          isDark={isDark}
          weekStartsOn={weekStartsOn}
          selectedDate={selectedDate}
          onSelectDate={(dateStr) => {
            setSelectedDate(dateStr);
            if (habit.type !== 'amount') {
              onToggleDate(habit, dateStr);
            }
          }}
        />
      </div>

      {/* Monthly Calendar */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-3"
          style={{ color: surface.muted }}
        >
          Monthly Calendar
        </h2>
        <CalendarView
          habit={habit}
          completions={completions}
          accentColor={accentColor}
          isDark={isDark}
          weekStartsOn={weekStartsOn}
          onToggleDate={(dateStr) => {
            setSelectedDate(dateStr);
            onToggleDate(habit, dateStr);
          }}
        />
      </div>

      {/* Historical Completion Log */}
      <div
        className="rounded-[24px] p-4"
        style={{ backgroundColor: surface.card }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-3"
          style={{ color: surface.muted }}
        >
          Recent Completions
        </h2>
        {recentHistory.length === 0 ? (
          <p className="text-xs" style={{ color: surface.muted }}>
            No completions recorded yet.
          </p>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: surface.outline }}
          >
            {recentHistory.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <span
                  className="font-bold"
                  style={{ color: surface.text }}
                >
                  {formatShortDate(item.date)}
                </span>
                <span
                  className="font-semibold"
                  style={{ color: habitColor }}
                >
                  {habit.type === 'amount'
                    ? `${item.value} / ${targetAmount} ${habit.unit || ''}`
                    : habit.type === 'avoid'
                    ? 'Avoided ✓'
                    : 'Completed ✓'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
