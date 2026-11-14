import React, { useState } from 'react';
import {
  Sparkles,
  CalendarCheck2,
  BarChart3,
  Timer,
  Compass,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Flame,
  Layers,
} from 'lucide-react';
import {
  UserPreferences,
  AccentColorId,
  InterfaceStyle,
} from '../types/habit';
import { ACCENT_PALETTES, hexWithAlpha } from '../utils/themes';

interface AppTourModalProps {
  preferences: UserPreferences;
  isDark: boolean;
  onUpdatePreferences: (next: Partial<UserPreferences>) => void;
  onComplete: (openCreateHabit?: boolean) => void;
}

const TOUR_STEPS = [
  {
    id: 'welcome',
    badge: 'Step 1 of 5 · Personalize',
    title: 'Welcome to Streak',
    subtitle:
      'Build lasting daily rituals with Habit Strength momentum, 52-week heatmaps, focus sessions, and a living Voxel Island.',
  },
  {
    id: 'today',
    badge: 'Step 2 of 5 · Daily Rituals',
    title: 'Today & Habit Momentum',
    subtitle:
      'Track three flexible habit types and build resilient 0–100% Habit Strength where a single busy day never wipes out your progress.',
  },
  {
    id: 'analytics',
    badge: 'Step 3 of 5 · Heatmaps & Trends',
    title: '52-Week Grids & Trend Charts',
    subtitle:
      'Visualize every single day of the year with GitHub-inspired contribution grids, interactive trend lines, and weekly performance coaching.',
  },
  {
    id: 'focus-island',
    badge: 'Step 4 of 5 · Focus & Island',
    title: 'Deep Focus & Voxel Island',
    subtitle:
      'Pair habits with Pomodoro or Stopwatch sessions and ambient audio. Every check-in and focus minute earns coins to build your island.',
  },
  {
    id: 'ready',
    badge: 'Step 5 of 5 · Clean Slate',
    title: 'Fresh Start: 0 Habits, 0 Data',
    subtitle:
      'Your tracker starts completely clean with zero pre-filled habits or logs. Everything stays 100% private on your device.',
  },
] as const;

export const AppTourModal: React.FC<AppTourModalProps> = ({
  preferences,
  isDark,
  onUpdatePreferences,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [nameDraft, setNameDraft] = useState(() => {
    const raw = (preferences.userName || '').trim();
    if (!raw || raw.toLowerCase() === 'vineeth') return '';
    try {
      if (localStorage.getItem('streak_onboarding_completed_v1') !== 'true') {
        return '';
      }
    } catch {
      return '';
    }
    return raw;
  });

  const palette =
    ACCENT_PALETTES[preferences.accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const currentStep = TOUR_STEPS[stepIndex];

  const syncNameIfChanged = () => {
    const trimmed = nameDraft.trim();
    if (trimmed !== (preferences.userName || '')) {
      onUpdatePreferences({ userName: trimmed });
    }
  };

  const handleNext = () => {
    syncNameIfChanged();
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onComplete(false);
    }
  };

  const handleBack = () => {
    syncNameIfChanged();
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const handleSkip = () => {
    syncNameIfChanged();
    onComplete(false);
  };

  const handleCreateFirstHabit = () => {
    syncNameIfChanged();
    onComplete(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Streak App Tour"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div
        className="w-full max-w-md rounded-[28px] p-5 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: surface.card,
          borderColor: surface.outline,
          color: surface.text,
        }}
      >
        {/* Top Bar: Step Indicator & Skip Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, idx) => {
              const isCurrent = idx === stepIndex;
              const isPassed = idx < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to tour step ${idx + 1}`}
                  onClick={() => {
                    syncNameIfChanged();
                    setStepIndex(idx);
                  }}
                  style={{
                    backgroundColor:
                      isCurrent || isPassed ? surface.accent : surface.high,
                    width: isCurrent ? '22px' : '8px',
                  }}
                  className="h-2 rounded-full transition-all"
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-bold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
            style={{
              backgroundColor: surface.high,
              color: surface.muted,
            }}
          >
            Skip Tour
          </button>
        </div>

        {/* Header Badge & Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
            style={{
              backgroundColor: hexWithAlpha(surface.accent, 0.16),
              color: surface.accent,
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span>{currentStep.badge}</span>
          </div>

          <h2
            className="text-xl font-extrabold tracking-tight"
            style={{ color: surface.text }}
          >
            {currentStep.title}
          </h2>
          <p
            className="text-xs leading-relaxed"
            style={{ color: surface.muted }}
          >
            {currentStep.subtitle}
          </p>
        </div>

        {/* Step Body */}
        {stepIndex === 0 && (
          <div className="space-y-3.5 pt-1">
            {/* App Icon + Greeting Preview */}
            <div
              className="rounded-2xl p-3.5 flex items-center gap-3 border"
              style={{
                backgroundColor: surface.high,
                borderColor: surface.outline,
              }}
            >
              <img
                src="/apple-touch-icon.png?v=2"
                alt="Streak Icon"
                className="w-12 h-12 rounded-[14px] shadow-md shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: surface.muted }}
                >
                  Today Screen Greeting
                </div>
                <div
                  className="text-sm font-extrabold truncate mt-0.5"
                  style={{ color: surface.text }}
                >
                  {nameDraft.trim() ? `Hi, ${nameDraft.trim()}` : 'Today'}
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label
                htmlFor="tour-user-name"
                className="block text-xs font-bold mb-1.5"
                style={{ color: surface.text }}
              >
                What should we call you? (Optional)
              </label>
              <input
                id="tour-user-name"
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Enter your first name..."
                style={{
                  backgroundColor: surface.high,
                  borderColor: surface.outline,
                  color: surface.text,
                }}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold border focus:outline-none"
              />
            </div>

            {/* Accent Color Swatches */}
            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: surface.text }}
              >
                Choose Your Accent Palette
              </label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {(Object.keys(ACCENT_PALETTES) as AccentColorId[]).map(
                  (colorKey) => {
                    const p = ACCENT_PALETTES[colorKey];
                    const selected = preferences.accentColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() =>
                          onUpdatePreferences({ accentColor: colorKey })
                        }
                        aria-label={`Select ${p.label} theme`}
                        style={{
                          backgroundColor: p.hex,
                          outline: selected
                            ? `2px solid ${surface.text}`
                            : 'none',
                          outlineOffset: '2px',
                        }}
                        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-transform active:scale-95"
                      >
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* UI Design Mode */}
            <div>
              <label
                className="block text-xs font-bold mb-1.5"
                style={{ color: surface.text }}
              >
                Card Layout Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'minimal', label: 'Minimal', desc: '5-day strip' },
                    { id: 'classic', label: 'Classic', desc: '7-day + bar' },
                    { id: 'express', label: 'Express', desc: 'Cover cards' },
                  ] as { id: InterfaceStyle; label: string; desc: string }[]
                ).map((mode) => {
                  const active = preferences.interfaceStyle === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        onUpdatePreferences({ interfaceStyle: mode.id })
                      }
                      style={{
                        backgroundColor: active
                          ? hexWithAlpha(surface.accent, 0.16)
                          : surface.high,
                        borderColor: active ? surface.accent : 'transparent',
                      }}
                      className="p-2.5 rounded-xl border text-left transition-all"
                    >
                      <div
                        className="text-xs font-extrabold"
                        style={{
                          color: active ? surface.accent : surface.text,
                        }}
                      >
                        {mode.label}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: surface.muted }}
                      >
                        {mode.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="space-y-2.5 pt-1">
            {[
              {
                icon: CalendarCheck2,
                color: '#7C3AED',
                title: '3 Flexible Habit Modes',
                desc: 'Create standard check-in habits, quantitative targets (e.g. 8 glasses, 20 pages), or quit/avoid habits (e.g. No sugar).',
              },
              {
                icon: Flame,
                color: '#FF9500',
                title: '0–100% Habit Strength Score',
                desc: 'Each check-in boosts your momentum score. Missing a single day gently decays your score instead of resetting you to zero.',
              },
              {
                icon: Layers,
                color: '#30D158',
                title: 'Week, Month & Year Views',
                desc: 'Switch between daily 5d/7d check-in strips, monthly calendar grids, or full-year consistency heatmaps right from Today.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl p-3 flex items-start gap-3 border"
                  style={{
                    backgroundColor: surface.high,
                    borderColor: surface.outline,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: hexWithAlpha(item.color, 0.18),
                      color: item.color,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-extrabold"
                      style={{ color: surface.text }}
                    >
                      {item.title}
                    </div>
                    <p
                      className="text-[11px] leading-relaxed mt-0.5"
                      style={{ color: surface.muted }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stepIndex === 2 && (
          <div className="space-y-2.5 pt-1">
            {[
              {
                icon: Layers,
                color: '#5856D6',
                title: '52-Week Contribution Grids (Habits Tab)',
                desc: 'Inspect year-round consistency for every habit at a glance, filter by category, or tap any habit to edit historical dates.',
              },
              {
                icon: BarChart3,
                color: '#5AC8FA',
                title: 'Dynamic Recharts Trend Lines (Stats Tab)',
                desc: 'Compare specific habits across 7D, 30D, or 90D windows with Rolling Rate %, Cumulative check-ins, or Daily Values.',
              },
              {
                icon: Sparkles,
                color: '#30D158',
                title: 'Weekly Performance Summary',
                desc: 'Get an encouraging, actionable weekly summary analyzing your strongest habits and focus areas at the top of Statistics.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl p-3 flex items-start gap-3 border"
                  style={{
                    backgroundColor: surface.high,
                    borderColor: surface.outline,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: hexWithAlpha(item.color, 0.18),
                      color: item.color,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-extrabold"
                      style={{ color: surface.text }}
                    >
                      {item.title}
                    </div>
                    <p
                      className="text-[11px] leading-relaxed mt-0.5"
                      style={{ color: surface.muted }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stepIndex === 3 && (
          <div className="space-y-2.5 pt-1">
            {[
              {
                icon: Timer,
                color: '#FF9500',
                title: 'Focus Timer & Ambient Soundscapes',
                desc: 'Run Pomodoro (15m / 25m / 45m / 60m / Custom) or Free Stopwatch sessions linked to any habit with synthesized Rain, Forest, or Café audio.',
              },
              {
                icon: Compass,
                color: '#4ECDC4',
                title: 'Build Your Isometric Voxel Island',
                desc: 'Earn +15 coins per habit check-in and +2 coins per focus minute to unlock 12 coastal Mediterranean landmarks across Day, Sunset, and Night.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl p-3.5 flex items-start gap-3 border"
                  style={{
                    backgroundColor: surface.high,
                    borderColor: surface.outline,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: hexWithAlpha(item.color, 0.18),
                      color: item.color,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-xs font-extrabold"
                      style={{ color: surface.text }}
                    >
                      {item.title}
                    </div>
                    <p
                      className="text-[11px] leading-relaxed mt-0.5"
                      style={{ color: surface.muted }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stepIndex === 4 && (
          <div className="space-y-3 pt-1">
            <div
              className="rounded-2xl p-3.5 border space-y-2"
              style={{
                backgroundColor: surface.high,
                borderColor: surface.outline,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-extrabold flex items-center gap-1.5"
                  style={{ color: surface.text }}
                >
                  <ShieldCheck
                    className="w-4 h-4"
                    style={{ color: surface.accent }}
                  />
                  <span>Clean Zero-Data Start</span>
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                  style={{
                    backgroundColor: hexWithAlpha(surface.accent, 0.16),
                    color: surface.accent,
                  }}
                >
                  0 Habits · 0 Logs
                </span>
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: surface.muted }}
              >
                You are starting with a completely clean slate. Create your
                first habit now, or explore the empty app first.
              </p>
              <p
                className="text-[10px] leading-relaxed pt-1 border-t"
                style={{
                  color: surface.muted,
                  borderColor: surface.outline,
                }}
              >
                Tip: Want to preview how 300+ days of streaks look? You can
                toggle <strong>App Showcase Mode</strong> or export/import CSV
                backups anytime in <strong>Settings</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateFirstHabit}
              style={{
                backgroundColor: surface.accent,
                color: '#FFFFFF',
              }}
              className="w-full py-3 px-4 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-95"
            >
              <Plus className="w-4 h-4" strokeWidth={2.75} />
              <span>Create My First Habit</span>
            </button>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                backgroundColor: surface.high,
                color: surface.text,
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            style={{
              backgroundColor:
                stepIndex === TOUR_STEPS.length - 1
                  ? surface.high
                  : surface.accent,
              color:
                stepIndex === TOUR_STEPS.length - 1 ? surface.text : '#FFFFFF',
              border:
                stepIndex === TOUR_STEPS.length - 1
                  ? `1px solid ${surface.outline}`
                  : 'none',
            }}
            className="px-5 py-2.5 rounded-2xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-opacity hover:opacity-95"
          >
            <span>
              {stepIndex === TOUR_STEPS.length - 1
                ? 'Start Exploring'
                : 'Next'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
