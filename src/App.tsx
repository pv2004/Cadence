import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  CalendarCheck2,
  Layers,
  Timer,
  Compass,
  BarChart3,
  Download,
} from 'lucide-react';
import {
  Habit,
  HabitCompletion,
  UserPreferences,
  ScreenTab,
  BackupPayload,
  InterfaceStyle,
  TodayCardLayout,
  FocusSession,
  IslandState,
} from './types/habit';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_ISLAND_STATE,
  seedDatabaseIfEmpty,
  saveHabit,
  deleteHabit,
  upsertCompletion,
  deleteCompletion,
  savePreferences,
  exportBackupData,
  importBackupData,
  clearAllDatabaseData,
  resetToSampleData,
  loadFocusSessions,
  saveFocusSessions,
  loadIslandState,
  saveIslandState,
  isShowcaseModeActive,
  activateShowcaseData,
  restoreOriginalData,
} from './services/database';
import { evaluateDueReminders } from './services/notifications';
import {
  isHabitCompletedOnDate,
  parseHabitImportCSV,
  generateFullExportCSV,
} from './utils/habitLogic';
import { getTodayDateString } from './utils/dateUtils';
import { ACCENT_PALETTES, hexWithAlpha } from './utils/themes';
import { setHapticsEnabled, triggerHaptic } from './utils/haptics';
import { BottomNavigation } from './components/BottomNavigation';
import { HabitForm } from './components/HabitForm';
import { AppTourModal } from './components/AppTourModal';
import { TodayScreen } from './screens/Today';
import { HabitsScreen } from './screens/Habits';
import { FocusScreen } from './screens/Focus';
import { IslandScreen } from './screens/Island';
import { StatisticsScreen } from './screens/Statistics';
import { HabitDetailsScreen } from './screens/HabitDetails';
import { SettingsScreen } from './screens/Settings';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [islandState, setIslandState] =
    useState<IslandState>(DEFAULT_ISLAND_STATE);
  const [isShowcaseMode, setIsShowcaseMode] = useState<boolean>(() =>
    isShowcaseModeActive()
  );
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ScreenTab>('today');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showAppTour, setShowAppTour] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
      return localStorage.getItem('streak_onboarding_completed_v1') !== 'true';
    } catch {
      return false;
    }
  });

  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Load initial IndexedDB + Focus + Island data
  useEffect(() => {
    let mounted = true;
    const todayStr = getTodayDateString();
    setFocusSessions(loadFocusSessions(todayStr));
    setIslandState(loadIslandState());

    seedDatabaseIfEmpty()
      .then((data) => {
        if (!mounted) return;
        setHabits(data.habits);
        setCompletions(data.completions);
        setPreferences(data.preferences);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to system dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Listen to beforeinstallprompt for PWA installability
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Periodic local reminder check
  useEffect(() => {
    if (loading || !preferences.notificationsEnabled) return;
    evaluateDueReminders(habits, completions, preferences.notificationsEnabled);
    const timer = window.setInterval(() => {
      evaluateDueReminders(
        habits,
        completions,
        preferences.notificationsEnabled
      );
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loading, habits, completions, preferences.notificationsEnabled]);

  const isDark =
    preferences.themeMode === 'dark' ||
    (preferences.themeMode === 'system' && systemDark);

  const palette =
    ACCENT_PALETTES[preferences.accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const bgMode =
    preferences.appBackground || (preferences.trueBlackDark ? 'oled' : 'solid');
  const rootBg =
    isDark && (bgMode === 'oled' || preferences.trueBlackDark)
      ? '#000000'
      : surface.background;

  // Apply theme variables to document root
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--accent-hex', surface.accent);
    root.style.setProperty('--streak-bg', rootBg);
    root.style.setProperty('--streak-card', surface.card);
    root.style.setProperty('--streak-elevated', surface.high);
    root.style.setProperty('--streak-border', surface.outline);
    root.style.setProperty('--streak-muted', surface.muted);
  }, [isDark, surface, rootBg]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, selectedHabitId, showSettings]);

  // Sync haptic preference and attach global button click tactile listener
  useEffect(() => {
    setHapticsEnabled(preferences.soundFeedback !== false);
  }, [preferences.soundFeedback]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, [role="switch"]');
      if (interactive && !(interactive as HTMLButtonElement).disabled) {
        triggerHaptic('selection');
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleToggleHabit = useCallback(
    async (habit: Habit, dateStr: string) => {
      const existing = completions.find(
        (c) => c.habitId === habit.id && c.date === dateStr
      );
      const currentlyDone = isHabitCompletedOnDate(habit, existing);

      if (currentlyDone && existing) {
        triggerHaptic('light');
        await deleteCompletion(existing.id);
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        triggerHaptic('success');
        const targetValue =
          habit.type === 'amount'
            ? habit.target ?? habit.dailyTarget ?? 1
            : 1;
        const record: HabitCompletion = {
          id: existing?.id || `${habit.id}_${dateStr}`,
          habitId: habit.id,
          date: dateStr,
          value: targetValue,
          completed: true,
          updatedAt: Date.now(),
        };
        await upsertCompletion(record);
        setCompletions((prev) => {
          const filtered = prev.filter((c) => c.id !== record.id);
          return [...filtered, record];
        });
      }
    },
    [completions]
  );

  const handleIncrementAmount = useCallback(
    async (habit: Habit, dateStr: string, delta: number) => {
      const existing = completions.find(
        (c) => c.habitId === habit.id && c.date === dateStr
      );
      const currentVal = existing?.value ?? 0;
      const nextVal = Math.max(0, currentVal + delta);
      const target = habit.target ?? habit.dailyTarget ?? 1;

      if (nextVal >= target && currentVal < target) {
        triggerHaptic('success');
      } else {
        triggerHaptic(delta > 0 ? 'medium' : 'light');
      }

      if (nextVal === 0 && existing) {
        await deleteCompletion(existing.id);
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
        return;
      }

      if (nextVal > 0) {
        const record: HabitCompletion = {
          id: existing?.id || `${habit.id}_${dateStr}`,
          habitId: habit.id,
          date: dateStr,
          value: nextVal,
          completed: nextVal >= target,
          updatedAt: Date.now(),
        };
        await upsertCompletion(record);
        setCompletions((prev) => {
          const filtered = prev.filter((c) => c.id !== record.id);
          return [...filtered, record];
        });
      }
    },
    [completions]
  );

  const handleSaveHabitForm = async (
    habitData: Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived'>
  ) => {
    triggerHaptic('success');
    if (editingHabit) {
      const updated: Habit = {
        ...editingHabit,
        ...habitData,
      };
      await saveHabit(updated);
      setHabits((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h))
      );
    } else {
      const maxOrder = habits.reduce((max, h) => Math.max(max, h.order), -1);
      const created: Habit = {
        ...habitData,
        id: `habit-${Date.now()}`,
        createdAt: new Date().toISOString(),
        order: maxOrder + 1,
        archived: false,
      };
      await saveHabit(created);
      setHabits((prev) => [...prev, created]);
    }
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  const handleToggleArchiveHabit = async (habit: Habit) => {
    triggerHaptic('medium');
    const updated: Habit = { ...habit, archived: !habit.archived };
    await saveHabit(updated);
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  const handleDeleteHabit = async (habitId: string) => {
    triggerHaptic('warning');
    await deleteHabit(habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setCompletions((prev) => prev.filter((c) => c.habitId !== habitId));
    if (selectedHabitId === habitId) {
      setSelectedHabitId(null);
    }
  };

  const handleReorderHabit = async (
    habitId: string,
    direction: 'up' | 'down'
  ) => {
    triggerHaptic('medium');
    const active = habits
      .filter((h) => !h.archived)
      .sort((a, b) => a.order - b.order);
    const index = active.findIndex((h) => h.id === habitId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= active.length) return;

    const current = { ...active[index], order: active[swapIndex].order };
    const neighbor = { ...active[swapIndex], order: active[index].order };

    await Promise.all([saveHabit(current), saveHabit(neighbor)]);
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === current.id) return current;
        if (h.id === neighbor.id) return neighbor;
        return h;
      })
    );
  };

  const handleUpdatePreferences = async (next: Partial<UserPreferences>) => {
    const merged: UserPreferences = { ...preferences, ...next };
    setPreferences(merged);
    await savePreferences(merged);
  };

  const handleSaveFocusSession = (sessionData: Omit<FocusSession, 'id'>) => {
    const created: FocusSession = {
      ...sessionData,
      id: `focus-${Date.now()}`,
    };
    const next = [created, ...focusSessions];
    setFocusSessions(next);
    saveFocusSessions(next);
  };

  const handleDeleteFocusSession = (id: string) => {
    const next = focusSessions.filter((s) => s.id !== id);
    setFocusSessions(next);
    saveFocusSessions(next);
  };

  const handleUpdateIslandState = (next: IslandState) => {
    setIslandState(next);
    saveIslandState(next);
  };

  const handleExportBackup = async () => {
    const payload = await exportBackupData();
    payload.focusSessions = focusSessions;
    payload.islandState = islandState;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    triggerHaptic('success');
    const todayStr = getTodayDateString();
    const csvContent = generateFullExportCSV(
      habits,
      completions,
      focusSessions,
      todayStr
    );
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-full-export-${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as BackupPayload;
    if (!parsed || !Array.isArray(parsed.habits)) {
      throw new Error('Invalid backup structure');
    }
    await importBackupData(parsed);
    setHabits(parsed.habits);
    setCompletions(parsed.completions || []);
    if (parsed.preferences) {
      setPreferences(parsed.preferences);
    }
    if (parsed.focusSessions) {
      setFocusSessions(parsed.focusSessions);
      saveFocusSessions(parsed.focusSessions);
    }
    if (parsed.islandState) {
      setIslandState(parsed.islandState);
      saveIslandState(parsed.islandState);
    }
  };

  const handleImportCSV = async (
    csvText: string
  ): Promise<{
    source: string;
    habitsCount: number;
    entriesCount: number;
    sessionsCount?: number;
  }> => {
    const todayStr = getTodayDateString();
    const outcome = parseHabitImportCSV(csvText, todayStr);
    const maxOrder = habits.reduce((max, h) => Math.max(max, h.order), -1);

    const orderedNewHabits = outcome.habits.map((h, i) => ({
      ...h,
      order: maxOrder + 1 + i,
    }));

    for (const h of orderedNewHabits) {
      await saveHabit(h);
    }
    for (const c of outcome.completions) {
      await upsertCompletion(c);
    }

    setHabits((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      for (const h of orderedNewHabits) {
        map.set(h.id, h);
      }
      return Array.from(map.values());
    });

    setCompletions((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      for (const c of outcome.completions) {
        map.set(c.id, c);
      }
      return Array.from(map.values());
    });

    if (outcome.focusSessions && outcome.focusSessions.length > 0) {
      setFocusSessions((prev) => {
        const merged = [...outcome.focusSessions, ...prev];
        saveFocusSessions(merged);
        return merged;
      });
    }

    triggerHaptic('success');

    return {
      source: outcome.source,
      habitsCount: orderedNewHabits.length,
      entriesCount: outcome.entriesCount,
      sessionsCount: outcome.focusSessions?.length || 0,
    };
  };

  const handleClearAllData = async () => {
    await clearAllDatabaseData();
    setHabits([]);
    setCompletions([]);
    setFocusSessions([]);
    setIslandState(DEFAULT_ISLAND_STATE);
    setIsShowcaseMode(false);
    setSelectedHabitId(null);
  };

  const handleResetSampleData = async () => {
    const seeded = await resetToSampleData();
    setHabits(seeded.habits);
    setCompletions(seeded.completions);
    setPreferences(seeded.preferences);
    setIsShowcaseMode(false);
  };

  const handleToggleShowcaseData = async () => {
    triggerHaptic('success');
    if (isShowcaseMode) {
      const restored = await restoreOriginalData();
      setHabits(restored.habits);
      setCompletions(restored.completions);
      setPreferences(restored.preferences);
      setFocusSessions(restored.focusSessions);
      setIslandState(restored.islandState);
      setIsShowcaseMode(false);
      setSelectedHabitId(null);
    } else {
      const showcase = await activateShowcaseData({
        habits,
        completions,
        preferences,
        focusSessions,
        islandState,
      });
      setHabits(showcase.habits);
      setCompletions(showcase.completions);
      setPreferences(showcase.preferences);
      setFocusSessions(showcase.focusSessions);
      setIslandState(showcase.islandState);
      setIsShowcaseMode(true);
      setSelectedHabitId(null);
    }
  };

  const handleTriggerInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const selectedHabit =
    habits.find((h) => h.id === selectedHabitId) || null;

  return (
    <div
      data-bg-style={bgMode}
      className="relative min-h-screen transition-colors duration-200 overflow-x-hidden"
      style={{
        backgroundColor: rootBg,
        color: surface.text,
      }}
    >
      {/* 5 App Background Styles Layer (`lib/app/app_background.dart`: Solid, Gradient, Dots, OLED, Photo) */}
      {bgMode === 'gradient' && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 80% 10%, ${hexWithAlpha(
              surface.accent,
              isDark ? 0.22 : 0.14
            )} 0%, transparent 55%), radial-gradient(circle at 15% 85%, ${hexWithAlpha(
              surface.accent,
              isDark ? 0.14 : 0.08
            )} 0%, transparent 50%)`,
          }}
        />
      )}

      {bgMode === 'dots' && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `radial-gradient(${hexWithAlpha(
              surface.text,
              isDark ? 0.12 : 0.14
            )} 1.25px, transparent 1.25px)`,
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {bgMode === 'photo' && preferences.bgImage && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <img
            src={preferences.bgImage}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.85) 100%)'
                : 'linear-gradient(180deg, rgba(250,250,252,0.65) 0%, rgba(250,250,252,0.88) 100%)',
            }}
          />
        </div>
      )}

      {/* Top App Bar */}
      <header
        className="sticky top-0 z-20 backdrop-blur-xl pt-safe"
        style={{
          backgroundColor: hexWithAlpha(rootBg, 0.88),
          borderBottom: `1px solid ${surface.outline}`,
        }}
      >
        <div className="max-w-md md:max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedHabitId(null);
              setShowSettings(false);
              setActiveTab('today');
            }}
            className="flex items-center gap-2 text-left"
          >
            <img
              src="/pwa-512x512.png?v=4"
              alt="Cadence App Icon"
              className="w-6 h-6 rounded-[7px] shadow-xs object-cover"
            />
            <span
              className="text-sm font-extrabold tracking-tight"
              style={{ color: surface.text }}
            >
              Cadence
            </span>
          </button>

          {/* Desktop Navigation Pills */}
          <div className="hidden md:flex items-center gap-1">
            {(
              [
                { id: 'today', label: 'Today', icon: CalendarCheck2 },
                { id: 'habits', label: 'Habits', icon: Layers },
                { id: 'focus', label: 'Focus', icon: Timer },
                { id: 'island', label: 'Island', icon: Compass },
                { id: 'statistics', label: 'Statistics', icon: BarChart3 },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isCurrent =
                !showSettings && !selectedHabitId && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedHabitId(null);
                    setShowSettings(false);
                    setActiveTab(item.id);
                  }}
                  style={{
                    backgroundColor: isCurrent
                      ? hexWithAlpha(surface.accent, 0.16)
                      : 'transparent',
                    color: isCurrent ? surface.accent : surface.muted,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleTriggerInstallPwa}
                style={{ backgroundColor: surface.accent }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
              >
                <Download className="w-3 h-3" />
                <span>Install</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedHabitId(null);
                setShowSettings((prev) => !prev);
              }}
              aria-label="Open settings"
              style={{
                backgroundColor: showSettings
                  ? hexWithAlpha(surface.accent, 0.18)
                  : surface.card,
                color: showSettings ? surface.accent : surface.muted,
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-md md:max-w-2xl mx-auto px-4 pt-3">
        {loading ? (
          <div
            className="py-20 text-center text-xs"
            style={{ color: surface.muted }}
          >
            Loading your habits...
          </div>
        ) : showSettings ? (
          <SettingsScreen
            preferences={preferences}
            isDark={isDark}
            onUpdatePreferences={handleUpdatePreferences}
            onExportBackup={handleExportBackup}
            onExportCSV={handleExportCSV}
            onImportBackup={handleImportBackup}
            onImportCSV={handleImportCSV}
            onClearAllData={handleClearAllData}
            onResetSampleData={handleResetSampleData}
            isShowcaseMode={isShowcaseMode}
            onToggleShowcaseData={handleToggleShowcaseData}
            onClose={() => setShowSettings(false)}
            onReplayTour={() => {
              setShowSettings(false);
              setShowAppTour(true);
            }}
            canInstallPwa={Boolean(deferredPrompt)}
            onTriggerInstallPwa={handleTriggerInstallPwa}
          />
        ) : selectedHabit ? (
          <HabitDetailsScreen
            habit={selectedHabit}
            completions={completions}
            accentColor={preferences.accentColor}
            isDark={isDark}
            weekStartsOn={preferences.weekStartsOn}
            onBack={() => setSelectedHabitId(null)}
            onEdit={(habit) => {
              setEditingHabit(habit);
              setShowHabitForm(true);
            }}
            onToggleDate={handleToggleHabit}
            onIncrementAmount={handleIncrementAmount}
          />
        ) : activeTab === 'today' ? (
          <TodayScreen
            habits={habits}
            completions={completions}
            userName={preferences.userName ?? ''}
            accentColor={preferences.accentColor}
            interfaceStyle={preferences.interfaceStyle}
            todayCardLayout={preferences.todayCardLayout}
            showDailyQuote={preferences.showDailyQuote}
            customQuotes={preferences.customQuotes}
            isDark={isDark}
            weekStartsOn={preferences.weekStartsOn}
            onToggleHabit={handleToggleHabit}
            onIncrementAmount={handleIncrementAmount}
            onSelectHabit={(habit) => setSelectedHabitId(habit.id)}
            onOpenNewHabit={() => {
              setEditingHabit(null);
              setShowHabitForm(true);
            }}
            onReorderHabit={handleReorderHabit}
            onToggleInterfaceStyle={(style: InterfaceStyle) =>
              handleUpdatePreferences({ interfaceStyle: style })
            }
            onToggleCardLayout={(layout: TodayCardLayout) =>
              handleUpdatePreferences({ todayCardLayout: layout })
            }
          />
        ) : activeTab === 'habits' ? (
          <HabitsScreen
            habits={habits}
            completions={completions}
            accentColor={preferences.accentColor}
            isDark={isDark}
            onSelectHabit={(habit) => setSelectedHabitId(habit.id)}
            onOpenNewHabit={() => {
              setEditingHabit(null);
              setShowHabitForm(true);
            }}
            onEditHabit={(habit) => {
              setEditingHabit(habit);
              setShowHabitForm(true);
            }}
            onToggleArchiveHabit={handleToggleArchiveHabit}
            onDeleteHabit={handleDeleteHabit}
            onReorderHabit={handleReorderHabit}
          />
        ) : activeTab === 'focus' ? (
          <FocusScreen
            habits={habits}
            sessions={focusSessions}
            accentColor={preferences.accentColor}
            isDark={isDark}
            dailyGoalMinutes={preferences.dailyFocusGoalMinutes || 60}
            onSaveSession={handleSaveFocusSession}
            onDeleteSession={handleDeleteFocusSession}
            onUpdateDailyGoal={(minutes) =>
              handleUpdatePreferences({ dailyFocusGoalMinutes: minutes })
            }
          />
        ) : activeTab === 'island' ? (
          <IslandScreen
            habits={habits}
            completions={completions}
            focusSessions={focusSessions}
            islandState={islandState}
            accentColor={preferences.accentColor}
            isDark={isDark}
            onUpdateIslandState={handleUpdateIslandState}
          />
        ) : (
          <StatisticsScreen
            habits={habits}
            completions={completions}
            accentColor={preferences.accentColor}
            isDark={isDark}
            weekStartsOn={preferences.weekStartsOn}
            onSelectHabit={(habit) => setSelectedHabitId(habit.id)}
          />
        )}
      </main>

      {/* Bottom Navigation Bar (iPhone Mobile Navigation) */}
      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setSelectedHabitId(null);
          setShowSettings(false);
          setActiveTab(tab);
        }}
        accentColor={preferences.accentColor}
        isDark={isDark}
      />

      {/* Habit Create / Edit Modal */}
      {showHabitForm && (
        <HabitForm
          initialHabit={editingHabit}
          accentColor={preferences.accentColor}
          isDark={isDark}
          onSave={handleSaveHabitForm}
          onClose={() => {
            setShowHabitForm(false);
            setEditingHabit(null);
          }}
        />
      )}

      {/* First-Time Interactive App Tour Modal */}
      {!loading && showAppTour && (
        <AppTourModal
          preferences={preferences}
          isDark={isDark}
          onUpdatePreferences={handleUpdatePreferences}
          onComplete={(openCreateHabit) => {
            try {
              localStorage.setItem('streak_onboarding_completed_v1', 'true');
            } catch {
              // ignore storage errors
            }
            setShowAppTour(false);
            if (openCreateHabit) {
              setEditingHabit(null);
              setShowHabitForm(true);
            }
          }}
        />
      )}
    </div>
  );
}
