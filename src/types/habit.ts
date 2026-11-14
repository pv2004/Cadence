export type HabitType = 'normal' | 'avoid' | 'amount';

export type ScheduleType =
  | 'everyday'
  | 'weekdays'
  | 'times_per_week'
  | 'times_per_month'
  | 'every_n_days';

export interface HabitSchedule {
  type: ScheduleType;
  weekdays?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  timesPerWeek?: number; // 1 - 7
  timesPerMonth?: number; // 1 - 31
  everyNDays?: number; // e.g., 2 = every 2 days
  intervalDays?: number; // alias for everyNDays
  anchorDate?: string;
}

export interface HabitReminder {
  id: string;
  enabled: boolean;
  time: string; // HH:mm in 24h format, e.g. "08:00"
  days: number[]; // 0..6
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  type: HabitType;
  category?: string; // e.g. "Fitness", "Health", "Learning"
  schedule: HabitSchedule;
  target?: number; // required for 'amount', default 1 for others
  dailyTarget?: number; // alias for target
  unit?: string; // e.g. "glasses", "pages", "mins"
  color?: string; // per-habit hex color from Streak's AppPalette.habitColors
  coverImage?: string; // optional cover photo preset ID or data URL
  reminders: HabitReminder[];
  order: number;
  archived: boolean;
  isSample?: boolean;
  createdAt: string; // YYYY-MM-DD
}

export interface HabitCompletion {
  id: string; // `${habitId}_${date}`
  habitId: string;
  date: string; // YYYY-MM-DD
  value: number; // for normal: 1 = completed, 0 = not; for avoid: 1 = clean/avoided, -1 = relapsed; for amount: numeric value
  completed: boolean;
  updatedAt: number;
  isSample?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type InterfaceStyle = 'minimal' | 'classic' | 'express';
export type AppBackgroundStyle = 'solid' | 'gradient' | 'dots' | 'oled' | 'photo';
export type TodayCardLayout = 'list' | 'grid';
export type HeatmapViewMode = 'week' | 'month' | 'year';

export type AccentColorId =
  | 'streak_brand'
  | 'catppuccin'
  | 'tokyo_night'
  | 'nord'
  | 'gruvbox'
  | 'rose_pine'
  | 'emerald'
  | 'amber';

export interface UserPreferences {
  id: 'default';
  userName?: string;
  themeMode: ThemeMode;
  interfaceStyle: InterfaceStyle;
  appBackground?: AppBackgroundStyle;
  bgImage?: string;
  todayCardLayout?: TodayCardLayout;
  showDailyQuote?: boolean;
  customQuotes?: string[];
  accentColor: AccentColorId;
  trueBlackDark: boolean;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  notificationsEnabled: boolean;
  soundFeedback: boolean;
  dailyFocusGoalMinutes?: number;
  hasSeenSampleBanner: boolean;
}

export type MainTab = 'today' | 'habits' | 'focus' | 'island' | 'statistics';
export type ScreenTab = MainTab;

export type FocusClockStyle = 'circle' | 'flip' | 'dots';
export type FocusAmbientSound = 'off' | 'rain' | 'brown_noise' | 'fire';

export interface FocusSession {
  id: string;
  habitId?: string;
  label: string;
  minutes: number;
  mode: 'pomodoro' | 'free';
  date: string; // YYYY-MM-DD
  completedAt: number;
}

export interface IslandState {
  name: string;
  unlockedIds: string[];
  rotation: 0 | 1 | 2 | 3;
  lighting: 'day' | 'sunset' | 'night';
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  app?: string;
  habits: Habit[];
  completions: HabitCompletion[];
  preferences?: UserPreferences;
  focusSessions?: FocusSession[];
  islandState?: IslandState;
}
