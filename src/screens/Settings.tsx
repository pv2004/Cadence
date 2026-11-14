import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Bell,
  Download,
  Upload,
  Trash2,
  Smartphone,
  Check,
  Vibrate,
  FileSpreadsheet,
  Sparkles,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  User,
} from 'lucide-react';
import {
  UserPreferences,
  AccentColorId,
  ThemeMode,
  InterfaceStyle,
  AppBackgroundStyle,
  TodayCardLayout,
} from '../types/habit';
import {
  ACCENT_PALETTES,
  HABIT_COVER_PRESETS,
  hexWithAlpha,
} from '../utils/themes';
import { setHapticsEnabled, triggerHaptic } from '../utils/haptics';
import {
  requestNotificationPermission,
  getNotificationPermissionState,
} from '../services/notifications';

interface SettingsScreenProps {
  preferences: UserPreferences;
  isDark: boolean;
  onUpdatePreferences: (next: Partial<UserPreferences>) => void;
  onExportBackup: () => void;
  onExportCSV?: () => void;
  onImportBackup: (file: File) => Promise<void>;
  onImportCSV: (csvText: string) => Promise<{
    source: string;
    habitsCount: number;
    entriesCount: number;
    sessionsCount?: number;
  }>;
  onClearAllData: () => Promise<void>;
  onResetSampleData: () => Promise<void>;
  isShowcaseMode?: boolean;
  onToggleShowcaseData?: () => Promise<void>;
  onClose: () => void;
  onReplayTour?: () => void;
  canInstallPwa: boolean;
  onTriggerInstallPwa: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  preferences,
  isDark,
  onUpdatePreferences,
  onExportBackup,
  onExportCSV,
  onImportBackup,
  onImportCSV,
  onClearAllData,
  onResetSampleData,
  isShowcaseMode = false,
  onToggleShowcaseData,
  onClose,
  onReplayTour,
  canInstallPwa,
  onTriggerInstallPwa,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const bgPhotoInputRef = useRef<HTMLInputElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [showDataHubChooser, setShowDataHubChooser] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [customQuoteDraft, setCustomQuoteDraft] = useState('');
  const [notifPerm, setNotifPerm] = useState<string>(
    getNotificationPermissionState()
  );

  const palette =
    ACCENT_PALETTES[preferences.accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const activeBgStyle: AppBackgroundStyle =
    preferences.appBackground || (preferences.trueBlackDark ? 'oled' : 'solid');

  const handleToggleGlobalNotifications = async () => {
    if (!preferences.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotifPerm(getNotificationPermissionState());
      onUpdatePreferences({ notificationsEnabled: granted });
      if (!granted) {
        setStatusMessage('Browser notifications permission was not granted.');
      }
    } else {
      onUpdatePreferences({ notificationsEnabled: false });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportBackup(file);
      setStatusMessage('Backup restored successfully from JSON.');
      setShowDataHubChooser(false);
    } catch {
      setStatusMessage(
        'Invalid backup JSON file. Please select a valid backup.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCsvFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const outcome = await onImportCSV(text);
      const timerPart =
        outcome.sessionsCount && outcome.sessionsCount > 0
          ? ` and ${outcome.sessionsCount} timer logs`
          : '';
      setStatusMessage(
        `Imported ${outcome.habitsCount} habits (${outcome.entriesCount} check-ins${timerPart}) from ${outcome.source}.`
      );
      setShowDataHubChooser(false);
    } catch (err) {
      setStatusMessage(
        err instanceof Error
          ? err.message
          : 'Could not parse CSV file. Ensure it has Date and Habit columns.'
      );
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleBgPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdatePreferences({
          appBackground: 'photo',
          bgImage: reader.result,
        });
        setStatusMessage('Custom background photo applied.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customQuoteDraft.trim();
    if (!trimmed) return;
    const nextQuotes = [trimmed, ...(preferences.customQuotes || [])];
    onUpdatePreferences({
      showDailyQuote: true,
      customQuotes: nextQuotes,
    });
    setCustomQuoteDraft('');
    setStatusMessage('Added custom daily quote.');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
          style={{ color: surface.muted }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1
          className="text-base font-extrabold tracking-tight"
          style={{ color: surface.text }}
        >
          Settings & Personalization
        </h1>
        <div className="w-12" />
      </div>

      {statusMessage && (
        <div
          className="rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between"
          style={{
            backgroundColor: surface.card,
            border: `1px solid ${surface.outline}`,
            color: surface.text,
          }}
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ color: surface.muted }}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile & Greeting Name */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: surface.accent }} />
            <h2
              className="text-xs font-extrabold"
              style={{ color: surface.text }}
            >
              Profile & Today Greeting
            </h2>
          </div>
          <span
            className="text-[11px] font-bold"
            style={{ color: surface.muted }}
          >
            Preview:{' '}
            <strong style={{ color: surface.text }}>
              {preferences.userName && preferences.userName.trim()
                ? `Hi, ${preferences.userName.trim()}`
                : 'Today'}
            </strong>
          </span>
        </div>
        <div>
          <label
            htmlFor="settings-user-name"
            className="block text-[11px] font-semibold mb-1.5"
            style={{ color: surface.muted }}
          >
            Your Name (displayed on Today screen)
          </label>
          <input
            id="settings-user-name"
            type="text"
            value={preferences.userName ?? ''}
            onChange={(e) => onUpdatePreferences({ userName: e.target.value })}
            placeholder="Enter your name (optional)"
            style={{
              backgroundColor: surface.high,
              borderColor: surface.outline,
              color: surface.text,
            }}
            className="w-full rounded-xl px-3.5 py-2 text-xs font-bold border focus:outline-none"
          />
        </div>
        {onReplayTour && (
          <button
            type="button"
            onClick={onReplayTour}
            style={{
              backgroundColor: surface.high,
              borderColor: surface.outline,
              color: surface.text,
            }}
            className="w-full py-2.5 px-3.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          >
            <Sparkles
              className="w-3.5 h-3.5"
              style={{ color: surface.accent }}
            />
            <span>Replay Interactive App Tour</span>
          </button>
        )}
      </div>

      {/* Appearance & UI Design Modes */}
      <div
        className="rounded-[24px] p-4 space-y-5"
        style={{ backgroundColor: surface.card }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: surface.muted }}
        >
          Appearance & Design System
        </h2>

        {/* 1. Three UI Design Modes: Classic, Minimal, Express (`app_style_picker.dart`) */}
        <div>
          <label
            className="block text-xs font-bold mb-2"
            style={{ color: surface.text }}
          >
            UI Design Mode (Classic · Minimal · Express)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {
                  id: 'minimal',
                  title: 'Minimal',
                  desc: 'Ultra-compact 5d rows',
                },
                {
                  id: 'classic',
                  title: 'Classic',
                  desc: 'Strength bar + 7d pills',
                },
                {
                  id: 'express',
                  title: 'Express',
                  desc: 'Hero cards + covers',
                },
              ] as { id: InterfaceStyle; title: string; desc: string }[]
            ).map((styleItem) => {
              const active = preferences.interfaceStyle === styleItem.id;
              return (
                <button
                  key={styleItem.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ interfaceStyle: styleItem.id })
                  }
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(surface.accent, 0.16)
                      : surface.high,
                    borderColor: active ? surface.accent : 'transparent',
                  }}
                  className="p-3 rounded-2xl border text-left transition-all"
                >
                  <div
                    className="text-xs font-extrabold"
                    style={{ color: active ? surface.accent : surface.text }}
                  >
                    {styleItem.title}
                  </div>
                  <div
                    className="text-[10px] mt-0.5 leading-tight"
                    style={{ color: surface.muted }}
                  >
                    {styleItem.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Five App Background Styles (`app_background.dart`) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-xs font-bold"
              style={{ color: surface.text }}
            >
              App Background Style (5 Modes)
            </label>
            <button
              type="button"
              onClick={() => bgPhotoInputRef.current?.click()}
              style={{ color: surface.accent }}
              className="text-[11px] font-bold inline-flex items-center gap-1"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={bgPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgPhotoUpload}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: 'solid', label: 'Solid' },
                { id: 'gradient', label: 'Gradient' },
                { id: 'dots', label: 'Dots' },
                { id: 'oled', label: 'OLED' },
                { id: 'photo', label: 'Photo' },
              ] as { id: AppBackgroundStyle; label: string }[]
            ).map((bg) => {
              const active = activeBgStyle === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      appBackground: bg.id,
                      trueBlackDark: bg.id === 'oled',
                      bgImage:
                        bg.id === 'photo' && !preferences.bgImage
                          ? HABIT_COVER_PRESETS[0].url
                          : preferences.bgImage,
                    })
                  }
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(surface.accent, 0.18)
                      : surface.high,
                    borderColor: active ? surface.accent : 'transparent',
                    color: active ? surface.accent : surface.muted,
                  }}
                  className="py-2 px-1 rounded-xl border text-[11px] font-extrabold text-center transition-all"
                >
                  {bg.label}
                </button>
              );
            })}
          </div>

          {/* Preset Backdrop Picker when Photo background is active */}
          {activeBgStyle === 'photo' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2.5">
              {HABIT_COVER_PRESETS.map((preset) => {
                const selected = preferences.bgImage === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({
                        appBackground: 'photo',
                        bgImage: preset.url,
                      })
                    }
                    style={{
                      borderColor: selected ? surface.accent : surface.outline,
                      backgroundColor: surface.high,
                      color: selected ? surface.accent : surface.text,
                    }}
                    className="px-3 py-1.5 rounded-xl border text-[11px] font-bold shrink-0"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Today Screen Card View: List vs 2-Column Grid */}
        <div>
          <label
            className="block text-xs font-bold mb-2"
            style={{ color: surface.text }}
          >
            Today Screen Card Layout
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'list',
                  label: 'Compact List',
                  desc: 'Full-width cards + 7d strip',
                },
                {
                  id: 'grid',
                  label: '2-Column Grid',
                  desc: 'Side-by-side compact tiles',
                },
              ] as { id: TodayCardLayout; label: string; desc: string }[]
            ).map((ly) => {
              const active = (preferences.todayCardLayout || 'list') === ly.id;
              return (
                <button
                  key={ly.id}
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ todayCardLayout: ly.id })
                  }
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(surface.accent, 0.16)
                      : surface.high,
                    borderColor: active ? surface.accent : 'transparent',
                  }}
                  className="p-2.5 rounded-2xl border text-left transition-all"
                >
                  <div
                    className="text-xs font-extrabold"
                    style={{ color: active ? surface.accent : surface.text }}
                  >
                    {ly.label}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: surface.muted }}
                  >
                    {ly.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Mode */}
        <div>
          <label
            className="block text-xs font-bold mb-2"
            style={{ color: surface.text }}
          >
            Theme Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ] as {
                id: ThemeMode;
                label: string;
                icon: React.ComponentType<{ className?: string }>;
              }[]
            ).map((item) => {
              const Icon = item.icon;
              const active = preferences.themeMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdatePreferences({ themeMode: item.id })}
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(surface.accent, 0.18)
                      : surface.high,
                    borderColor: active ? surface.accent : 'transparent',
                    color: active ? surface.accent : surface.muted,
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border text-xs font-bold transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Streak Color Themes */}
        <div className="pt-1">
          <label
            className="block text-xs font-bold mb-2.5"
            style={{ color: surface.text }}
          >
            Streak Color Palette
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(ACCENT_PALETTES) as AccentColorId[]).map(
              (colorKey) => {
                const p = ACCENT_PALETTES[colorKey];
                const pSurface = isDark ? p.dark : p.light;
                const selected = preferences.accentColor === colorKey;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() =>
                      onUpdatePreferences({ accentColor: colorKey })
                    }
                    style={{
                      backgroundColor: pSurface.background,
                      borderColor: selected ? p.hex : pSurface.outline,
                    }}
                    className="p-3 rounded-2xl border-2 flex items-center justify-between transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center shadow-xs"
                        style={{ backgroundColor: p.hex }}
                      >
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-extrabold truncate"
                          style={{ color: pSurface.text }}
                        >
                          {p.label}
                        </div>
                        <div
                          className="text-[10px] font-mono uppercase"
                          style={{ color: pSurface.muted }}
                        >
                          {p.hex}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Daily Quotes (`quotes_page.dart`) */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <h2
                className="text-xs font-extrabold"
                style={{ color: surface.text }}
              >
                Hourly Motivational Quotes
              </h2>
              <p className="text-[11px]" style={{ color: surface.muted }}>
                Rotates every hour via free quotes API + habit motivation pool
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle Daily Quotes"
            aria-checked={preferences.showDailyQuote !== false}
            onClick={() =>
              onUpdatePreferences({
                showDailyQuote: preferences.showDailyQuote === false,
              })
            }
            style={{
              backgroundColor:
                preferences.showDailyQuote !== false
                  ? surface.accent
                  : surface.high,
            }}
            className="w-11 h-6 rounded-full transition-colors p-0.5"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                preferences.showDailyQuote !== false
                  ? 'translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <form onSubmit={handleAddCustomQuote} className="flex gap-2">
          <input
            type="text"
            value={customQuoteDraft}
            onChange={(e) => setCustomQuoteDraft(e.target.value)}
            placeholder="Add your own motivating quote..."
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
            style={{
              backgroundColor: surface.high,
              border: `1px solid ${surface.outline}`,
              color: surface.text,
            }}
          />
          <button
            type="submit"
            style={{ backgroundColor: surface.accent }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Preferences & Reminders */}
      <div
        className="rounded-[24px] p-4 space-y-4"
        style={{ backgroundColor: surface.card }}
      >
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: surface.muted }}
        >
          Schedule & Reminders
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-xs font-bold"
              style={{ color: surface.text }}
            >
              Week Starts On
            </div>
            <div
              className="text-[11px]"
              style={{ color: surface.muted }}
            >
              Used for calendars and heatmaps
            </div>
          </div>
          <div
            className="flex rounded-xl p-0.5"
            style={{ backgroundColor: surface.high }}
          >
            <button
              type="button"
              onClick={() => onUpdatePreferences({ weekStartsOn: 1 })}
              style={{
                backgroundColor:
                  preferences.weekStartsOn === 1
                    ? surface.accent
                    : 'transparent',
                color:
                  preferences.weekStartsOn === 1 ? '#FFFFFF' : surface.muted,
              }}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            >
              Mon
            </button>
            <button
              type="button"
              onClick={() => onUpdatePreferences({ weekStartsOn: 0 })}
              style={{
                backgroundColor:
                  preferences.weekStartsOn === 0
                    ? surface.accent
                    : 'transparent',
                color:
                  preferences.weekStartsOn === 0 ? '#FFFFFF' : surface.muted,
              }}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            >
              Sun
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4" style={{ color: surface.muted }} />
            <div>
              <div
                className="text-xs font-bold"
                style={{ color: surface.text }}
              >
                Habit Reminders
              </div>
              <div
                className="text-[11px]"
                style={{ color: surface.muted }}
              >
                Permission: {notifPerm}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.notificationsEnabled}
            onClick={handleToggleGlobalNotifications}
            style={{
              backgroundColor: preferences.notificationsEnabled
                ? surface.accent
                : surface.high,
            }}
            className="w-11 h-6 rounded-full transition-colors p-0.5"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                preferences.notificationsEnabled
                  ? 'translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-4 h-4" style={{ color: surface.muted }} />
            <div>
              <div
                className="text-xs font-bold"
                style={{ color: surface.text }}
              >
                Haptic Feedback
              </div>
              <div
                className="text-[11px]"
                style={{ color: surface.muted }}
              >
                Vibrate on habit completions and button taps
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Haptic Feedback"
            aria-checked={preferences.soundFeedback !== false}
            onClick={() => {
              const nextEnabled = preferences.soundFeedback === false;
              setHapticsEnabled(nextEnabled);
              if (nextEnabled) {
                triggerHaptic('success');
              }
              onUpdatePreferences({ soundFeedback: nextEnabled });
            }}
            style={{
              backgroundColor:
                preferences.soundFeedback !== false
                  ? surface.accent
                  : surface.high,
            }}
            className="w-11 h-6 rounded-full transition-colors p-0.5"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                preferences.soundFeedback !== false
                  ? 'translate-x-5'
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* iPhone PWA Install Guide & Home Screen Icon Preview */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone
              className="w-4 h-4"
              style={{ color: surface.accent }}
            />
            <h2
              className="text-xs font-extrabold"
              style={{ color: surface.text }}
            >
              Install on iPhone Home Screen
            </h2>
          </div>
          {canInstallPwa && (
            <button
              type="button"
              onClick={onTriggerInstallPwa}
              style={{ backgroundColor: surface.accent }}
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
            >
              Install App
            </button>
          )}
        </div>

        <div className="flex items-center gap-3.5 pt-0.5">
          <div className="flex flex-col items-center shrink-0">
            <img
              src="/apple-touch-icon.png?v=2"
              alt="Streak iPhone Home Screen Icon"
              className="w-14 h-14 rounded-[14px] shadow-md object-cover border border-white/10"
            />
            <span
              className="text-[10px] font-semibold mt-1 tracking-tight"
              style={{ color: surface.text }}
            >
              Streak
            </span>
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: surface.muted }}
          >
            In iPhone Safari, tap the{' '}
            <strong style={{ color: surface.text }}>Share</strong> button in the
            bottom bar and choose{' '}
            <strong style={{ color: surface.text }}>Add to Home Screen</strong>.
            Your iPhone will add this custom{' '}
            <strong style={{ color: surface.text }}>Streak</strong> icon to your
            Home Screen.
          </p>
        </div>
      </div>

      {/* Data Backup & Restore (Unified Single Button for Import & Export) */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: surface.muted }}
            >
              Backup & Restore
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: surface.muted }}>
              Export or restore your habits, check-in logs, and timer history
            </p>
          </div>
        </div>

        {/* Single Unified Button to Open Import & Export Options */}
        <button
          type="button"
          onClick={() => setShowDataHubChooser((prev) => !prev)}
          style={{
            backgroundColor: surface.accent,
            color: '#FFFFFF',
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-extrabold transition-opacity hover:opacity-95 shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>
            {showDataHubChooser
              ? 'Close Import & Export Options'
              : 'Import & Export Data (CSV / JSON)'}
          </span>
        </button>

        {/* Expandable Chooser Panel for Both Import and Export */}
        {showDataHubChooser && (
          <div
            className="rounded-2xl p-3 space-y-2.5 border"
            style={{
              backgroundColor: surface.high,
              borderColor: surface.outline,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color: surface.text }}
              >
                Choose Import or Export Format
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: surface.muted }}
              >
                CSV & JSON
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {onExportCSV && (
                <button
                  type="button"
                  onClick={() => {
                    onExportCSV();
                    setStatusMessage(
                      'Exported full habits, check-in logs, and timer logs to CSV.'
                    );
                    setShowDataHubChooser(false);
                  }}
                  style={{
                    backgroundColor: hexWithAlpha(surface.accent, 0.16),
                    borderColor: surface.accent,
                    color: surface.text,
                  }}
                  className="p-3 rounded-xl border text-left transition-all hover:opacity-90 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-extrabold">
                    <Download
                      className="w-3.5 h-3.5"
                      style={{ color: surface.accent }}
                    />
                    <span>Export to CSV</span>
                  </div>
                  <p
                    className="text-[10px] leading-tight"
                    style={{ color: surface.muted }}
                  >
                    All habits, logs, timer history, months & dates
                  </p>
                </button>
              )}

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                style={{
                  backgroundColor: hexWithAlpha(surface.accent, 0.16),
                  borderColor: surface.accent,
                  color: surface.text,
                }}
                className="p-3 rounded-xl border text-left transition-all hover:opacity-90 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <Upload
                    className="w-3.5 h-3.5"
                    style={{ color: surface.accent }}
                  />
                  <span>Import from CSV</span>
                </div>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: surface.muted }}
                >
                  Restore Streak CSV, Loop, HabitKit, HabitBull
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportBackup();
                  setStatusMessage('Exported full JSON backup.');
                  setShowDataHubChooser(false);
                }}
                style={{
                  backgroundColor: surface.card,
                  borderColor: surface.outline,
                  color: surface.text,
                }}
                className="p-3 rounded-xl border text-left transition-all hover:opacity-90 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </div>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: surface.muted }}
                >
                  Full app state, settings & voxel island
                </p>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  backgroundColor: surface.card,
                  borderColor: surface.outline,
                  color: surface.text,
                }}
                className="p-3 rounded-xl border text-left transition-all hover:opacity-90 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                </div>
                <p
                  className="text-[10px] leading-tight"
                  style={{ color: surface.muted }}
                >
                  Restore from a Streak .json backup file
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                const sampleLoopCsv = [
                  'Date,Cold Shower,Journal 10m',
                  '2026-11-08,2,2',
                  '2026-11-09,2,2',
                  '2026-11-10,2,2',
                  '2026-11-11,2,2',
                  '2026-11-12,2,2',
                ].join('\n');
                const res = await onImportCSV(sampleLoopCsv);
                setStatusMessage(
                  `Imported ${res.habitsCount} habits (${res.entriesCount} check-ins) from ${res.source}.`
                );
                setShowDataHubChooser(false);
              }}
              style={{
                backgroundColor: surface.card,
                borderColor: surface.outline,
                color: surface.muted,
              }}
              className="w-full py-2 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Test Sample Loop CSV Import</span>
            </button>
          </div>
        )}

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={async () => {
              await onResetSampleData();
              setStatusMessage('Sample Streak habits restored.');
            }}
            className="text-xs font-bold underline"
            style={{ color: surface.muted }}
          >
            Load Demo Habits
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onClearAllData();
                  setConfirmClear(false);
                  setStatusMessage('All habit data cleared.');
                }}
                className="px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Erase
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-xs"
                style={{ color: surface.muted }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* App Showcase Duplicate Data Switcher (Placed at last in Settings) */}
      {onToggleShowcaseData && (
        <div
          className="rounded-[24px] p-4 space-y-3"
          style={{
            backgroundColor: surface.card,
            border: isShowcaseMode
              ? `1.5px solid ${surface.accent}`
              : `1px solid ${surface.outline}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles
                className="w-4 h-4"
                style={{ color: surface.accent }}
              />
              <h2
                className="text-xs font-extrabold"
                style={{ color: surface.text }}
              >
                App Showcase Mode
              </h2>
            </div>
            <span
              style={{
                backgroundColor: isShowcaseMode
                  ? hexWithAlpha(surface.accent, 0.2)
                  : surface.high,
                color: isShowcaseMode ? surface.accent : surface.muted,
              }}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
            >
              {isShowcaseMode ? 'Showcase Data Active' : 'Original Data'}
            </span>
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: surface.muted }}
          >
            {isShowcaseMode
              ? 'Showing duplicate showcase habits, 320-day heatmaps, 7-day focus charts, and 9 voxel island landmarks. Your original data is safely backed up.'
              : 'Preview rich duplicate showcase data across Today, Heatmaps, Focus Timer, Statistics, and Voxel Island without losing your personal data.'}
          </p>
          <button
            type="button"
            onClick={async () => {
              await onToggleShowcaseData();
              setStatusMessage(
                isShowcaseMode
                  ? 'Switched back to your original data.'
                  : 'Loaded duplicate showcase data for app demonstration.'
              );
            }}
            style={{
              backgroundColor: isShowcaseMode ? surface.high : surface.accent,
              color: isShowcaseMode ? surface.text : '#FFFFFF',
              border: isShowcaseMode ? `1px solid ${surface.outline}` : 'none',
            }}
            className="w-full py-2.5 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
          >
            {isShowcaseMode ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Switch Back to Original Data</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Show Duplicate Data for App Showcase</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
