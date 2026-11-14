import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  ArrowUpDown,
  Sparkles,
  Check,
  Flame,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
} from 'lucide-react';
import {
  Habit,
  HabitCompletion,
  AccentColorId,
  InterfaceStyle,
  HeatmapViewMode,
  TodayCardLayout,
} from '../types/habit';
import { ProgressBar } from '../components/ProgressBar';
import { HabitCard, resolveCoverImageUrl } from '../components/HabitCard';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { CelebrationBurst } from '../components/CelebrationBurst';
import { StrengthBar } from '../components/StrengthBar';
import {
  getTodayDateString,
  getMonthDaysGrid,
  parseDateString,
  getLastNDays,
} from '../utils/dateUtils';
import {
  calculateStreak,
  calculateCompletionRate,
  calculateHabitStrength,
  isHabitCompletedOnDate,
  isHabitScheduledOnDate,
  buildHabitHeatmapData,
} from '../utils/habitLogic';
import {
  ACCENT_PALETTES,
  getHourlyQuoteSlot,
  selectHourlyMotivationalQuote,
  getCachedHourlyQuote,
  fetchMotivationalQuoteFromApi,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';

interface TodayScreenProps {
  habits: Habit[];
  completions: HabitCompletion[];
  userName?: string;
  accentColor: AccentColorId;
  interfaceStyle: InterfaceStyle;
  todayCardLayout?: TodayCardLayout;
  showDailyQuote?: boolean;
  customQuotes?: string[];
  isDark: boolean;
  weekStartsOn: 0 | 1;
  onToggleHabit: (habit: Habit, dateStr: string) => void;
  onIncrementAmount: (habit: Habit, dateStr: string, delta: number) => void;
  onSelectHabit: (habit: Habit) => void;
  onOpenNewHabit: () => void;
  onReorderHabit: (habitId: string, direction: 'up' | 'down') => void;
  onToggleInterfaceStyle?: (style: InterfaceStyle) => void;
  onToggleCardLayout?: (layout: TodayCardLayout) => void;
}

const STYLE_CYCLE: InterfaceStyle[] = ['minimal', 'classic', 'express'];
const STYLE_LABEL: Record<InterfaceStyle, string> = {
  minimal: 'Minimal',
  classic: 'Classic',
  express: 'Express',
};

export const TodayScreen: React.FC<TodayScreenProps> = ({
  habits,
  completions,
  userName = '',
  accentColor,
  interfaceStyle,
  todayCardLayout = 'list',
  showDailyQuote = true,
  customQuotes = [],
  isDark,
  weekStartsOn,
  onToggleHabit,
  onIncrementAmount,
  onSelectHabit,
  onOpenNewHabit,
  onReorderHabit,
  onToggleInterfaceStyle,
  onToggleCardLayout,
}) => {
  const [reorderMode, setReorderMode] = useState(false);
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('week');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [burstHabitId, setBurstHabitId] = useState<string | null>(null);

  const [hourSlot, setHourSlot] = useState<number>(() =>
    getHourlyQuoteSlot(Date.now())
  );
  const [quoteIdx, setQuoteIdx] = useState<number>(0);
  const [isRefreshingQuote, setIsRefreshingQuote] = useState<boolean>(false);
  const [currentQuote, setCurrentQuote] = useState<string>(() => {
    const slot = getHourlyQuoteSlot(Date.now());
    return (
      getCachedHourlyQuote(slot) ||
      selectHourlyMotivationalQuote(slot, 0, customQuotes)
    );
  });

  // Automatically check every 30s if the hour has changed, and rotate quote every single hour
  useEffect(() => {
    const checkHourlyRotation = () => {
      const latestSlot = getHourlyQuoteSlot(Date.now());
      if (latestSlot !== hourSlot) {
        setHourSlot(latestSlot);
        setQuoteIdx(0);
        const fallback = selectHourlyMotivationalQuote(
          latestSlot,
          0,
          customQuotes
        );
        setCurrentQuote(fallback);
        fetchMotivationalQuoteFromApi(latestSlot, 0, customQuotes).then(
          (fresh) => {
            setCurrentQuote(fresh);
          }
        );
      }
    };

    // On initial mount for this hourSlot, fetch from API if not yet cached
    if (!getCachedHourlyQuote(hourSlot)) {
      fetchMotivationalQuoteFromApi(hourSlot, quoteIdx, customQuotes).then(
        (fresh) => {
          setCurrentQuote(fresh);
        }
      );
    }

    const timer = window.setInterval(checkHourlyRotation, 30000);
    return () => window.clearInterval(timer);
  }, [hourSlot, customQuotes, quoteIdx]);

  const handleReloadQuote = async () => {
    const nextIdx = quoteIdx + 1;
    setQuoteIdx(nextIdx);
    setIsRefreshingQuote(true);
    // Immediately show next motivational habit quote so feedback is instant
    const immediateQuote = selectHourlyMotivationalQuote(
      hourSlot,
      nextIdx,
      customQuotes
    );
    setCurrentQuote(immediateQuote);

    // Every other reload, also pull a fresh live quote from the free quote API
    if (nextIdx % 2 === 1) {
      const apiQuote = await fetchMotivationalQuoteFromApi(
        hourSlot,
        nextIdx,
        customQuotes
      );
      setCurrentQuote(apiQuote);
    }
    window.setTimeout(() => setIsRefreshingQuote(false), 320);
  };

  const triggerHabitBurst = (id: string) => {
    setBurstHabitId(id);
    window.setTimeout(() => {
      setBurstHabitId((curr) => (curr === id ? null : curr));
    }, 600);
  };

  const todayStr = getTodayDateString();
  const todayDate = parseDateString(todayStr);

  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const activeHabits = useMemo(
    () =>
      habits
        .filter((h) => !h.archived)
        .sort((a, b) => a.order - b.order),
    [habits]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const h of activeHabits) {
      if (h.category) set.add(h.category);
    }
    return Array.from(set);
  }, [activeHabits]);

  const filteredHabits = useMemo(() => {
    if (selectedCategory === 'All') return activeHabits;
    return activeHabits.filter((h) => h.category === selectedCategory);
  }, [activeHabits, selectedCategory]);

  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOnDate(h, todayStr)),
    [activeHabits, todayStr]
  );

  const completionMapToday = useMemo(() => {
    const map = new Map<string, HabitCompletion>();
    for (const c of completions) {
      if (c.date === todayStr) {
        map.set(c.habitId, c);
      }
    }
    return map;
  }, [completions, todayStr]);

  const completedTodayCount = useMemo(() => {
    return scheduledToday.filter((h) =>
      isHabitCompletedOnDate(h, completionMapToday.get(h.id))
    ).length;
  }, [scheduledToday, completionMapToday]);

  const last7DateStrings = useMemo(
    () => getLastNDays(7, todayStr),
    [todayStr]
  );

  const monthDaysGrid = useMemo(
    () =>
      getMonthDaysGrid(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        weekStartsOn
      ).filter((d): d is string => d !== null),
    [todayDate, weekStartsOn]
  );

  const handleCycleStyle = () => {
    if (!onToggleInterfaceStyle) return;
    const nextIdx =
      (STYLE_CYCLE.indexOf(interfaceStyle) + 1) % STYLE_CYCLE.length;
    onToggleInterfaceStyle(STYLE_CYCLE[nextIdx]);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Streak Top Header Row: Personal Greeting */}
      <div className="pt-1">
        <div className="flex items-center justify-between gap-1.5">
          <h1
            className="text-[22px] font-extrabold tracking-tight leading-none truncate"
            style={{ color: surface.text }}
          >
            {userName && userName.trim() ? `Hi, ${userName.trim()}` : 'Today'}
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleInterfaceStyle && (
              <button
                type="button"
                onClick={handleCycleStyle}
                style={{
                  backgroundColor: surface.card,
                  color: surface.text,
                  border: `1px solid ${surface.outline}`,
                }}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors"
                title="Cycle UI Design Mode: Minimal, Classic, Express"
              >
                {STYLE_LABEL[interfaceStyle]}
              </button>
            )}

            {onToggleCardLayout && (
              <button
                type="button"
                onClick={() =>
                  onToggleCardLayout(
                    todayCardLayout === 'list' ? 'grid' : 'list'
                  )
                }
                aria-label={
                  todayCardLayout === 'list'
                    ? 'Switch to 2-column grid view'
                    : 'Switch to compact list view'
                }
                title={
                  todayCardLayout === 'list'
                    ? 'Switch to 2-column grid view'
                    : 'Switch to compact list view'
                }
                style={{
                  backgroundColor:
                    todayCardLayout === 'grid'
                      ? hexWithAlpha(surface.accent, 0.2)
                      : surface.card,
                  color:
                    todayCardLayout === 'grid' ? surface.accent : surface.muted,
                  border: `1px solid ${
                    todayCardLayout === 'grid' ? surface.accent : surface.outline
                  }`,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                {todayCardLayout === 'grid' ? (
                  <ListIcon className="w-3.5 h-3.5" />
                ) : (
                  <LayoutGrid className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {activeHabits.length > 1 && (
              <button
                type="button"
                onClick={() => setReorderMode((r) => !r)}
                aria-label="Toggle reorder habits"
                style={{
                  backgroundColor: reorderMode
                    ? hexWithAlpha(surface.accent, 0.2)
                    : surface.card,
                  color: reorderMode ? surface.accent : surface.muted,
                  border: `1px solid ${
                    reorderMode ? surface.accent : surface.outline
                  }`,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewHabit}
              style={{ backgroundColor: surface.accent }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.75} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Hourly Single-Line Motivational Quote (`lib/features/habits/widgets/daily_quote.dart`) */}
        {showDailyQuote && (
          <div className="flex items-center justify-between gap-2 mt-2">
            <p
              className="text-[13px] font-medium flex items-center gap-1.5 min-w-0"
              style={{ color: surface.muted }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden">
                {currentQuote}
              </span>
            </p>
            <button
              type="button"
              onClick={handleReloadQuote}
              aria-label="Next motivational quote"
              title="Reload motivational quote (rotates automatically every hour)"
              className="p-1 rounded-lg hover:opacity-80 shrink-0"
              style={{ color: surface.muted }}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isRefreshingQuote ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Today's Progress Card with Scalloped Wave Ring */}
      <ProgressBar
        completed={completedTodayCount}
        total={scheduledToday.length}
        dateStr={todayStr}
        accentColor={accentColor}
        isDark={isDark}
      />

      {/* Segmented View Switcher: Week | Month | Year */}
      <div
        className="grid grid-cols-3 p-1 rounded-full"
        style={{ backgroundColor: surface.card }}
      >
        {(['week', 'month', 'year'] as const).map((mode) => {
          const active = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              style={{
                backgroundColor: active ? surface.accent : 'transparent',
                color: active ? '#FFFFFF' : surface.muted,
              }}
              className="py-2 rounded-full text-xs font-bold capitalize transition-all"
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* Category Filter Pills: All | Fitness | Health | Learning */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  backgroundColor: active ? surface.accent : surface.card,
                  color: active ? '#FFFFFF' : surface.muted,
                }}
                className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors"
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Habit List by View Mode & Card Layout (`list` vs `grid`) */}
      {filteredHabits.length === 0 ? (
        <div
          className="rounded-[24px] p-8 text-center space-y-2"
          style={{ backgroundColor: surface.card }}
        >
          <p className="text-sm font-extrabold" style={{ color: surface.text }}>
            {activeHabits.length === 0
              ? 'No habits yet — your clean slate is ready'
              : 'No habits in this category'}
          </p>
          <p className="text-xs max-w-xs mx-auto" style={{ color: surface.muted }}>
            {activeHabits.length === 0
              ? 'Tap below to create your first daily ritual and start building your streak.'
              : 'Create a new habit or switch category filters above.'}
          </p>
          <button
            type="button"
            onClick={onOpenNewHabit}
            style={{ backgroundColor: surface.accent }}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{activeHabits.length === 0 ? 'Create First Habit' : 'Add Habit'}</span>
          </button>
        </div>
      ) : viewMode === 'week' && todayCardLayout === 'list' ? (
        <div className="space-y-3">
          {filteredHabits.map((habit, index) => {
            const streak = calculateStreak(habit, completions, todayStr);
            const rate30 = calculateCompletionRate(
              habit,
              completions,
              30,
              todayStr
            );
            const strength = calculateHabitStrength(
              habit,
              completions,
              todayStr
            );
            const recent7Days = last7DateStrings.map((dStr) => ({
              date: dStr,
              record: completions.find(
                (c) => c.habitId === habit.id && c.date === dStr
              ),
            }));

            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                record={completionMapToday.get(habit.id)}
                currentStreak={streak.current}
                completionRate={rate30}
                strengthScore={strength.percentage}
                recent7Days={recent7Days}
                accentColor={accentColor}
                interfaceStyle={interfaceStyle}
                viewMode={viewMode}
                isDark={isDark}
                reorderMode={reorderMode}
                isFirst={index === 0}
                isLast={index === filteredHabits.length - 1}
                onToggleComplete={(h) => onToggleHabit(h, todayStr)}
                onToggleDay={(h, dStr) => onToggleHabit(h, dStr)}
                onIncrementAmount={(h, delta) =>
                  onIncrementAmount(h, todayStr, delta)
                }
                onOpenDetails={(h) => onSelectHabit(h)}
                onMoveOrder={onReorderHabit}
              />
            );
          })}
        </div>
      ) : viewMode === 'month' || todayCardLayout === 'grid' ? (
        /* Streak 2-Column Grid Habit Cards (`grid_habit_cards.dart` & `compact_activity_strip.dart`) */
        <div className="grid grid-cols-2 gap-3">
          {filteredHabits.map((habit) => {
            const habitColor = habit.color || surface.accent;
            const coverUrl = resolveCoverImageUrl(habit.coverImage);
            const streak = calculateStreak(habit, completions, todayStr);
            const strength = calculateHabitStrength(
              habit,
              completions,
              todayStr
            );
            const compToday = completionMapToday.get(habit.id);
            const doneToday = isHabitCompletedOnDate(habit, compToday);
            const compMap = new Map<string, HabitCompletion>();
            for (const c of completions) {
              if (c.habitId === habit.id) compMap.set(c.date, c);
            }

            return (
              <div
                key={habit.id}
                onClick={() => onSelectHabit(habit)}
                className="relative rounded-[24px] p-3.5 cursor-pointer transition-transform active:scale-[0.99] overflow-hidden"
                style={{
                  backgroundColor: surface.card,
                  border: `1px solid ${
                    doneToday ? hexWithAlpha(habitColor, 0.4) : surface.outline
                  }`,
                }}
              >
                {coverUrl && interfaceStyle === 'express' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <img
                      src={coverUrl}
                      alt=""
                      className="w-full h-full object-cover opacity-30"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: isDark
                          ? 'linear-gradient(180deg, rgba(13,13,13,0.4) 0%, rgba(19,19,23,0.92) 100%)'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.94) 100%)',
                      }}
                    />
                  </div>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: hexWithAlpha(habitColor, 0.16),
                        color: habitColor,
                      }}
                    >
                      {renderHabitIcon(habit.icon, 'w-4 h-4')}
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!doneToday) triggerHabitBurst(habit.id);
                        onToggleHabit(habit, todayStr);
                      }}
                      aria-label={
                        doneToday
                          ? `Undo ${habit.name}`
                          : `Complete ${habit.name}`
                      }
                      style={{
                        backgroundColor: doneToday ? habitColor : surface.high,
                        color: doneToday ? '#FFFFFF' : surface.muted,
                      }}
                      className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors overflow-visible"
                    >
                      <CelebrationBurst
                        active={burstHabitId === habit.id}
                        color={habitColor}
                        size="sm"
                      />
                      <motion.span
                        key={doneToday ? 'done' : 'idle'}
                        initial={{ scale: 0.4, rotate: -18 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 520,
                          damping: 20,
                        }}
                      >
                        <Check className="w-4 h-4" strokeWidth={2.75} />
                      </motion.span>
                    </motion.button>
                  </div>

                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: surface.text }}
                  >
                    {habit.name}
                  </div>
                  <div
                    className="text-[10px] font-semibold flex items-center justify-between gap-1 mt-0.5 mb-2"
                    style={{ color: surface.muted }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3 h-3" style={{ color: habitColor }} />
                      <span>{streak.current}d</span>
                    </span>
                    <span className="font-mono-tabular">
                      {strength.percentage}% str
                    </span>
                  </div>

                  {/* Strength Bar */}
                  <div className="mb-2.5">
                    <StrengthBar
                      value={strength.percentage}
                      color={habitColor}
                      trackColor={surface.high}
                      height={4}
                    />
                  </div>

                  {/* Compact Activity Strip (7-day in Week Grid mode, or Month Dot Grid in Month mode) */}
                  {viewMode === 'week' ? (
                    <div className="grid grid-cols-7 gap-1">
                      {last7DateStrings.map((dStr) => {
                        const done = isHabitCompletedOnDate(
                          habit,
                          compMap.get(dStr)
                        );
                        return (
                          <div
                            key={dStr}
                            className="h-3.5 rounded-[4px]"
                            style={{
                              backgroundColor: done ? habitColor : surface.high,
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {monthDaysGrid.map((dStr) => {
                        const done = isHabitCompletedOnDate(
                          habit,
                          compMap.get(dStr)
                        );
                        return (
                          <div
                            key={dStr}
                            className="aspect-square rounded-[3px]"
                            style={{
                              backgroundColor: done ? habitColor : surface.high,
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Streak Compact Year Cards */
        <div className="space-y-3">
          {filteredHabits.map((habit) => {
            const habitColor = habit.color || surface.accent;
            const streak = calculateStreak(habit, completions, todayStr);
            const strength = calculateHabitStrength(
              habit,
              completions,
              todayStr
            );
            const compToday = completionMapToday.get(habit.id);
            const doneToday = isHabitCompletedOnDate(habit, compToday);
            const heatCells = buildHabitHeatmapData(
              habit,
              completions,
              180,
              todayStr
            );

            return (
              <div
                key={habit.id}
                onClick={() => onSelectHabit(habit)}
                className="rounded-[24px] p-4 cursor-pointer space-y-3"
                style={{ backgroundColor: surface.card }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: hexWithAlpha(habitColor, 0.16),
                        color: habitColor,
                      }}
                    >
                      {renderHabitIcon(habit.icon, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-sm font-bold truncate"
                        style={{ color: surface.text }}
                      >
                        {habit.name}
                      </h3>
                      <p
                        className="text-[11px] font-medium"
                        style={{ color: surface.muted }}
                      >
                        {streak.current}d streak · Best {streak.longest}d · Strength {strength.percentage}%
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!doneToday) triggerHabitBurst(habit.id);
                      onToggleHabit(habit, todayStr);
                    }}
                    style={{
                      backgroundColor: doneToday ? habitColor : surface.high,
                      color: doneToday ? '#FFFFFF' : surface.muted,
                    }}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-visible"
                  >
                    <CelebrationBurst
                      active={burstHabitId === habit.id}
                      color={habitColor}
                      size="sm"
                    />
                    <motion.span
                      key={doneToday ? 'done' : 'idle'}
                      initial={{ scale: 0.4, rotate: -18 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 520,
                        damping: 20,
                      }}
                    >
                      <Check className="w-4 h-4" strokeWidth={2.75} />
                    </motion.span>
                  </motion.button>
                </div>

                <HabitHeatmap
                  cells={heatCells}
                  accentColor={accentColor}
                  customColor={habitColor}
                  isDark={isDark}
                  weekStartsOn={weekStartsOn}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
