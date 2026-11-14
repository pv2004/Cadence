import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { hexWithAlpha } from '../utils/themes';

interface CelebrationBurstProps {
  active: boolean;
  color: string;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'circle';
}

const PARTICLES = [
  { angle: 0, distance: 20, size: 4 },
  { angle: 45, distance: 23, size: 3.5 },
  { angle: 90, distance: 19, size: 4 },
  { angle: 135, distance: 22, size: 3.5 },
  { angle: 180, distance: 20, size: 4 },
  { angle: 225, distance: 23, size: 3.5 },
  { angle: 270, distance: 19, size: 4 },
  { angle: 315, distance: 22, size: 3.5 },
];

/**
 * Minimal, restrained celebratory burst (expanding halo ring + 8 micro-sparks)
 * using Framer Motion (`motion/react`), tuned for Streak's calm dark/light aesthetic.
 */
export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({
  active,
  color,
  size = 'md',
  shape = 'rounded',
}) => {
  const distanceScale = size === 'sm' ? 0.72 : 1;
  const radiusClass =
    shape === 'circle'
      ? 'rounded-full'
      : size === 'sm'
      ? 'rounded-[9px]'
      : 'rounded-[14px]';

  return (
    <AnimatePresence>
      {active && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-10 ${radiusClass}`}
        >
          {/* Subtle expanding halo ring */}
          <motion.span
            initial={{ scale: 0.8, opacity: 0.75 }}
            animate={{ scale: size === 'sm' ? 1.48 : 1.55, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 ${radiusClass}`}
            style={{
              border: `1.5px solid ${color}`,
              boxShadow: `0 0 10px ${hexWithAlpha(color, 0.35)}`,
            }}
          />

          {/* 8 Minimal radial micro-dots */}
          {PARTICLES.map((p, idx) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance * distanceScale;
            const ty = Math.sin(rad) * p.distance * distanceScale;
            const dotSize = size === 'sm' ? p.size * 0.85 : p.size;

            return (
              <motion.span
                key={idx}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                animate={{
                  x: tx,
                  y: ty,
                  scale: [0.4, 1.1, 0],
                  opacity: [1, 0.9, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: idx % 2 === 0 ? color : '#FFFFFF',
                  boxShadow: `0 0 6px ${hexWithAlpha(color, 0.6)}`,
                }}
                className="absolute rounded-full"
              />
            );
          })}
        </span>
      )}
    </AnimatePresence>
  );
};
