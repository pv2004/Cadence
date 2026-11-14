import React, { useState } from 'react';
import { X, Plus, Trash2, Bell, Check } from 'lucide-react';
import {
  Habit,
  HabitType,
  ScheduleType,
  HabitReminder,
  AccentColorId,
} from '../types/habit';
import {
  ACCENT_PALETTES,
  HABIT_ICON_OPTIONS,
  STREAK_HABIT_COLORS,
  hexWithAlpha,
  renderHabitIcon,
} from '../utils/themes';
import { getTodayDateString } from '../utils/dateUtils';
import { requestNotificationPermission } from '../services/notifications';

interface HabitFormProps {
  initialHabit?: Habit | null;
  accentColor: AccentColorId;
  isDark?: boolean;
  onSave: (habitData: Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived'>) => void;
  onClose: () => void;
}

const WEEKDAYS = [
  { id: 1, label: 'M' },
  { id: 2, label: 'T' },
  { id: 3, label: 'W' },
  { id: 4, label: 'T' },
  { id: 5, label: 'F' },
  { id: 6, label: 'S' },
  { id: 0, label: 'S' },
];

const CATEGORIES = ['Fitness', 'Health', 'Learning', 'Mindfulness', 'Routine'];

export const HabitForm: React.FC<HabitFormProps> = ({
  initialHabit,
  accentColor,
  isDark = true,
  onSave,
  onClose,
}) => {
  const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.streak_brand;
  const surface = isDark ? palette.dark : palette.light;

  const [name, setName] = useState(initialHabit?.name || '');
  const [icon, setIcon] = useState(initialHabit?.icon || 'book');
  const [customEmoji, setCustomEmoji] = useState('');
  const [color, setColor] = useState(initialHabit?.color || STREAK_HABIT_COLORS[0]);
  const [coverImage, setCoverImage] = useState<string>(initialHabit?.coverImage || '');
  const [category, setCategory] = useState(initialHabit?.category || 'Health');
  const [type, setType] = useState<HabitType>(initialHabit?.type || 'normal');
  const [dailyTarget, setDailyTarget] = useState<string>(
    initialHabit?.dailyTarget ? String(initialHabit.dailyTarget) : '8'
  );
  const [unit, setUnit] = useState(initialHabit?.unit || 'glasses');

  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initialHabit?.schedule.type || 'everyday'
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initialHabit?.schedule.weekdays || [1, 2, 3, 4, 5]
  );
  const [timesPerWeek, setTimesPerWeek] = useState<string>(
    String(initialHabit?.schedule.timesPerWeek || 3)
  );
  const [timesPerMonth, setTimesPerMonth] = useState<string>(
    String(initialHabit?.schedule.timesPerMonth || 15)
  );
  const [intervalDays, setIntervalDays] = useState<string>(
    String(initialHabit?.schedule.intervalDays || 2)
  );

  const [reminders, setReminders] = useState<HabitReminder[]>(
    initialHabit?.reminders || []
  );
  const [error, setError] = useState('');

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day]
    );
  };

  const handleAddReminder = async () => {
    await requestNotificationPermission();
    const newRem: HabitReminder = {
      id: `rem-${Date.now()}`,
      time: '09:00',
      days: [1, 2, 3, 4, 5, 6, 0],
      enabled: true,
    };
    setReminders((prev) => [...prev, newRem]);
  };

  const handleUpdateReminderTime = (id: string, time: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, time } : r)));
  };

  const handleToggleReminderDay = (id: string, day: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.days.includes(day);
        const nextDays = has
          ? r.days.length > 1
            ? r.days.filter((d) => d !== day)
            : r.days
          : [...r.days, day];
        return { ...r, days: nextDays };
      })
    );
  };

  const handleRemoveReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a habit name.');
      return;
    }

    const parsedTarget = Math.max(1, Number(dailyTarget) || 1);
    const chosenIcon = customEmoji.trim() ? customEmoji.trim() : icon;

    onSave({
      name: trimmed,
      icon: chosenIcon,
      color,
      coverImage: coverImage || undefined,
      category,
      type,
      dailyTarget: type === 'amount' ? parsedTarget : undefined,
      unit: type === 'amount' ? unit.trim() || 'times' : undefined,
      schedule: {
        type: scheduleType,
        weekdays: scheduleType === 'weekdays' ? weekdays : undefined,
        timesPerWeek:
          scheduleType === 'times_per_week'
            ? Math.min(7, Math.max(1, Number(timesPerWeek) || 3))
            : undefined,
        timesPerMonth:
          scheduleType === 'times_per_month'
            ? Math.min(31, Math.max(1, Number(timesPerMonth) || 15))
            : undefined,
        intervalDays:
          scheduleType === 'every_n_days'
            ? Math.max(2, Number(intervalDays) || 2)
            : undefined,
        anchorDate:
          initialHabit?.schedule.anchorDate || getTodayDateString(),
      },
      reminders,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div
        className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        style={{
          backgroundColor: surface.card,
          border: `1px solid ${surface.outline}`,
          color: surface.text,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${surface.outline}` }}
        >
          <h3 className="text-base font-extrabold">
            {initialHabit ? 'Edit Habit' : 'New Habit'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: surface.high, color: surface.muted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Habit Name */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: surface.muted }}
            >
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Read before bed, Drink water"
              className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: surface.high,
                border: `1px solid ${surface.outline}`,
                color: surface.text,
              }}
              autoFocus
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          {/* Color Picker */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: surface.muted }}
            >
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {STREAK_HABIT_COLORS.map((hex) => {
                const isSelected = color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                      isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Photo Picker (for Express mode & Habit Detail banner) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: surface.muted }}
              >
                Cover Photo (Optional)
              </label>
              <label
                className="text-[11px] font-bold cursor-pointer hover:opacity-80"
                style={{ color: surface.accent }}
              >
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setCoverImage('')}
                style={{
                  backgroundColor: surface.high,
                  borderColor: !coverImage ? color : surface.outline,
                  color: !coverImage ? surface.text : surface.muted,
                }}
                className="px-3 py-2 rounded-xl border text-xs font-bold shrink-0"
              >
                None
              </button>
              {[
                { id: 'aurora_violet', label: 'Aurora' },
                { id: 'midnight_peaks', label: 'Peaks' },
                { id: 'emerald_forest', label: 'Canopy' },
                { id: 'sunset_dunes', label: 'Dunes' },
                { id: 'ocean_tide', label: 'Aegean' },
              ].map((preset) => {
                const active = coverImage === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCoverImage(preset.id)}
                    style={{
                      backgroundColor: active
                        ? hexWithAlpha(color, 0.2)
                        : surface.high,
                      borderColor: active ? color : surface.outline,
                      color: active ? color : surface.muted,
                    }}
                    className="px-3 py-2 rounded-xl border text-xs font-bold shrink-0"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: surface.muted }}
            >
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      backgroundColor: active ? color : surface.high,
                      color: active ? '#FFFFFF' : surface.muted,
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors"
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Habit Type */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: surface.muted }}
            >
              Habit Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'normal', title: 'Regular', desc: 'Check off once' },
                  { id: 'amount', title: 'Amount', desc: 'Track a number' },
                  { id: 'avoid', title: 'Avoid', desc: 'Quit a habit' },
                ] as const
              ).map((item) => {
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    style={{
                      backgroundColor: active ? hexWithAlpha(color, 0.16) : surface.high,
                      borderColor: active ? color : surface.outline,
                    }}
                    className="p-2.5 rounded-2xl border text-left transition-all"
                  >
                    <div
                      className="text-xs font-bold"
                      style={{ color: active ? color : surface.text }}
                    >
                      {item.title}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 leading-tight"
                      style={{ color: surface.muted }}
                    >
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target & Unit for Amount Habit */}
          {type === 'amount' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: surface.muted }}
                >
                  Daily Target
                </label>
                <input
                  type="number"
                  min={1}
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl text-sm font-semibold focus:outline-none"
                  style={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    color: surface.text,
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: surface.muted }}
                >
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="glasses, pages, min"
                  className="w-full px-3 py-2 rounded-2xl text-sm font-semibold focus:outline-none"
                  style={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    color: surface.text,
                  }}
                />
              </div>
            </div>
          )}

          {/* Icon or Emoji */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: surface.muted }}
              >
                Icon or Emoji
              </label>
              <input
                type="text"
                maxLength={2}
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Or type emoji"
                className="w-28 px-2.5 py-1 text-xs rounded-xl text-center"
                style={{
                  backgroundColor: surface.high,
                  border: `1px solid ${surface.outline}`,
                  color: surface.text,
                }}
              />
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {HABIT_ICON_OPTIONS.map((opt) => {
                const active = !customEmoji && icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCustomEmoji('');
                      setIcon(opt.id);
                    }}
                    title={opt.label}
                    style={{
                      backgroundColor: active ? color : surface.high,
                      color: active ? '#FFFFFF' : surface.muted,
                    }}
                    className="h-9 rounded-xl flex items-center justify-center transition-all"
                  >
                    {renderHabitIcon(opt.id, 'w-4 h-4')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: surface.muted }}
            >
              Schedule
            </label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: surface.high,
                border: `1px solid ${surface.outline}`,
                color: surface.text,
              }}
            >
              <option value="everyday">Every day</option>
              <option value="weekdays">Selected weekdays</option>
              <option value="times_per_week">X times per week</option>
              <option value="times_per_month">X times per month</option>
              <option value="every_n_days">Every N days</option>
            </select>

            {scheduleType === 'weekdays' && (
              <div className="flex items-center justify-between gap-1.5 mt-2.5">
                {WEEKDAYS.map((d) => {
                  const selected = weekdays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleWeekday(d.id)}
                      style={{
                        backgroundColor: selected ? color : surface.high,
                        color: selected ? '#FFFFFF' : surface.muted,
                      }}
                      className="flex-1 h-9 rounded-xl text-xs font-bold transition-colors"
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}

            {scheduleType === 'times_per_week' && (
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={timesPerWeek}
                  onChange={(e) => setTimesPerWeek(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl text-sm text-center font-bold"
                  style={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    color: surface.text,
                  }}
                />
                <span className="text-xs" style={{ color: surface.muted }}>
                  days per week
                </span>
              </div>
            )}

            {scheduleType === 'times_per_month' && (
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={timesPerMonth}
                  onChange={(e) => setTimesPerMonth(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl text-sm text-center font-bold"
                  style={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    color: surface.text,
                  }}
                />
                <span className="text-xs" style={{ color: surface.muted }}>
                  days per month
                </span>
              </div>
            )}

            {scheduleType === 'every_n_days' && (
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-xs" style={{ color: surface.muted }}>
                  Every
                </span>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl text-sm text-center font-bold"
                  style={{
                    backgroundColor: surface.high,
                    border: `1px solid ${surface.outline}`,
                    color: surface.text,
                  }}
                />
                <span className="text-xs" style={{ color: surface.muted }}>
                  days
                </span>
              </div>
            )}
          </div>

          {/* Reminders */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: surface.muted }}
              >
                <Bell className="w-3.5 h-3.5" />
                Reminders
              </label>
              <button
                type="button"
                onClick={handleAddReminder}
                style={{ color: surface.accent }}
                className="text-xs font-bold flex items-center gap-1 hover:opacity-80"
              >
                <Plus className="w-3.5 h-3.5" />
                Add time
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs" style={{ color: surface.muted }}>
                No reminders configured.
              </p>
            ) : (
              <div className="space-y-2">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-2.5 rounded-2xl space-y-2"
                    style={{
                      backgroundColor: surface.high,
                      border: `1px solid ${surface.outline}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="time"
                        value={rem.time}
                        onChange={(e) => handleUpdateReminderTime(rem.id, e.target.value)}
                        className="bg-transparent text-xs font-bold focus:outline-none"
                        style={{ color: surface.text }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveReminder(rem.id)}
                        className="text-rose-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {WEEKDAYS.map((d) => {
                        const active = rem.days.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleToggleReminderDay(rem.id, d.id)}
                            style={{
                              backgroundColor: active ? color : surface.card,
                              color: active ? '#FFFFFF' : surface.muted,
                            }}
                            className="flex-1 h-6 rounded-lg text-[10px] font-bold"
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-colors"
              style={{ backgroundColor: surface.high, color: surface.muted }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ backgroundColor: color }}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-opacity hover:opacity-95"
            >
              {initialHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
