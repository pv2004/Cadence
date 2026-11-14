import React from 'react';
import { AccentColorId } from '../types/habit';
import { HabitIcon } from '../components/HabitIcon';

export interface ThemeSurfacePalette {
  background: string;
  card: string;
  high: string;
  highest: string;
  outline: string;
  text: string;
  muted: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface AccentPalette {
  id: AccentColorId;
  name: string;
  label: string;
  hex: string;
  rgb: string;
  dark: ThemeSurfacePalette;
  light: ThemeSurfacePalette;
  levelsDark: [string, string, string, string, string]; // 0..4
  levelsLight: [string, string, string, string, string]; // 0..4
}

/**
 * Exact palettes ported from InlitX/streak:
 * - lib/app/theme/app_palette.dart
 * - lib/app/theme/color_themes.dart
 */
export const ACCENT_PALETTES: Record<AccentColorId, AccentPalette> = {
  streak_brand: {
    id: 'streak_brand',
    name: 'Streak Default',
    label: 'Streak Default',
    hex: '#7C3AED',
    rgb: '124 58 237',
    dark: {
      background: '#0D0D0D',
      card: '#1A1A1A',
      high: '#232326',
      highest: '#2C2C2E',
      outline: '#2C2C2E',
      text: '#F2F2F7',
      muted: '#8E8E93',
      accent: '#7C3AED',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
    },
    light: {
      background: '#FAFAFC',
      card: '#FFFFFF',
      high: '#F4F4F8',
      highest: '#EDEDF2',
      outline: '#D9D9E0',
      text: '#1C1C1E',
      muted: '#8E8E93',
      accent: '#7C3AED',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
    },
    levelsDark: ['#232326', '#3B1D70', '#5B21B6', '#6D28D9', '#7C3AED'],
    levelsLight: ['#EDEDF2', '#DDD6FE', '#C4B5FD', '#A78BFA', '#7C3AED'],
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin',
    label: 'Catppuccin',
    hex: '#CBA6F7',
    rgb: '203 166 247',
    dark: {
      background: '#181825',
      card: '#1E1E2E',
      high: '#313244',
      highest: '#45475A',
      outline: '#45475A',
      text: '#CDD6F4',
      muted: '#A6ADC8',
      accent: '#CBA6F7',
      success: '#A6E3A1',
      warning: '#F9E2AF',
      danger: '#F38BA8',
      info: '#89B4FA',
    },
    light: {
      background: '#EFF1F5',
      card: '#FFFFFF',
      high: '#E6E9EF',
      highest: '#DCE0E8',
      outline: '#CCD0DA',
      text: '#4C4F69',
      muted: '#6C6F85',
      accent: '#8839EF',
      success: '#40A02B',
      warning: '#DF8E1D',
      danger: '#D20F39',
      info: '#1E66F5',
    },
    levelsDark: ['#313244', '#524570', '#7B66A8', '#A386CF', '#CBA6F7'],
    levelsLight: ['#E6E9EF', '#E2D4F9', '#C8A9F4', '#A879EF', '#8839EF'],
  },
  tokyo_night: {
    id: 'tokyo_night',
    name: 'Tokyo Night',
    label: 'Tokyo Night',
    hex: '#7AA2F7',
    rgb: '122 162 247',
    dark: {
      background: '#16161E',
      card: '#1A1B26',
      high: '#292E42',
      highest: '#3B4261',
      outline: '#3B4261',
      text: '#C0CAF5',
      muted: '#737AA2',
      accent: '#7AA2F7',
      success: '#9ECE6A',
      warning: '#E0AF68',
      danger: '#F7768E',
      info: '#7DCFFF',
    },
    light: {
      background: '#D0D5E3',
      card: '#E1E2E7',
      high: '#C4C8DA',
      highest: '#B7BCD3',
      outline: '#A8AECB',
      text: '#3760BF',
      muted: '#6172B0',
      accent: '#2E7DE9',
      success: '#587539',
      warning: '#8C6C3E',
      danger: '#F52A65',
      info: '#007197',
    },
    levelsDark: ['#292E42', '#2E406E', '#4661A3', '#6082CE', '#7AA2F7'],
    levelsLight: ['#C4C8DA', '#ACC4EF', '#82A9EB', '#5893EA', '#2E7DE9'],
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    label: 'Nord',
    hex: '#88C0D0',
    rgb: '136 192 208',
    dark: {
      background: '#242933',
      card: '#2E3440',
      high: '#3B4252',
      highest: '#4C566A',
      outline: '#4C566A',
      text: '#ECEFF4',
      muted: '#B4BCCB',
      accent: '#88C0D0',
      success: '#A3BE8C',
      warning: '#EBCB8B',
      danger: '#BF616A',
      info: '#81A1C1',
    },
    light: {
      background: '#D8DEE9',
      card: '#ECEFF4',
      high: '#E5E9F0',
      highest: '#C0C8D6',
      outline: '#B4BED0',
      text: '#2E3440',
      muted: '#4C566A',
      accent: '#4C6E9A',
      success: '#6A8A50',
      warning: '#D08770',
      danger: '#BF616A',
      info: '#5E81AC',
    },
    levelsDark: ['#3B4252', '#47606D', '#5D8090', '#72A0B0', '#88C0D0'],
    levelsLight: ['#E5E9F0', '#C3CFDF', '#9BB1CC', '#7390B3', '#4C6E9A'],
  },
  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox',
    label: 'Gruvbox',
    hex: '#FE8019',
    rgb: '254 128 25',
    dark: {
      background: '#1D2021',
      card: '#282828',
      high: '#3C3836',
      highest: '#504945',
      outline: '#504945',
      text: '#EBDBB2',
      muted: '#A89984',
      accent: '#FE8019',
      success: '#B8BB26',
      warning: '#FABD2F',
      danger: '#FB4934',
      info: '#83A598',
    },
    light: {
      background: '#F2E5BC',
      card: '#FBF1C7',
      high: '#EBDBB2',
      highest: '#D5C4A1',
      outline: '#D5C4A1',
      text: '#3C3836',
      muted: '#7C6F64',
      accent: '#AF3A03',
      success: '#79740E',
      warning: '#B57614',
      danger: '#9D0006',
      info: '#076678',
    },
    levelsDark: ['#3C3836', '#6D4220', '#9E571E', '#CE6B1B', '#FE8019'],
    levelsLight: ['#EBDBB2', '#DEC090', '#CE9460', '#BE6731', '#AF3A03'],
  },
  rose_pine: {
    id: 'rose_pine',
    name: 'Rosé Pine',
    label: 'Rosé Pine',
    hex: '#C4A7E7',
    rgb: '196 167 231',
    dark: {
      background: '#191724',
      card: '#1F1D2E',
      high: '#26233A',
      highest: '#403D52',
      outline: '#403D52',
      text: '#E0DEF4',
      muted: '#908CAA',
      accent: '#C4A7E7',
      success: '#9CCFD8',
      warning: '#F6C177',
      danger: '#EB6F92',
      info: '#EBBCBA',
    },
    light: {
      background: '#FAF4ED',
      card: '#FFFAF3',
      high: '#F2E9E1',
      highest: '#DFDAD9',
      outline: '#DFDAD9',
      text: '#575279',
      muted: '#797593',
      accent: '#907AA9',
      success: '#56949F',
      warning: '#EA9D34',
      danger: '#B4637A',
      info: '#286983',
    },
    levelsDark: ['#26233A', '#4D4465', '#756590', '#9D86BB', '#C4A7E7'],
    levelsLight: ['#F2E9E1', '#DCD2E5', '#C3B4D1', '#AA97BD', '#907AA9'],
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green',
    label: 'Emerald Green',
    hex: '#30D158',
    rgb: '48 209 88',
    dark: {
      background: '#0D0D0D',
      card: '#1A1A1A',
      high: '#232326',
      highest: '#2C2C2E',
      outline: '#2C2C2E',
      text: '#F2F2F7',
      muted: '#8E8E93',
      accent: '#30D158',
      success: '#30D158',
      warning: '#FFD60A',
      danger: '#FF3B30',
      info: '#0A84FF',
    },
    light: {
      background: '#FAFAFC',
      card: '#FFFFFF',
      high: '#F4F4F8',
      highest: '#EDEDF2',
      outline: '#D9D9E0',
      text: '#1C1C1E',
      muted: '#8E8E93',
      accent: '#28CD41',
      success: '#28CD41',
      warning: '#FF9500',
      danger: '#FF3B30',
      info: '#007AFF',
    },
    levelsDark: ['#232326', '#164B25', '#1F7836', '#27A447', '#30D158'],
    levelsLight: ['#EDEDF2', '#C8F4D2', '#93E8A8', '#5EDC7D', '#30D158'],
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    label: 'Warm Amber',
    hex: '#FF9500',
    rgb: '255 149 0',
    dark: {
      background: '#0D0D0D',
      card: '#1A1A1A',
      high: '#232326',
      highest: '#2C2C2E',
      outline: '#2C2C2E',
      text: '#F2F2F7',
      muted: '#8E8E93',
      accent: '#FF9500',
      success: '#30D158',
      warning: '#FF9500',
      danger: '#FF3B30',
      info: '#5AC8FA',
    },
    light: {
      background: '#FAFAFC',
      card: '#FFFFFF',
      high: '#F4F4F8',
      highest: '#EDEDF2',
      outline: '#D9D9E0',
      text: '#1C1C1E',
      muted: '#8E8E93',
      accent: '#FF9500',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
      info: '#007AFF',
    },
    levelsDark: ['#232326', '#5C3806', '#925604', '#C87602', '#FF9500'],
    levelsLight: ['#EDEDF2', '#FFE4BF', '#FFC980', '#FFAF40', '#FF9500'],
  },
};

/**
 * Exact habit colors from Streak's AppPalette.habitColors
 */
export const STREAK_HABIT_COLORS = [
  '#7C3AED', // Brand Violet (Read before bed)
  '#5856D6', // Indigo (Gym session)
  '#30D158', // Vibrant Green (No sugar)
  '#5AC8FA', // Sky Blue (Drink water)
  '#FF9500', // Orange (Morning run)
  '#4ECDC4', // Mint Teal (Meditate)
  '#BF5AF2', // Purple Rose (Study Spanish)
  '#FF375F', // Coral Rose
  '#FFD60A', // Gold
  '#0A84FF', // iOS Blue
] as const;

export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 124;
  const g = parseInt(clean.substring(2, 4), 16) || 58;
  const b = parseInt(clean.substring(4, 6), 16) || 237;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getColorLevels(
  hex: string,
  isDark: boolean,
  emptyCellColor: string
): [string, string, string, string, string] {
  return [
    emptyCellColor,
    hexWithAlpha(hex, isDark ? 0.28 : 0.25),
    hexWithAlpha(hex, isDark ? 0.52 : 0.5),
    hexWithAlpha(hex, isDark ? 0.76 : 0.75),
    hex,
  ];
}

export const HABIT_ICONS = [
  'Dumbbell',
  'Leaf',
  'BookOpen',
  'Droplets',
  'Footprints',
  'Brain',
  'Code',
  'Moon',
  'Sun',
  'Heart',
  'Apple',
  'Coffee',
  'PenTool',
  'Music',
  'Flame',
  'Ban',
  'Bike',
  'CheckCircle2',
  'Sparkles',
  'ShieldAlert',
] as const;

export const HABIT_ICON_OPTIONS: { id: string; label: string }[] = HABIT_ICONS.map(
  (icon) => ({
    id: icon,
    label: icon,
  })
);

export function renderHabitIcon(name: string, className = 'w-5 h-5'): React.ReactNode {
  return React.createElement(HabitIcon, { name, className });
}

export const MAX_SINGLE_LINE_QUOTE_LENGTH = 44;

/**
 * 24 Single-Line Habit & Discipline Motivational Quotes (all <= 44 chars so they never wrap)
 */
export const STREAK_DAILY_QUOTES: string[] = [
  'Done is better than perfect.',
  'Small daily steps build lasting momentum.',
  'Never miss twice. Show up for today.',
  'One tap today keeps your streak alive.',
  'Momentum makes hard habits effortless.',
  'Start small enough that you cannot fail.',
  'Action comes first—complete one habit now.',
  'Every check-in builds your future self.',
  'Master the day by mastering your habits.',
  'Consistency turns effort into rhythm.',
  'Show up today so tomorrow starts strong.',
  'Win the hour by completing one habit.',
  'Protect your streak with one small action.',
  'Discipline is choosing your future now.',
  'Progress lives in habits repeated daily.',
  'Two minutes of effort beats zero today.',
  'Keep the chain unbroken—check in today.',
  'Small habits compound into big victories.',
  'Your daily rituals shape your destiny.',
  'Finish today’s habits before you rest.',
  'Focus on today’s check-in, one by one.',
  'Excellence is a habit practiced daily.',
  'Build unstoppable momentum today.',
  'Show up now—your streak is waiting.',
];

export function isSingleLineQuote(quote: string): boolean {
  const clean = quote.trim();
  return (
    clean.length > 0 &&
    clean.length <= MAX_SINGLE_LINE_QUOTE_LENGTH &&
    !clean.includes('\n')
  );
}

export function getHourlyQuoteSlot(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 3600000);
}

export function selectHourlyMotivationalQuote(
  hourSlot: number,
  manualOffset: number = 0,
  customQuotes: string[] = []
): string {
  const singleLineCustom = customQuotes
    .map((q) => q.trim())
    .filter(isSingleLineQuote);
  const singleLineDefaults = STREAK_DAILY_QUOTES.filter(isSingleLineQuote);
  const pool =
    singleLineCustom.length > 0
      ? [...singleLineCustom, ...singleLineDefaults]
      : singleLineDefaults;
  const idx = Math.abs(hourSlot + manualOffset) % pool.length;
  return pool[idx];
}

const HOURLY_QUOTE_STORAGE_KEY = 'cadence_hourly_quote_cache_v3';

interface HourlyQuoteCache {
  hourSlot: number;
  quote: string;
}

export function getCachedHourlyQuote(hourSlot: number): string | null {
  try {
    const raw = localStorage.getItem(HOURLY_QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HourlyQuoteCache;
    if (
      parsed &&
      parsed.hourSlot === hourSlot &&
      parsed.quote &&
      isSingleLineQuote(parsed.quote)
    ) {
      return parsed.quote;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedHourlyQuote(hourSlot: number, quote: string): void {
  try {
    if (!isSingleLineQuote(quote)) return;
    const payload: HourlyQuoteCache = { hourSlot, quote };
    localStorage.setItem(HOURLY_QUOTE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

const MOTIVATIONAL_HABIT_KEYWORDS =
  /\b(habit|habits|discipline|consistency|consistent|daily|step|steps|goal|goals|action|progress|success|effort|start|begin|focus|today|tomorrow|future|achieve|excellence|persevere|momentum|routine|work|practice|win|done|perfect)\b/i;

/**
 * Searches free public quotes API for a motivational quote that fits strictly on 1 line
 * (<= MAX_SINGLE_LINE_QUOTE_LENGTH chars). If an API quote exceeds 1 line, it searches
 * further candidates and falls back to the single-line habit motivation pool.
 */
export async function fetchMotivationalQuoteFromApi(
  hourSlot: number,
  manualOffset: number = 0,
  customQuotes: string[] = []
): Promise<string> {
  const fallback = selectHourlyMotivationalQuote(
    hourSlot,
    manualOffset,
    customQuotes
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3200);

  try {
    const skip = Math.abs((hourSlot * 7 + manualOffset * 13) % 100);
    const res = await fetch(
      `https://dummyjson.com/quotes?limit=30&skip=${skip}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as {
        quotes?: { quote?: string; author?: string }[];
      };
      if (data && Array.isArray(data.quotes)) {
        // Search the batch for a quote that is strictly under 1 line and motivational
        const match = data.quotes.find(
          (item) =>
            typeof item.quote === 'string' &&
            isSingleLineQuote(item.quote) &&
            MOTIVATIONAL_HABIT_KEYWORDS.test(item.quote)
        );
        if (match && match.quote) {
          const clean = match.quote.trim();
          saveCachedHourlyQuote(hourSlot, clean);
          return clean;
        }
      }
    }
  } catch {
    clearTimeout(timeout);
  }

  saveCachedHourlyQuote(hourSlot, fallback);
  return fallback;
}


/**
 * Curated offline SVG atmospheric cover presets for Habit Cover Photos & App Photo Backdrop
 */
function makeSvgCoverDataUri(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

export const HABIT_COVER_PRESETS: { id: string; label: string; url: string }[] = [
  {
    id: 'aurora_violet',
    label: 'Aurora Violet',
    url: makeSvgCoverDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1E1038"/><stop offset="50%" stop-color="#3B1D70"/><stop offset="100%" stop-color="#0F172A"/></linearGradient></defs><rect width="600" height="240" fill="url(#g1)"/><circle cx="480" cy="40" r="140" fill="#7C3AED" opacity="0.32"/><circle cx="140" cy="210" r="120" fill="#38BDF8" opacity="0.22"/><path d="M0 170 Q 180 110 340 165 T 600 135 L 600 240 L 0 240 Z" fill="#09090D" opacity="0.55"/></svg>`
    ),
  },
  {
    id: 'midnight_peaks',
    label: 'Midnight Peaks',
    url: makeSvgCoverDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs><rect width="600" height="240" fill="url(#g2)"/><circle cx="460" cy="58" r="24" fill="#FDE68A" opacity="0.75"/><polygon points="0,240 130,95 270,240" fill="#1E293B"/><polygon points="160,240 320,70 490,240" fill="#334155" opacity="0.85"/><polygon points="350,240 490,105 600,240" fill="#0F172A" opacity="0.9"/></svg>`
    ),
  },
  {
    id: 'emerald_forest',
    label: 'Emerald Canopy',
    url: makeSvgCoverDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#052E16"/><stop offset="55%" stop-color="#064E3B"/><stop offset="100%" stop-color="#022C22"/></linearGradient></defs><rect width="600" height="240" fill="url(#g3)"/><circle cx="490" cy="60" r="110" fill="#10B981" opacity="0.25"/><path d="M0 185 Q 150 130 320 175 T 600 140 L 600 240 L 0 240 Z" fill="#022C22" opacity="0.7"/></svg>`
    ),
  },
  {
    id: 'sunset_dunes',
    label: 'Sunset Dunes',
    url: makeSvgCoverDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#431407"/><stop offset="50%" stop-color="#7C2D12"/><stop offset="100%" stop-color="#1C1917"/></linearGradient></defs><rect width="600" height="240" fill="url(#g4)"/><circle cx="420" cy="75" r="42" fill="#FB923C" opacity="0.45"/><path d="M0 165 Q 200 115 410 175 T 600 155 L 600 240 L 0 240 Z" fill="#291509" opacity="0.7"/></svg>`
    ),
  },
  {
    id: 'ocean_tide',
    label: 'Aegean Tide',
    url: makeSvgCoverDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240"><defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#082F49"/><stop offset="55%" stop-color="#0369A1"/><stop offset="100%" stop-color="#0F172A"/></linearGradient></defs><rect width="600" height="240" fill="url(#g5)"/><circle cx="150" cy="60" r="95" fill="#38BDF8" opacity="0.25"/><path d="M0 160 Q 150 195 300 160 T 600 165 L 600 240 L 0 240 Z" fill="#082F49" opacity="0.75"/></svg>`
    ),
  },
];

