import React, { useState, useMemo } from 'react';
import {
  Plus,
  Archive,
  RotateCcw,
  Edit3,
  Trash2,
  Flame,
  ChevronUp,
  ChevronDown,
  Bell,
} from 'lucide-react';
import { Habit, HabitCompletion, AccentColorId } from '../types/habit';
import {
  ACCENT_PALETTES,
  getColorLevels,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';
import {
  calculateStreak,
  calculateCompletionRate,
  buildHabitHeatmapData,
} from '../utils/habitLogic';
import { getTodayDateString } from '../utils/dateUtils';

interface HabitsScreenProps {
  habits: Habit[];
  completions: HabitCompletion[];
  accentColor: AccentColorId;
  isDark: boolean;
  onSelectHabit: (habit: Habit) => void;
  onOpenNewHabit: () => void;
  onEditHabit: (habit: Habit) => void;
  onToggleArchiveHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onReorderHabit: (habitId: string, direction: 'up' | 'down') => void;
}

export const HabitsScreen: React.FC<HabitsScreenProps> = ({
  habits,
  completions,
  accentColor,
  isDark,
  onSelectHabit,
  onOpenNewHabit,
  onEditHabit,
  onToggleArchiveHabit,
  onDeleteHabit,
  onReorderHabit,
}) => {
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const todayStr = getTodayDateString();

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const displayedHabits = useMemo(
    () =>
      habits
        .filter((h) => h.archived === viewArchived)
        .sort((a, b) => a.order - b.order),
    [habits, viewArchived]
  );

  const scheduleSummary = (habit: Habit): string => {
    const s = habit.schedule;
    if (s.type === 'everyday') return 'Every day';
    if (s.type === 'weekdays') return `${s.weekdays?.length || 0} days / week`;
    if (s.type === 'times_per_week') return `${s.timesPerWeek}x / week`;
    if (s.type === 'times_per_month') return `${s.timesPerMonth}x / month`;
    if (s.type === 'every_n_days') return `Every ${s.intervalDays} days`;
    return 'Daily';
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1
            className="text-[28px] font-extrabold tracking-tight leading-none"
            style={{ color: surface.text }}
          >
            Habits
          </h1>
          <p
            className="text-[13px] font-medium mt-1.5"
            style={{ color: surface.muted }}
          >
            Manage routines, colors, schedules, and reminders
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewHabit}
          style={{ backgroundColor: surface.accent }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.75} />
          <span>New</span>
        </button>
      </div>

      {/* Active / Archived Segmented Pill */}
      <div
        className="grid grid-cols-2 p-1 rounded-full"
        style={{ backgroundColor: surface.card }}
      >
        <button
          type="button"
          onClick={() => setViewArchived(false)}
          style={{
            backgroundColor: !viewArchived ? surface.accent : 'transparent',
            color: !viewArchived ? '#FFFFFF' : surface.muted,
          }}
          className="py-2 rounded-full text-xs font-bold transition-all"
        >
          Active ({habits.filter((h) => !h.archived).length})
        </button>
        <button
          type="button"
          onClick={() => setViewArchived(true)}
          style={{
            backgroundColor: viewArchived ? surface.accent : 'transparent',
            color: viewArchived ? '#FFFFFF' : surface.muted,
          }}
          className="py-2 rounded-full text-xs font-bold transition-all"
        >
          Archived ({habits.filter((h) => h.archived).length})
        </button>
      </div>

      {/* Habit List */}
      {displayedHabits.length === 0 ? (
        <div
          className="rounded-[24px] p-8 text-center"
          style={{ backgroundColor: surface.card }}
        >
          <p className="text-sm font-bold" style={{ color: surface.text }}>
            {viewArchived ? 'No archived habits' : 'No active habits'}
          </p>
          <p className="text-xs mt-1" style={{ color: surface.muted }}>
            {viewArchived
              ? 'Habits you archive will stay safe here without cluttering Today.'
              : 'Create your first habit to begin tracking your daily streaks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedHabits.map((habit, idx) => {
            const habitColor = habit.color || surface.accent;
            const levels = getColorLevels(habitColor, isDark, surface.high);
            const streak = calculateStreak(habit, completions, todayStr);
            const rate30 = calculateCompletionRate(
              habit,
              completions,
              30,
              todayStr
            );
            const recent14 = buildHabitHeatmapData(
              habit,
              completions,
              14,
              todayStr
            );

            return (
              <div
                key={habit.id}
                className="rounded-[24px] p-4 transition-all"
                style={{ backgroundColor: surface.card }}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectHabit(habit)}
                    className="flex items-center gap-3.5 text-left min-w-0 flex-1"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: hexWithAlpha(habitColor, 0.16),
                        color: habitColor,
                      }}
                    >
                      {renderHabitIcon(habit.icon, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold truncate"
                          style={{ color: surface.text }}
                        >
                          {habit.name}
                        </span>
                        {habit.category && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: hexWithAlpha(habitColor, 0.16),
                              color: habitColor,
                            }}
                          >
                            {habit.category}
                          </span>
                        )}
                      </div>

                      <div
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] font-medium"
                        style={{ color: surface.muted }}
                      >
                        <span>{scheduleSummary(habit)}</span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Flame
                            className="w-3 h-3"
                            style={{ color: habitColor }}
                          />
                          {streak.current}d streak
                        </span>
                        <span>{rate30}% (30d)</span>
                        {habit.reminders.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {habit.reminders[0].time}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Mini 14-day strip */}
                  <div className="hidden sm:flex items-center gap-1 pt-2">
                    {recent14.map((c) => (
                      <div
                        key={c.date}
                        title={c.date}
                        className="w-2.5 h-2.5 rounded-[3px]"
                        style={{ backgroundColor: levels[c.level] }}
                      />
                    ))}
                  </div>
                </div>

                {/* Action bar */}
                <div
                  className="flex items-center justify-between mt-3 pt-2.5"
                  style={{ borderTop: `1px solid ${surface.outline}` }}
                >
                  <div className="flex items-center gap-1">
                    {!viewArchived && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onReorderHabit(habit.id, 'up')}
                          aria-label="Move habit up"
                          className="p-1.5 rounded-lg disabled:opacity-25"
                          style={{ color: surface.muted }}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === displayedHabits.length - 1}
                          onClick={() => onReorderHabit(habit.id, 'down')}
                          aria-label="Move habit down"
                          className="p-1.5 rounded-lg disabled:opacity-25"
                          style={{ color: surface.muted }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditHabit(habit)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: surface.high,
                        color: surface.text,
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleArchiveHabit(habit)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors"
                      style={{
                        backgroundColor: surface.high,
                        color: surface.muted,
                      }}
                    >
                      {habit.archived ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </>
                      )}
                    </button>

                    {confirmDeleteId === habit.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteHabit(habit.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500 text-white"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs"
                          style={{ color: surface.muted }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(habit.id)}
                        aria-label="Delete habit"
                        className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
