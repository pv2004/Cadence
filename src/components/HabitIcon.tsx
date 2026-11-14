import React from 'react';
import {
  BookOpen,
  Droplets,
  Dumbbell,
  Code,
  Brain,
  ShieldAlert,
  Moon,
  Sun,
  Footprints,
  Heart,
  Apple,
  Coffee,
  PenTool,
  Music,
  Flame,
  Leaf,
  Ban,
  Bike,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Droplets,
  Dumbbell,
  Code,
  Brain,
  ShieldAlert,
  Moon,
  Sun,
  Footprints,
  Heart,
  Apple,
  Coffee,
  PenTool,
  Music,
  Flame,
  Leaf,
  Ban,
  Bike,
  CheckCircle2,
  Sparkles,
};

interface HabitIconProps {
  name: string;
  className?: string;
}

export const HabitIcon: React.FC<HabitIconProps> = ({ name, className = 'w-5 h-5' }) => {
  const IconComp = ICON_MAP[name];
  if (IconComp) {
    return <IconComp className={className} />;
  }
  // Support direct emoji if user entered an emoji character
  return (
    <span className="inline-flex items-center justify-center text-base leading-none select-none">
      {name || '✦'}
    </span>
  );
};
