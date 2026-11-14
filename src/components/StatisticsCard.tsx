import React from 'react';
import { hexWithAlpha } from '../utils/themes';

interface StatisticsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  cardBg?: string;
  textColor?: string;
  mutedColor?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  iconColor = '#7C3AED',
  cardBg = '#1A1A1A',
  textColor = '#F5F5F7',
  mutedColor = '#8E8E93',
}) => {
  return (
    <div
      className="rounded-[24px] p-4 flex flex-col justify-between transition-colors"
      style={{ backgroundColor: cardBg }}
    >
      {icon && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
          style={{
            backgroundColor: hexWithAlpha(iconColor, 0.16),
            color: iconColor,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <div
          className="text-2xl font-extrabold tracking-tight tabular-nums leading-tight"
          style={{ color: textColor }}
        >
          {value}
        </div>
        <div
          className="text-[12px] font-medium mt-0.5"
          style={{ color: mutedColor }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="text-[11px] mt-1 font-medium"
            style={{ color: mutedColor }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};
