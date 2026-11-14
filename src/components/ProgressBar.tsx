import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AccentColorId } from '../types/habit';
import { ACCENT_PALETTES } from '../utils/themes';
import { parseDateKey } from '../utils/habitLogic';
import { CelebrationBurst } from './CelebrationBurst';

interface ProgressBarProps {
  completed: number;
  total: number;
  dateStr: string;
  accentColor: AccentColorId;
  isDark: boolean;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Ported directly from InlitX/streak `lib/features/habits/widgets/today_progress.dart`
 * with subtle Framer Motion ring & milestone celebration when progress advances.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  completed,
  total,
  dateStr,
  accentColor,
  isDark,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const pct = Math.round(ratio * 100);

  const prevCompletedRef = useRef<number>(completed);
  const [ringBurst, setRingBurst] = useState(false);

  useEffect(() => {
    if (completed > prevCompletedRef.current) {
      setRingBurst(true);
      const timer = window.setTimeout(() => setRingBurst(false), 600);
      prevCompletedRef.current = completed;
      return () => window.clearTimeout(timer);
    }
    prevCompletedRef.current = completed;
  }, [completed]);

  const formattedDate = useMemo(() => {
    const dt = parseDateKey(dateStr);
    return `${WEEKDAYS[dt.getDay()]}, ${dt.getDate()} ${SHORT_MONTHS[dt.getMonth()]}`;
  }, [dateStr]);

  // Build scalloped wave SVG path matching Streak's _RingPainter._wave
  const wavePath = useMemo(() => {
    if (ratio <= 0) return '';
    const size = 64;
    const stroke = 6.5;
    const waves = 14;
    const amplitude = 1.35;
    const center = size / 2;
    const radius = (size - stroke) / 2 - amplitude;
    const sweep = 2 * Math.PI * Math.min(0.999, ratio);
    const steps = Math.max(16, Math.min(240, Math.ceil(sweep * 36)));

    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = -Math.PI / 2 + (sweep * i) / steps;
      const wave = radius + amplitude * Math.sin(angle * waves);
      const x = center + wave * Math.cos(angle);
      const y = center + wave * Math.sin(angle);
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return pts.join(' ');
  }, [ratio]);

  return (
    <div
      className="rounded-[24px] px-[18px] py-[14px] flex items-center justify-between gap-4 transition-colors"
      style={{
        backgroundColor: surface.card,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[13px] font-semibold"
          style={{ color: surface.muted }}
        >
          {formattedDate}
        </div>
        <motion.div
          key={`${completed}-${total}`}
          initial={{ y: 3, opacity: 0.7 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="text-[20px] font-extrabold tracking-tight mt-0.5"
          style={{ color: surface.text }}
        >
          {total === 0
            ? 'No habits scheduled'
            : completed === total
            ? 'All done today!'
            : `${completed} of ${total} completed`}
        </motion.div>
      </div>

      {/* 64x64 Wavy Scalloped Progress Ring */}
      <motion.div
        animate={ringBurst ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily habit completion progress"
      >
        <CelebrationBurst
          active={ringBurst}
          color={surface.accent}
          size="md"
          shape="circle"
        />
        <svg className="w-16 h-16 overflow-visible" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="24"
            fill="none"
            stroke={surface.highest}
            strokeWidth="6.5"
          />
          {ratio > 0 && (
            <path
              d={wavePath}
              fill="none"
              stroke={surface.accent}
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <motion.span
          key={pct}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="absolute text-[14px] font-extrabold font-mono-tabular"
          style={{ color: surface.text }}
        >
          {pct}%
        </motion.span>
      </motion.div>
    </div>
  );
};
