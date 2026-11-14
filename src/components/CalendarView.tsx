import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Habit, HabitCompletion, AccentColorId } from '../types/habit';
import { ACCENT_PALETTES, getColorLevels, hexWithAlpha } from '../utils/themes';
import {
  getMonthDaysGrid,
  getWeekdayShortLabels,
  getTodayDateString,
  parseDateString,
} from '../utils/dateUtils';
import { isHabitCompletedOnDate, isHabitScheduledOnDate } from '../utils/habitLogic';

interface CalendarViewProps {
  habit: Habit;
  completions: HabitCompletion[];
  accentColor: AccentColorId;
  isDark: boolean;
  weekStartsOn: 0 | 1;
  onToggleDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  habit,
  completions,
  accentColor,
  isDark,
  weekStartsOn,
  onToggleDate,
}) => {
  const todayStr = getTodayDateString();
  const todayDate = parseDateString(todayStr);

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const habitHex = habit.color || surface.accent;
  const levels = getColorLevels(habitHex, isDark, surface.high);
  const weekdayLabels = getWeekdayShortLabels(weekStartsOn);
  const daysGrid = getMonthDaysGrid(viewYear, viewMonth, weekStartsOn);

  const completionMap = new Map<string, HabitCompletion>();
  for (const c of completions) {
    if (c.habitId === habit.id) {
      completionMap.set(c.date, c);
    }
  }

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold" style={{ color: surface.text }}>
          {monthTitle}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: surface.high, color: surface.muted }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: surface.high, color: surface.muted }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
        {weekdayLabels.map((lbl, idx) => (
          <div
            key={idx}
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: surface.muted }}
          >
            {lbl}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {daysGrid.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} className="h-9 rounded-xl" />;
          }

          const dayNum = Number(dateStr.split('-')[2]);
          const isFuture = dateStr > todayStr;
          const isToday = dateStr === todayStr;
          const comp = completionMap.get(dateStr);
          const isCompleted = isHabitCompletedOnDate(habit, comp);
          const isScheduled = isHabitScheduledOnDate(habit, dateStr);

          let ratio = 0;
          if (habit.type === 'amount' && habit.dailyTarget && comp) {
            ratio = Math.min(1, comp.value / habit.dailyTarget);
          } else if (isCompleted) {
            ratio = 1;
          }

          const bgColor =
            ratio >= 1
              ? levels[4]
              : ratio > 0.5
              ? levels[3]
              : ratio > 0
              ? levels[2]
              : surface.high;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isFuture}
              onClick={() => onToggleDate(dateStr)}
              style={{
                backgroundColor: bgColor,
                border: isToday && !isCompleted ? `1.5px solid ${habitHex}` : undefined,
                color: isCompleted ? '#ffffff' : isScheduled ? surface.text : surface.muted,
              }}
              className={`relative h-9 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                isFuture ? 'opacity-25 cursor-not-allowed' : 'hover:opacity-90 active:scale-95 cursor-pointer'
              }`}
            >
              <span>{dayNum}</span>
              {habit.type === 'amount' && comp && comp.value > 0 && (
                <span
                  className="text-[9px] leading-none mt-0.5"
                  style={{ color: isCompleted ? 'rgba(255,255,255,0.9)' : surface.muted }}
                >
                  {comp.value}
                </span>
              )}
              {habit.type !== 'amount' && isCompleted && (
                <Check className="w-2.5 h-2.5 absolute top-1 right-1 opacity-80" strokeWidth={3} />
              )}
              {!isCompleted && isScheduled && !isFuture && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: hexWithAlpha(habitHex, 0.5) }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
