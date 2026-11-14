import React from 'react';
import {
  CalendarCheck2,
  Layers,
  Timer,
  Compass,
  BarChart3,
} from 'lucide-react';
import { ScreenTab, AccentColorId } from '../types/habit';
import { ACCENT_PALETTES, hexWithAlpha } from '../utils/themes';

interface BottomNavigationProps {
  activeTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  accentColor: AccentColorId;
  isDark?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
  accentColor,
  isDark = true,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const navItems: {
    id: ScreenTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'today', label: 'Today', icon: CalendarCheck2 },
    { id: 'habits', label: 'Habits', icon: Layers },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'island', label: 'Island', icon: Compass },
    { id: 'statistics', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav
      aria-label="Primary bottom navigation"
      className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl pb-safe md:hidden"
      style={{
        backgroundColor: hexWithAlpha(surface.card, 0.94),
        borderTop: `1px solid ${surface.outline}`,
      }}
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 transition-colors"
              style={{ color: isActive ? surface.accent : surface.muted }}
            >
              <div
                className="px-3.5 py-1 rounded-full transition-colors flex items-center justify-center"
                style={{
                  backgroundColor: isActive
                    ? hexWithAlpha(surface.accent, 0.18)
                    : 'transparent',
                }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
