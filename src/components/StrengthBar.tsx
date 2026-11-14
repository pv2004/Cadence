import React from 'react';
import { motion } from 'motion/react';
import { hexWithAlpha } from '../utils/themes';

interface StrengthBarProps {
  /** Strength ratio 0.0 .. 1.0 or percentage 0 .. 100 */
  value: number;
  color: string;
  trackColor: string;
  height?: number;
  showLabel?: boolean;
  textColor?: string;
  mutedColor?: string;
}

/**
 * Blend a hex color towards white by a factor (0..1), matching Flutter's `Color.lerp(color, Colors.white, 0.28)`
 */
function lightenHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const nr = Math.min(255, Math.round(r + (255 - r) * factor));
  const ng = Math.min(255, Math.round(g + (255 - g) * factor));
  const nb = Math.min(255, Math.round(b + (255 - b) * factor));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

export const StrengthBar: React.FC<StrengthBarProps> = ({
  value,
  color,
  trackColor,
  height = 6,
  showLabel = false,
  textColor,
  mutedColor,
}) => {
  const normalized = value > 1 ? Math.min(1, Math.max(0, value / 100)) : Math.min(1, Math.max(0, value));
  const pct = Math.round(normalized * 100);
  const leadingColor = lightenHex(color, 0.28);

  const tier =
    pct >= 90
      ? 'Unbreakable'
      : pct >= 75
      ? 'Strong'
      : pct >= 50
      ? 'Steady'
      : pct >= 20
      ? 'Building'
      : 'Starting';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
          <span style={{ color: mutedColor }}>
            Habit Strength · <span style={{ color }}>{tier}</span>
          </span>
          <span className="font-mono-tabular" style={{ color: textColor || color }}>
            {pct}%
          </span>
        </div>
      )}
      <div
        className="w-full rounded-[4px] overflow-hidden relative"
        style={{ height: `${height}px`, backgroundColor: trackColor }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-[4px]"
          style={{
            background: `linear-gradient(90deg, ${leadingColor} 0%, ${color} 100%)`,
            boxShadow:
              normalized > 0.02
                ? `0 1px 5px ${hexWithAlpha(color, 0.4)}`
                : 'none',
          }}
        />
      </div>
    </div>
  );
};
