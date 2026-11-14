import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Flame,
  Shield,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  AccentColorId,
  Habit,
  HabitCompletion,
  HeatmapViewMode,
  InterfaceStyle,
} from '../types/habit';
import {
  ACCENT_PALETTES,
  HABIT_COVER_PRESETS,
  hexWithAlpha,
} from '../utils/themes';
import {
  formatScheduleLabel,
  getEntryIntensity,
  isEntryCompleted,
  parseDateKey,
} from '../utils/habitLogic';
import { HabitIcon } from './HabitIcon';
import { CelebrationBurst } from './CelebrationBurst';
import { StrengthBar } from './StrengthBar';

interface HabitCardProps {
  habit: Habit;
  record?: HabitCompletion;
  currentStreak: number;
  completionRate: number;
  strengthScore?: number;
  recent7Days: { date: string; record?: HabitCompletion }[];
  accentColor: AccentColorId;
  interfaceStyle: InterfaceStyle;
  viewMode?: HeatmapViewMode;
  isDark: boolean;
  reorderMode?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onToggleComplete: (habit: Habit) => void;
  onToggleDay?: (habit: Habit, dateStr: string) => void;
  onIncrementAmount?: (habit: Habit, delta: number) => void;
  onMarkAvoidRelapse?: (habit: Habit) => void;
  onOpenDetails: (habit: Habit) => void;
  onMoveOrder?: (habitId: string, direction: 'up' | 'down') => void;
}

const SHORT_DOW_UPPER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const SHORT_DOW_TITLE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function resolveCoverImageUrl(coverImage?: string): string | null {
  if (!coverImage) return null;
  const preset = HABIT_COVER_PRESETS.find((p) => p.id === coverImage);
  if (preset) return preset.url;
  if (coverImage.startsWith('data:') || coverImage.startsWith('http')) {
    return coverImage;
  }
  return null;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  record,
  currentStreak,
  completionRate,
  strengthScore,
  recent7Days,
  accentColor,
  interfaceStyle,
  isDark,
  reorderMode = false,
  isFirst = false,
  isLast = false,
  onToggleComplete,
  onToggleDay,
  onIncrementAmount,
  onMarkAvoidRelapse,
  onOpenDetails,
  onMoveOrder,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const habitColor = habit.color || surface.accent;
  const coverUrl = resolveCoverImageUrl(habit.coverImage);

  const completed = isEntryCompleted(habit, record);
  const currentValue = record?.value ?? 0;
  const target =
    habit.target && habit.target > 0
      ? habit.target
      : habit.dailyTarget && habit.dailyTarget > 0
      ? habit.dailyTarget
      : 1;
  const isRelapsed = habit.type === 'avoid' && record && record.value < 0;

  const prevCompletedRef = useRef<boolean>(completed);
  const [burstKey, setBurstKey] = useState<string | null>(null);
  const [cardPulse, setCardPulse] = useState(false);

  useEffect(() => {
    if (!prevCompletedRef.current && completed) {
      setBurstKey((prev) => prev || 'main');
      setCardPulse(true);
      const timer = window.setTimeout(() => {
        setBurstKey(null);
        setCardPulse(false);
      }, 600);
      prevCompletedRef.current = completed;
      return () => window.clearTimeout(timer);
    }
    prevCompletedRef.current = completed;
  }, [completed]);

  const triggerLocalBurst = (key: string) => {
    setBurstKey(key);
    setCardPulse(true);
    window.setTimeout(() => {
      setBurstKey((curr) => (curr === key ? null : curr));
      setCardPulse(false);
    }, 600);
  };

  const strengthPct =
    typeof strengthScore === 'number' ? strengthScore : completionRate;

  // Reorder controls override
  if (reorderMode && onMoveOrder) {
    return (
      <div
        className="rounded-[20px] p-3.5 flex items-center justify-between gap-3"
        style={{
          backgroundColor: surface.card,
          border: `1px solid ${
            isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
          }`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: hexWithAlpha(habitColor, 0.16),
              color: habitColor,
            }}
          >
            <HabitIcon name={habit.icon} className="w-5 h-5" />
          </div>
          <span
            className="text-[15px] font-bold truncate"
            style={{ color: surface.text }}
          >
            {habit.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMoveOrder(habit.id, 'up')}
            aria-label={`Move ${habit.name} up`}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: surface.high, color: surface.text }}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMoveOrder(habit.id, 'down')}
            aria-label={`Move ${habit.name} down`}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: surface.high, color: surface.text }}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 1. MINIMAL STYLE (Ultra-compact row + 5-day interactive squares on right)
  if (interfaceStyle === 'minimal') {
    const last5Days = recent7Days.slice(-5);
    return (
      <motion.div
        animate={cardPulse ? { scale: [1, 1.012, 1] } : { scale: 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[20px] px-3.5 py-3 transition-colors"
        style={{
          backgroundColor: surface.card,
          border: `1px solid ${
            isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
          }`,
        }}
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Tinted Icon + Habit Title */}
          <button
            type="button"
            onClick={() => onOpenDetails(habit)}
            aria-label={`Open details for ${habit.name}`}
            className="flex items-center gap-3 min-w-0 flex-1 text-left focus:outline-none"
          >
            <motion.div
              animate={
                cardPulse
                  ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.38 }}
              className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0"
              style={{
                backgroundColor: hexWithAlpha(habitColor, 0.16),
                color: habitColor,
              }}
            >
              <HabitIcon name={habit.icon} className="w-5 h-5" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div
                className="text-[15px] font-bold truncate"
                style={{ color: surface.text }}
              >
                {habit.name}
              </div>
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5 truncate"
                style={{ color: surface.muted }}
              >
                <motion.span
                  animate={cardPulse ? { scale: [1, 1.22, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="inline-flex items-center gap-0.5 font-mono-tabular"
                >
                  <Flame className="w-3 h-3" style={{ color: habitColor }} />
                  {currentStreak}d
                </motion.span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5 font-mono-tabular">
                  <Zap className="w-2.5 h-2.5" style={{ color: habitColor }} />
                  {strengthPct}%
                </span>
                {habit.type === 'amount' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">
                      {currentValue}/{target} {habit.unit}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Right: 5-Day Weekday Header + Interactive Colored Squares */}
          <div className="flex items-center gap-1.5 shrink-0">
            {last5Days.map((day, idx) => {
              const dt = parseDateKey(day.date);
              const dowLabel = SHORT_DOW_TITLE[dt.getDay()];
              const lvl = getEntryIntensity(habit, day.record);
              const isToday = idx === last5Days.length - 1;
              const isDayDone = lvl > 0;
              const isBursting =
                burstKey === day.date || (isToday && burstKey === 'main');

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className="text-[10px] font-semibold leading-none"
                    style={{ color: surface.muted }}
                  >
                    {dowLabel}
                  </span>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.86 }}
                    onClick={() => {
                      if (!isDayDone) {
                        triggerLocalBurst(day.date);
                      }
                      if (isToday) {
                        if (
                          habit.type === 'amount' &&
                          onIncrementAmount &&
                          !completed
                        ) {
                          onIncrementAmount(
                            habit,
                            target >= 10
                              ? Math.max(1, Math.round(target / 4))
                              : 1
                          );
                        } else {
                          onToggleComplete(habit);
                        }
                      } else if (onToggleDay) {
                        onToggleDay(habit, day.date);
                      } else {
                        onToggleComplete(habit);
                      }
                    }}
                    aria-label={
                      isToday
                        ? completed
                          ? `Undo completion for ${habit.name}`
                          : `Mark ${habit.name} complete`
                        : `Toggle ${habit.name} on ${day.date}`
                    }
                    className="relative w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors overflow-visible"
                    style={{
                      backgroundColor: isDayDone
                        ? lvl === 4
                          ? habitColor
                          : hexWithAlpha(habitColor, 0.55)
                        : hexWithAlpha(habitColor, isDark ? 0.14 : 0.12),
                      border:
                        isToday && !isDayDone
                          ? `1.5px solid ${hexWithAlpha(habitColor, 0.55)}`
                          : 'none',
                    }}
                  >
                    <CelebrationBurst
                      active={isBursting}
                      color={habitColor}
                      size="sm"
                    />
                    <AnimatePresence mode="wait" initial={false}>
                      {isDayDone && (
                        <motion.span
                          key="checked"
                          initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.3, opacity: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 20,
                          }}
                          className="flex items-center justify-center"
                        >
                          <Check
                            className="w-3.5 h-3.5 stroke-[2.8]"
                            style={{ color: '#FFFFFF' }}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. EXPRESS STYLE (`lib/features/habits/widgets/express_habit_card.dart` — Large Hero Card with Cover Photo & Strength Bar)
  if (interfaceStyle === 'express') {
    return (
      <motion.div
        animate={cardPulse ? { scale: [1, 1.015, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[28px] overflow-hidden transition-all"
        style={{
          backgroundColor: completed
            ? hexWithAlpha(habitColor, isDark ? 0.12 : 0.08)
            : surface.card,
          border: `1px solid ${
            completed
              ? hexWithAlpha(habitColor, 0.45)
              : isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)'
          }`,
        }}
      >
        {/* Cover Image Backdrop if present */}
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
                  ? 'linear-gradient(180deg, rgba(13,13,13,0.45) 0%, rgba(19,19,23,0.92) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.94) 100%)',
              }}
            />
          </div>
        )}

        <div className="relative z-10 p-4 space-y-3.5">
          {/* Top Express Header */}
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenDetails(habit)}
              aria-label={`Open details for ${habit.name}`}
              className="flex items-center gap-3.5 min-w-0 flex-1 text-left focus:outline-none"
            >
              <div
                className="w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  backgroundColor: hexWithAlpha(habitColor, 0.22),
                  color: habitColor,
                }}
              >
                <HabitIcon name={habit.icon} className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[17px] font-extrabold tracking-tight truncate"
                    style={{ color: surface.text }}
                  >
                    {habit.name}
                  </span>
                  {habit.category && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: hexWithAlpha(habitColor, 0.18),
                        color: habitColor,
                      }}
                    >
                      {habit.category}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-2 text-xs font-semibold mt-1"
                  style={{ color: surface.muted }}
                >
                  <span
                    className="inline-flex items-center gap-1 font-bold font-mono-tabular"
                    style={{ color: habitColor }}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {currentStreak}d streak
                  </span>
                  <span>·</span>
                  <span>{formatScheduleLabel(habit.schedule)}</span>
                  {habit.type === 'amount' && (
                    <>
                      <span>·</span>
                      <span className="font-mono-tabular font-bold" style={{ color: surface.text }}>
                        {currentValue}/{target} {habit.unit}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Express Squircle Check Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (!completed) triggerLocalBurst('main');
                if (
                  habit.type === 'amount' &&
                  onIncrementAmount &&
                  !completed
                ) {
                  onIncrementAmount(
                    habit,
                    target >= 10 ? Math.max(1, Math.round(target / 4)) : 1
                  );
                } else {
                  onToggleComplete(habit);
                }
              }}
              aria-label={
                completed
                  ? `Undo completion for ${habit.name}`
                  : `Mark ${habit.name} complete`
              }
              className="relative w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 transition-all overflow-visible shadow-sm"
              style={{
                backgroundColor: completed
                  ? habitColor
                  : hexWithAlpha(habitColor, 0.18),
                border: completed
                  ? 'none'
                  : `1.8px solid ${hexWithAlpha(habitColor, 0.55)}`,
                color: completed ? '#FFFFFF' : habitColor,
              }}
            >
              <CelebrationBurst
                active={burstKey === 'main'}
                color={habitColor}
                size="md"
              />
              <Check className="w-6 h-6 stroke-[2.75]" />
            </motion.button>
          </div>

          {/* Habit Strength Bar (`strength_bar.dart`) */}
          <StrengthBar
            value={strengthPct}
            color={habitColor}
            trackColor={hexWithAlpha(surface.high, 0.85)}
            showLabel
            textColor={surface.text}
            mutedColor={surface.muted}
          />

          {/* Compact 7-Day Activity Strip */}
          {recent7Days.length > 0 && (
            <div className="grid grid-cols-7 gap-1.5 pt-0.5">
              {recent7Days.map((day) => {
                const dt = parseDateKey(day.date);
                const dayNum = dt.getDate();
                const dow = SHORT_DOW_UPPER[dt.getDay()];
                const lvl = getEntryIntensity(habit, day.record);
                const isDayDone = lvl > 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      if (!isDayDone) triggerLocalBurst(`exp_${day.date}`);
                      if (onToggleDay) onToggleDay(habit, day.date);
                      else onToggleComplete(habit);
                    }}
                    className="py-1.5 rounded-2xl flex flex-col items-center justify-center transition-all"
                    style={{
                      backgroundColor: isDayDone
                        ? habitColor
                        : hexWithAlpha(surface.high, 0.75),
                      color: isDayDone ? '#FFFFFF' : surface.muted,
                    }}
                  >
                    <span
                      className="text-[11px] font-extrabold font-mono-tabular"
                      style={{ color: isDayDone ? '#FFFFFF' : surface.text }}
                    >
                      {dayNum}
                    </span>
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider"
                      style={{
                        color: isDayDone
                          ? 'rgba(255,255,255,0.85)'
                          : surface.muted,
                      }}
                    >
                      {dow}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // 3. CLASSIC STYLE (Default Streak Classic card with StrengthBar + 7-day pill strip)
  return (
    <motion.div
      animate={cardPulse ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-[24px] p-4 transition-colors overflow-hidden"
      style={{
        backgroundColor: surface.card,
        border: `1px solid ${
          isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
        }`,
      }}
    >
      {/* Top Row: Tinted Icon + Title/Metadata/StrengthBar + Right 44x44 Action Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenDetails(habit)}
          aria-label={`Open details for ${habit.name}`}
          className="flex items-center gap-3.5 min-w-0 flex-1 text-left focus:outline-none"
        >
          <motion.div
            animate={
              cardPulse
                ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.38 }}
            className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: hexWithAlpha(habitColor, 0.16),
              color: habitColor,
            }}
          >
            <HabitIcon name={habit.icon} className="w-5 h-5" />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div
              className="text-[16px] font-bold truncate leading-snug"
              style={{ color: surface.text }}
            >
              {habit.name}
            </div>

            {/* Metadata row: Flame + Streak · Schedule · Category */}
            <div
              className="flex items-center gap-1.5 text-[12px] font-semibold mt-0.5 truncate"
              style={{ color: surface.muted }}
            >
              <motion.span
                animate={cardPulse ? { scale: [1, 1.24, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="inline-flex items-center gap-1 font-mono-tabular"
              >
                <Flame className="w-3.5 h-3.5" style={{ color: habitColor }} />
                {currentStreak}
              </motion.span>
              {habit.type === 'amount' ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {currentValue} / {target} {habit.unit}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatScheduleLabel(habit.schedule)}</span>
                </>
              )}
              {habit.category && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{habit.category}</span>
                </>
              )}
            </div>

            {/* Strength Bar (`strength_bar.dart`) + Strength % */}
            <div className="flex items-center gap-2.5 mt-2">
              <div className="flex-1">
                <StrengthBar
                  value={strengthPct}
                  color={habitColor}
                  trackColor={surface.high}
                />
              </div>
              <span
                className="text-[11px] font-bold font-mono-tabular shrink-0"
                style={{ color: surface.muted }}
                title="Habit Strength Score"
              >
                {strengthPct}%
              </span>
            </div>
          </div>
        </button>

        {/* Right 44x44 Check / Shield / Amount Button */}
        {habit.type === 'amount' && onIncrementAmount ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {currentValue > 0 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => onIncrementAmount(habit, -1)}
                aria-label={`Decrease ${habit.name}`}
                className="w-9 h-11 rounded-[12px] flex items-center justify-center transition"
                style={{
                  backgroundColor: surface.high,
                  color: surface.muted,
                }}
              >
                <Minus className="w-4 h-4" />
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (!completed) {
                  triggerLocalBurst('main');
                }
                if (completed) {
                  onToggleComplete(habit);
                } else {
                  onIncrementAmount(
                    habit,
                    target >= 10 ? Math.max(1, Math.round(target / 4)) : 1
                  );
                }
              }}
              aria-label={
                completed
                  ? `Reset ${habit.name}`
                  : `Add progress to ${habit.name}`
              }
              className="relative w-11 h-11 rounded-[14px] flex items-center justify-center font-mono-tabular text-xs font-bold transition-colors overflow-visible"
              style={{
                backgroundColor: completed
                  ? habitColor
                  : hexWithAlpha(habitColor, 0.14),
                border: completed
                  ? 'none'
                  : `1.6px solid ${hexWithAlpha(habitColor, 0.5)}`,
                color: completed ? '#FFFFFF' : habitColor,
              }}
            >
              <CelebrationBurst
                active={burstKey === 'main'}
                color={habitColor}
                size="md"
              />
              <AnimatePresence mode="wait" initial={false}>
                {completed ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0.35, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.35, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="plus"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        ) : habit.type === 'avoid' ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {onMarkAvoidRelapse && !isRelapsed && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => onMarkAvoidRelapse(habit)}
                aria-label={`Log slip for ${habit.name}`}
                title="Log slip"
                className="w-9 h-11 rounded-[12px] flex items-center justify-center transition"
                style={{
                  backgroundColor: surface.high,
                  color: surface.muted,
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </motion.button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (!completed) triggerLocalBurst('main');
                onToggleComplete(habit);
              }}
              aria-label={
                completed
                  ? `Undo completion for ${habit.name}`
                  : `Mark ${habit.name} avoided today`
              }
              className="relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-colors overflow-visible"
              style={{
                backgroundColor: isRelapsed
                  ? surface.danger
                  : completed
                  ? habitColor
                  : hexWithAlpha(habitColor, 0.14),
                border:
                  completed || isRelapsed
                    ? 'none'
                    : `1.6px solid ${hexWithAlpha(habitColor, 0.5)}`,
                color: completed || isRelapsed ? '#FFFFFF' : habitColor,
              }}
            >
              <CelebrationBurst
                active={burstKey === 'main'}
                color={habitColor}
                size="md"
              />
              <motion.span
                key={completed ? 'shield-done' : 'shield-idle'}
                initial={{ scale: 0.5, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                <Shield className="w-5 h-5 stroke-[2.2]" />
              </motion.span>
            </motion.button>
          </div>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              if (!completed) triggerLocalBurst('main');
              onToggleComplete(habit);
            }}
            aria-label={
              completed
                ? `Undo completion for ${habit.name}`
                : `Mark ${habit.name} complete`
            }
            className="relative w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors overflow-visible"
            style={{
              backgroundColor: completed
                ? habitColor
                : hexWithAlpha(habitColor, 0.14),
              border: completed
                ? 'none'
                : `1.6px solid ${hexWithAlpha(habitColor, 0.5)}`,
              color: completed ? '#FFFFFF' : habitColor,
            }}
          >
            <CelebrationBurst
              active={burstKey === 'main'}
              color={habitColor}
              size="md"
            />
            <motion.span
              key={completed ? 'check-done' : 'check-idle'}
              initial={{ scale: 0.4, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 20 }}
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </motion.span>
          </motion.button>
        )}
      </div>

      {/* Bottom 7-Day Pill Strip */}
      {recent7Days.length > 0 && (
        <div className="grid grid-cols-7 gap-1.5 mt-3.5">
          {recent7Days.map((day) => {
            const dt = parseDateKey(day.date);
            const dayNum = dt.getDate();
            const dow = SHORT_DOW_UPPER[dt.getDay()];
            const lvl = getEntryIntensity(habit, day.record);
            const isDayDone = lvl > 0;
            const isPillBursting = burstKey === `pill_${day.date}`;

            return (
              <motion.button
                key={day.date}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (!isDayDone) {
                    triggerLocalBurst(`pill_${day.date}`);
                  }
                  if (onToggleDay) {
                    onToggleDay(habit, day.date);
                  } else {
                    onToggleComplete(habit);
                  }
                }}
                aria-label={`Toggle ${habit.name} on ${day.date}`}
                className="relative py-1.5 rounded-[11px] flex flex-col items-center justify-center transition-colors overflow-visible"
                style={{
                  backgroundColor: isDayDone
                    ? habitColor
                    : hexWithAlpha(habitColor, isDark ? 0.1 : 0.08),
                  color: isDayDone ? '#FFFFFF' : surface.muted,
                }}
              >
                <CelebrationBurst
                  active={isPillBursting}
                  color={habitColor}
                  size="sm"
                />
                <span
                  className="text-[12px] font-extrabold font-mono-tabular leading-tight"
                  style={{ color: isDayDone ? '#FFFFFF' : surface.text }}
                >
                  {dayNum}
                </span>
                <span
                  className="text-[9px] font-bold tracking-wider uppercase mt-0.5 leading-none"
                  style={{
                    color: isDayDone
                      ? 'rgba(255,255,255,0.85)'
                      : surface.muted,
                  }}
                >
                  {dow}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
