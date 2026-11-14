import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Flame as FlameIcon,
  Timer,
  Target,
  Plus,
  Minus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Habit,
  FocusSession,
  AccentColorId,
  FocusClockStyle,
  FocusAmbientSound,
} from '../types/habit';
import {
  ACCENT_PALETTES,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';
import { getTodayDateString, getLastNDays, formatShortDate } from '../utils/dateUtils';
import { triggerHaptic } from '../utils/haptics';
import { CelebrationBurst } from '../components/CelebrationBurst';

interface FocusScreenProps {
  habits: Habit[];
  sessions: FocusSession[];
  accentColor: AccentColorId;
  isDark: boolean;
  dailyGoalMinutes: number;
  onSaveSession: (session: Omit<FocusSession, 'id'>) => void;
  onDeleteSession: (id: string) => void;
  onUpdateDailyGoal: (minutes: number) => void;
}

const DURATION_PRESETS = [15, 25, 45, 60];

export const FocusScreen: React.FC<FocusScreenProps> = ({
  habits,
  sessions,
  accentColor,
  isDark,
  dailyGoalMinutes = 60,
  onSaveSession,
  onDeleteSession,
  onUpdateDailyGoal,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;
  const todayStr = getTodayDateString();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order),
    [habits]
  );

  const [clockStyle, setClockStyle] = useState<FocusClockStyle>('circle');
  const [mode, setMode] = useState<'pomodoro' | 'free'>('pomodoro');
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    activeHabits[0]?.id || ''
  );
  const [targetMinutes, setTargetMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pomodoroRound, setPomodoroRound] = useState<number>(1);
  const [ambientSound, setAmbientSound] = useState<FocusAmbientSound>('off');
  const [celebrating, setCelebrating] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [manualMinutes, setManualMinutes] = useState<string>('25');
  const [showCustomDuration, setShowCustomDuration] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('30');
  const [customBreakInput, setCustomBreakInput] = useState<string>('5');

  const selectedHabit = activeHabits.find((h) => h.id === selectedHabitId);
  const activeColor = selectedHabit?.color || surface.accent;

  // Web Audio API Ambient Noise Generator (Rain, Brown Noise, Fire)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);

  const stopAmbientAudio = () => {
    try {
      if (sourceNodeRef.current && 'stop' in sourceNodeRef.current) {
        (sourceNodeRef.current as AudioBufferSourceNode).stop();
      }
      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = null;
    } catch {
      // ignore
    }
  };

  const startAmbientAudio = (sound: FocusAmbientSound) => {
    stopAmbientAudio();
    if (sound === 'off' || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (sound === 'brown_noise') {
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 0.18;
        } else if (sound === 'rain') {
          data[i] = white * 0.08;
        } else {
          // fire: warm low rumble + occasional soft crackle
          const crackle = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.45 : 0;
          lastOut = (lastOut + 0.03 * white) / 1.03;
          data[i] = lastOut * 0.15 + crackle;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value =
        sound === 'rain' ? 1400 : sound === 'fire' ? 600 : 480;

      const gain = ctx.createGain();
      gain.gain.value = 0.35;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      sourceNodeRef.current = noise;
    } catch {
      // ignore Web Audio autoplay restrictions
    }
  };

  useEffect(() => {
    if (isRunning && ambientSound !== 'off') {
      startAmbientAudio(ambientSound);
    } else {
      stopAmbientAudio();
    }
    return () => stopAmbientAudio();
  }, [isRunning, ambientSound]);

  // Countdown interval
  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          triggerHaptic('success');
          setCelebrating(true);
          window.setTimeout(() => setCelebrating(false), 900);

          if (phase === 'focus') {
            onSaveSession({
              habitId: selectedHabit?.id,
              label: selectedHabit?.name || 'Deep Focus',
              minutes: targetMinutes,
              mode,
              date: todayStr,
              completedAt: Date.now(),
            });
            if (mode === 'pomodoro') {
              setPhase('break');
              setPomodoroRound((r) => (r % 4) + 1);
              return breakMinutes * 60;
            }
          } else {
            setPhase('focus');
          }
          return targetMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    isRunning,
    phase,
    targetMinutes,
    breakMinutes,
    mode,
    selectedHabit,
    todayStr,
    onSaveSession,
  ]);

  const handleSelectDuration = (mins: number) => {
    const clamped = Math.max(1, Math.min(240, Math.round(mins)));
    setIsRunning(false);
    setPhase('focus');
    setTargetMinutes(clamped);
    setSecondsLeft(clamped * 60);
    setCustomMinutesInput(String(clamped));
  };

  const handleSelectBreakDuration = (mins: number) => {
    const clamped = Math.max(1, Math.min(60, Math.round(mins)));
    setBreakMinutes(clamped);
    setCustomBreakInput(String(clamped));
    if (phase === 'break' && !isRunning) {
      setSecondsLeft(clamped * 60);
    }
  };

  const handleReset = () => {
    triggerHaptic('light');
    setIsRunning(false);
    setSecondsLeft((phase === 'break' ? breakMinutes : targetMinutes) * 60);
  };

  const handleFinishNow = () => {
    triggerHaptic('success');
    setIsRunning(false);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 900);

    const elapsedMinutes = Math.max(
      1,
      Math.round((targetMinutes * 60 - secondsLeft) / 60) || targetMinutes
    );
    onSaveSession({
      habitId: selectedHabit?.id,
      label: selectedHabit?.name || 'Deep Focus',
      minutes: elapsedMinutes,
      mode,
      date: todayStr,
      completedAt: Date.now(),
    });
    setSecondsLeft(targetMinutes * 60);
  };

  const totalPhaseSeconds =
    (phase === 'break' ? breakMinutes : targetMinutes) * 60;
  const progress = Math.min(
    1,
    Math.max(0, 1 - secondsLeft / Math.max(1, totalPhaseSeconds))
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // Statistics for Focus
  const todayMinutes = useMemo(
    () =>
      sessions
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + s.minutes, 0),
    [sessions, todayStr]
  );

  const totalMinutesAllTime = useMemo(
    () => sessions.reduce((sum, s) => sum + s.minutes, 0),
    [sessions]
  );

  const last7DaysBars = useMemo(() => {
    const days = getLastNDays(7, todayStr);
    const dowNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days.map((dStr) => {
      const mins = sessions
        .filter((s) => s.date === dStr)
        .reduce((sum, s) => sum + s.minutes, 0);
      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        date: dStr,
        label: dowNames[dt.getDay()],
        minutes: mins,
      };
    });
  }, [sessions, todayStr]);

  const maxBarMinutes = Math.max(
    dailyGoalMinutes,
    ...last7DaysBars.map((b) => b.minutes),
    30
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] font-extrabold tracking-tight leading-none"
            style={{ color: surface.text }}
          >
            Focus
          </h1>
          <p
            className="text-[13px] font-medium mt-1.5 flex items-center gap-1.5"
            style={{ color: surface.muted }}
          >
            <Timer className="w-3.5 h-3.5" style={{ color: activeColor }} />
            <span>
              {mode === 'pomodoro'
                ? `Pomodoro · Round ${pomodoroRound} of 4`
                : 'Free stretch timer'}
            </span>
          </p>
        </div>

        {/* Clock Style Switcher: Circle | Flip | Dots */}
        <div
          className="flex items-center p-1 rounded-full"
          style={{
            backgroundColor: surface.card,
            border: `1px solid ${surface.outline}`,
          }}
        >
          {(['circle', 'flip', 'dots'] as FocusClockStyle[]).map((st) => {
            const active = clockStyle === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setClockStyle(st)}
                style={{
                  backgroundColor: active ? activeColor : 'transparent',
                  color: active ? '#FFFFFF' : surface.muted,
                }}
                className="px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all"
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Habit Linker Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setSelectedHabitId('')}
          style={{
            backgroundColor: !selectedHabitId ? surface.accent : surface.card,
            color: !selectedHabitId ? '#FFFFFF' : surface.muted,
          }}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Free Focus</span>
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
              className="px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <span style={{ color: isSelected ? '#FFFFFF' : hColor }}>
                {renderHabitIcon(h.icon, 'w-3.5 h-3.5')}
              </span>
              <span>{h.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Timer Card (`lib/features/focus/widgets/timer_clocks.dart`) */}
      <div
        className="relative rounded-[28px] p-6 flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundColor: surface.card,
          border: `1px solid ${surface.outline}`,
        }}
      >
        {/* Mode Pill Switcher: Pomodoro | Free */}
        <div className="flex items-center gap-2 mb-5">
          {(['pomodoro', 'free'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setPhase('focus');
                }}
                style={{
                  backgroundColor: active
                    ? hexWithAlpha(activeColor, 0.18)
                    : surface.high,
                  color: active ? activeColor : surface.muted,
                  borderColor: active ? activeColor : 'transparent',
                }}
                className="px-3.5 py-1 rounded-full border text-xs font-bold capitalize transition-all"
              >
                {m === 'pomodoro' ? 'Pomodoro' : 'Free Timer'}
              </button>
            );
          })}
        </div>

        {/* CLOCK RENDERER: Circle | Flip | Dots */}
        {clockStyle === 'circle' && (
          <div className="relative w-56 h-56 flex items-center justify-center my-2">
            <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
              <circle
                cx="110"
                cy="110"
                r="94"
                fill="none"
                stroke={surface.high}
                strokeWidth="12"
              />
              <circle
                cx="110"
                cy="110"
                r="94"
                fill="none"
                stroke={activeColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 94}
                strokeDashoffset={2 * Math.PI * 94 * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: activeColor }}
              >
                {phase === 'break' ? 'Short Break' : selectedHabit?.name || 'Focus'}
              </span>
              <div
                className="text-5xl font-extrabold font-mono-tabular tracking-tight"
                style={{ color: surface.text }}
              >
                {mm}:{ss}
              </div>
              <span
                className="text-[11px] font-medium mt-1.5"
                style={{ color: surface.muted }}
              >
                {Math.round(progress * 100)}% complete
              </span>
            </div>
          </div>
        )}

        {clockStyle === 'flip' && (
          <div className="my-6 flex items-center justify-center gap-3">
            {[
              { label: 'MIN', val: mm },
              { label: 'SEC', val: ss },
            ].map((unit) => (
              <div
                key={unit.label}
                className="relative w-32 h-36 rounded-[22px] flex flex-col items-center justify-center shadow-inner overflow-hidden"
                style={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                }}
              >
                {/* Horizontal split-flap seam */}
                <div
                  className="absolute inset-x-0 top-1/2 h-[2px] z-10"
                  style={{ backgroundColor: surface.card }}
                />
                <span
                  className="text-6xl font-extrabold font-mono-tabular tracking-tighter"
                  style={{ color: surface.text }}
                >
                  {unit.val}
                </span>
                <span
                  className="text-[10px] font-bold tracking-widest mt-1"
                  style={{ color: activeColor }}
                >
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {clockStyle === 'dots' && (
          <div className="my-4 w-full max-w-[260px] space-y-4 text-center">
            <div
              className="text-4xl font-extrabold font-mono-tabular tracking-tight"
              style={{ color: surface.text }}
            >
              {mm}:{ss}
            </div>
            {/* 60-Dot Matrix Clock */}
            <div className="grid grid-cols-10 gap-2 p-3 rounded-2xl" style={{ backgroundColor: surface.high }}>
              {Array.from({ length: 60 }).map((_, idx) => {
                const activeDots = Math.round(progress * 60);
                const lit = idx < activeDots || (idx === 0 && isRunning);
                return (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full mx-auto transition-colors duration-300"
                    style={{
                      backgroundColor: lit
                        ? activeColor
                        : hexWithAlpha(surface.muted, 0.22),
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Duration Presets + Custom Duration Picker */}
        <div className="w-full flex flex-col items-center mt-3 mb-5 space-y-2.5">
          <div className="flex items-center justify-center flex-wrap gap-2">
            {DURATION_PRESETS.map((mins) => {
              const active =
                targetMinutes === mins &&
                phase === 'focus' &&
                !showCustomDuration;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setShowCustomDuration(false);
                    handleSelectDuration(mins);
                  }}
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(activeColor, 0.2)
                      : surface.high,
                    color: active ? activeColor : surface.muted,
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono-tabular transition-colors"
                >
                  {mins}m
                </button>
              );
            })}

            {/* Custom Time Duration Toggle Button */}
            {(() => {
              const isCustomActive =
                showCustomDuration ||
                !DURATION_PRESETS.includes(targetMinutes) ||
                (mode === 'pomodoro' && breakMinutes !== 5);
              return (
                <button
                  type="button"
                  onClick={() => {
                    setCustomMinutesInput(String(targetMinutes));
                    setCustomBreakInput(String(breakMinutes));
                    setShowCustomDuration((prev) => !prev);
                  }}
                  style={{
                    backgroundColor: isCustomActive
                      ? hexWithAlpha(activeColor, 0.2)
                      : surface.high,
                    color: isCustomActive ? activeColor : surface.muted,
                    border: isCustomActive
                      ? `1px solid ${activeColor}`
                      : '1px solid transparent',
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>
                    {!DURATION_PRESETS.includes(targetMinutes)
                      ? `Custom (${targetMinutes}m)`
                      : 'Custom'}
                  </span>
                </button>
              );
            })()}
          </div>

          {/* Expandable Custom Time Duration Selector */}
          {showCustomDuration && (
            <div
              className="w-full max-w-xs rounded-2xl p-3 space-y-2.5"
              style={{
                backgroundColor: surface.high,
                border: `1px solid ${surface.outline}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="custom-focus-mins"
                  className="text-[11px] font-bold"
                  style={{ color: surface.text }}
                >
                  Focus Duration (min)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease focus duration by 5 minutes"
                    onClick={() =>
                      handleSelectDuration(Math.max(1, targetMinutes - 5))
                    }
                    style={{
                      backgroundColor: surface.card,
                      color: surface.text,
                    }}
                    className="px-2 h-7 rounded-lg text-[10px] font-bold font-mono-tabular"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    aria-label="Decrease focus duration by 1 minute"
                    onClick={() =>
                      handleSelectDuration(Math.max(1, targetMinutes - 1))
                    }
                    style={{
                      backgroundColor: surface.card,
                      color: surface.text,
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    id="custom-focus-mins"
                    type="number"
                    min={1}
                    max={240}
                    value={customMinutesInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCustomMinutesInput(raw);
                      const parsed = Number(raw);
                      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 240) {
                        setIsRunning(false);
                        setPhase('focus');
                        setTargetMinutes(Math.round(parsed));
                        setSecondsLeft(Math.round(parsed) * 60);
                      }
                    }}
                    style={{
                      backgroundColor: surface.card,
                      borderColor: activeColor,
                      color: surface.text,
                    }}
                    className="w-14 h-7 rounded-lg text-center text-xs font-extrabold font-mono-tabular border focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Increase focus duration by 1 minute"
                    onClick={() =>
                      handleSelectDuration(Math.min(240, targetMinutes + 1))
                    }
                    style={{
                      backgroundColor: surface.card,
                      color: surface.text,
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase focus duration by 5 minutes"
                    onClick={() =>
                      handleSelectDuration(Math.min(240, targetMinutes + 5))
                    }
                    style={{
                      backgroundColor: surface.card,
                      color: surface.text,
                    }}
                    className="px-2 h-7 rounded-lg text-[10px] font-bold font-mono-tabular"
                  >
                    +5
                  </button>
                </div>
              </div>

              {mode === 'pomodoro' && (
                <div
                  className="flex items-center justify-between gap-2 pt-2 border-t"
                  style={{ borderColor: surface.outline }}
                >
                  <label
                    htmlFor="custom-break-mins"
                    className="text-[11px] font-bold"
                    style={{ color: surface.muted }}
                  >
                    Break Duration (min)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease break duration by 1 minute"
                      onClick={() =>
                        handleSelectBreakDuration(Math.max(1, breakMinutes - 1))
                      }
                      style={{
                        backgroundColor: surface.card,
                        color: surface.text,
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      id="custom-break-mins"
                      type="number"
                      min={1}
                      max={60}
                      value={customBreakInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCustomBreakInput(raw);
                        const parsed = Number(raw);
                        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 60) {
                          handleSelectBreakDuration(parsed);
                        }
                      }}
                      style={{
                        backgroundColor: surface.card,
                        borderColor: surface.outline,
                        color: surface.text,
                      }}
                      className="w-14 h-7 rounded-lg text-center text-xs font-extrabold font-mono-tabular border focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Increase break duration by 1 minute"
                      onClick={() =>
                        handleSelectBreakDuration(Math.min(60, breakMinutes + 1))
                      }
                      style={{
                        backgroundColor: surface.card,
                        color: surface.text,
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transport Controls: Reset | Play/Pause | Complete Session */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset timer"
            style={{ backgroundColor: surface.high, color: surface.muted }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-90"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('medium');
              setIsRunning((r) => !r);
            }}
            aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
            style={{ backgroundColor: activeColor, color: '#FFFFFF' }}
            className="relative px-8 h-14 rounded-[20px] flex items-center gap-2.5 text-sm font-extrabold shadow-lg overflow-visible"
          >
            <CelebrationBurst
              active={celebrating}
              color={activeColor}
              size="md"
            />
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Focus</span>
              </>
            )}
          </motion.button>

          <button
            type="button"
            onClick={handleFinishNow}
            aria-label="Complete and log focus session"
            title="Finish & log session now"
            style={{
              backgroundColor: hexWithAlpha(surface.success, 0.16),
              color: surface.success,
            }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-90"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>

        {/* Ambient Sound Selector (`lib/features/focus/state/focus_audio.dart`) */}
        <div className="w-full pt-5 mt-5 border-t flex items-center justify-between gap-2" style={{ borderColor: surface.outline }}>
          <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: surface.muted }}>
            {ambientSound === 'off' ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" style={{ color: activeColor }} />
            )}
            <span>Ambient Sound</span>
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'off', label: 'Off', icon: VolumeX },
                { id: 'rain', label: 'Rain', icon: CloudRain },
                { id: 'brown_noise', label: 'Brown', icon: Waves },
                { id: 'fire', label: 'Fire', icon: FlameIcon },
              ] as {
                id: FocusAmbientSound;
                label: string;
                icon: React.ComponentType<{ className?: string }>;
              }[]
            ).map((snd) => {
              const Icon = snd.icon;
              const active = ambientSound === snd.id;
              return (
                <button
                  key={snd.id}
                  type="button"
                  onClick={() => setAmbientSound(snd.id)}
                  style={{
                    backgroundColor: active
                      ? hexWithAlpha(activeColor, 0.2)
                      : surface.high,
                    color: active ? activeColor : surface.muted,
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  <span>{snd.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Focus Goal Card */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: activeColor }} />
            <h2
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: surface.muted }}
            >
              Daily Focus Goal
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-extrabold font-mono-tabular"
              style={{ color: surface.text }}
            >
              {todayMinutes} / {dailyGoalMinutes}m
            </span>
            <button
              type="button"
              onClick={() => {
                const nextGoal =
                  dailyGoalMinutes === 30
                    ? 60
                    : dailyGoalMinutes === 60
                    ? 90
                    : dailyGoalMinutes === 90
                    ? 120
                    : 30;
                onUpdateDailyGoal(nextGoal);
              }}
              style={{
                backgroundColor: surface.high,
                color: surface.muted,
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
            >
              Change
            </button>
          </div>
        </div>

        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: surface.high }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                Math.round((todayMinutes / Math.max(1, dailyGoalMinutes)) * 100)
              )}%`,
              backgroundColor: activeColor,
            }}
          />
        </div>
      </div>

      {/* 7-Day Focus Session Chart (`focus_daily_bars.dart`) */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-extrabold uppercase tracking-wider"
            style={{ color: surface.muted }}
          >
            Focus Minutes (Last 7 Days)
          </h2>
          <span
            className="text-xs font-bold font-mono-tabular"
            style={{ color: activeColor }}
          >
            {totalMinutesAllTime}m total
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
          {last7DaysBars.map((bar) => {
            const ratio = Math.min(1, bar.minutes / maxBarMinutes);
            const heightPct = Math.max(8, Math.round(ratio * 100));
            return (
              <div
                key={bar.date}
                className="flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <span
                  className="text-[9px] font-mono-tabular font-bold"
                  style={{ color: bar.minutes > 0 ? surface.text : surface.muted }}
                >
                  {bar.minutes > 0 ? `${bar.minutes}m` : ''}
                </span>
                <div
                  className="w-full max-w-[24px] flex-1 rounded-full flex items-end overflow-hidden"
                  style={{ backgroundColor: surface.high }}
                >
                  <div
                    className="w-full rounded-full transition-all duration-500"
                    style={{
                      height: `${bar.minutes > 0 ? heightPct : 0}%`,
                      backgroundColor: activeColor,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: surface.muted }}
                >
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus Session History Log */}
      <div
        className="rounded-[24px] p-4 space-y-3"
        style={{ backgroundColor: surface.card }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-extrabold uppercase tracking-wider"
            style={{ color: surface.muted }}
          >
            Session History
          </h2>
          <button
            type="button"
            onClick={() => setShowLogModal((s) => !s)}
            style={{ color: activeColor }}
            className="text-xs font-bold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Session</span>
          </button>
        </div>

        {showLogModal && (
          <div
            className="p-3 rounded-2xl flex items-center justify-between gap-2"
            style={{ backgroundColor: surface.high }}
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={240}
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                aria-label="Manual focus minutes"
                className="w-16 px-2.5 py-1.5 rounded-xl text-xs font-bold text-center"
                style={{
                  backgroundColor: surface.card,
                  color: surface.text,
                  border: `1px solid ${surface.outline}`,
                }}
              />
              <span className="text-xs font-semibold" style={{ color: surface.muted }}>
                mins for {selectedHabit?.name || 'Free Focus'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const mins = Math.max(1, Number(manualMinutes) || 25);
                onSaveSession({
                  habitId: selectedHabit?.id,
                  label: selectedHabit?.name || 'Deep Focus',
                  minutes: mins,
                  mode,
                  date: todayStr,
                  completedAt: Date.now(),
                });
                setShowLogModal(false);
              }}
              style={{ backgroundColor: activeColor }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            >
              Add
            </button>
          </div>
        )}

        <div className="divide-y" style={{ borderColor: surface.outline }}>
          {sessions.slice(0, 8).map((sess) => (
            <div
              key={sess.id}
              className="py-2.5 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold" style={{ color: surface.text }}>
                  {sess.label}
                </div>
                <div className="text-[11px]" style={{ color: surface.muted }}>
                  {sess.date === todayStr ? 'Today' : formatShortDate(sess.date)} ·{' '}
                  <span className="capitalize">{sess.mode}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="font-extrabold font-mono-tabular"
                  style={{ color: activeColor }}
                >
                  +{sess.minutes}m
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteSession(sess.id)}
                  aria-label={`Delete session ${sess.label}`}
                  className="p-1 text-rose-400 hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
