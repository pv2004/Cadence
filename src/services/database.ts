import {
  Habit,
  HabitCompletion,
  UserPreferences,
  BackupPayload,
  FocusSession,
  IslandState,
} from '../types/habit';
import {
  addDays,
  formatDateKey,
  isHabitScheduledOnDate,
  buildShowcaseDuplicateData,
} from '../utils/habitLogic';

const DB_NAME = 'cadence_habit_db';
const DB_VERSION = 1;

export const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  userName: '',
  themeMode: 'dark',
  interfaceStyle: 'minimal',
  appBackground: 'solid',
  todayCardLayout: 'list',
  showDailyQuote: true,
  customQuotes: [],
  accentColor: 'streak_brand',
  trueBlackDark: false,
  weekStartsOn: 1, // Monday
  notificationsEnabled: false,
  soundFeedback: true,
  dailyFocusGoalMinutes: 60,
  hasSeenSampleBanner: false,
};

export const DEFAULT_ISLAND_STATE: IslandState = {
  name: 'Mykonos Sanctuary',
  unlockedIds: [],
  rotation: 0,
  lighting: 'day',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('completions')) {
        const store = db.createObjectStore('completions', { keyPath: 'id' });
        store.createIndex('by_habit', 'habitId', { unique: false });
        store.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Generate realistic deterministic sample data matching the exact habits and
 * colors shown in the InlitX/streak repository screenshots.
 */
export function buildSampleSeedData(todayStr: string): {
  habits: Habit[];
  completions: HabitCompletion[];
} {
  const createdStr = addDays(todayStr, -300);
  const habits: Habit[] = [
    {
      id: 'sample-gym',
      name: 'Gym session',
      icon: 'Dumbbell',
      type: 'normal',
      category: 'Fitness',
      color: '#5856D6', // Indigo
      coverImage: 'midnight_peaks',
      schedule: { type: 'times_per_week', timesPerWeek: 3 },
      reminders: [
        { id: 'rem-1', enabled: true, time: '18:00', days: [1, 3, 5] },
      ],
      order: 0,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'sample-no-sugar',
      name: 'No sugar',
      icon: 'Leaf',
      type: 'avoid',
      category: 'Health',
      color: '#30D158', // Vibrant Green
      coverImage: 'emerald_forest',
      schedule: { type: 'everyday' },
      reminders: [
        {
          id: 'rem-2',
          enabled: true,
          time: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
      order: 1,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'sample-reading',
      name: 'Read before bed',
      icon: 'BookOpen',
      type: 'amount',
      category: 'Learning',
      color: '#7C3AED', // Streak Brand Violet
      coverImage: 'aurora_violet',
      target: 20,
      dailyTarget: 20,
      unit: 'pages',
      schedule: { type: 'everyday' },
      reminders: [
        {
          id: 'rem-3',
          enabled: true,
          time: '21:30',
          days: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
      order: 2,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'sample-water',
      name: 'Drink water',
      icon: 'Droplets',
      type: 'amount',
      category: 'Health',
      color: '#5AC8FA', // Sky Blue
      coverImage: 'ocean_tide',
      target: 8,
      dailyTarget: 8,
      unit: 'glasses',
      schedule: { type: 'everyday' },
      reminders: [],
      order: 3,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'sample-run',
      name: 'Morning run',
      icon: 'Footprints',
      type: 'normal',
      category: 'Fitness',
      color: '#FF9500', // Orange
      schedule: { type: 'weekdays', weekdays: [1, 2, 4, 5, 6] },
      reminders: [
        {
          id: 'rem-5',
          enabled: true,
          time: '07:00',
          days: [1, 2, 4, 5, 6],
        },
      ],
      order: 4,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
    {
      id: 'sample-meditate',
      name: 'Meditate',
      icon: 'Brain',
      type: 'normal',
      category: 'Health',
      color: '#4ECDC4', // Mint Teal
      schedule: { type: 'everyday' },
      reminders: [],
      order: 5,
      archived: false,
      isSample: true,
      createdAt: createdStr,
    },
  ];

  const completions: HabitCompletion[] = [];

  for (let offset = 290; offset >= 0; offset--) {
    const dateStr = addDays(todayStr, -offset);

    for (const h of habits) {
      if (!isHabitScheduledOnDate(h, dateStr)) continue;

      const hash = (offset * 31 + h.id.charCodeAt(7) * 19) % 100;

      if (offset === 0) {
        if (
          h.id === 'sample-no-sugar' ||
          h.id === 'sample-reading' ||
          h.id === 'sample-meditate' ||
          h.id === 'sample-run'
        ) {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: h.type === 'amount' ? h.target || 1 : 1,
            completed: true,
            updatedAt: Date.now(),
            isSample: true,
          });
        } else if (h.id === 'sample-water') {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: 6,
            completed: false,
            updatedAt: Date.now(),
            isSample: true,
          });
        }
        continue;
      }

      const isRecentStreak = offset <= 14;

      if (h.type === 'amount') {
        const target = h.target || 1;
        if (isRecentStreak || hash < 78) {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: target,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        } else if (hash < 92) {
          const partialVal = Math.max(1, Math.round(target * 0.5));
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: partialVal,
            completed: false,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      } else if (h.type === 'avoid') {
        if (offset <= 34 || hash < 88) {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: 1,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        } else {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: -1,
            completed: false,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      } else {
        if (isRecentStreak || hash < 80) {
          completions.push({
            id: `${h.id}_${dateStr}`,
            habitId: h.id,
            date: dateStr,
            value: 1,
            completed: true,
            updatedAt: Date.now() - offset * 86400000,
            isSample: true,
          });
        }
      }
    }
  }

  return { habits, completions };
}

export async function loadAllData(): Promise<{
  habits: Habit[];
  completions: Record<string, HabitCompletion>;
  preferences: UserPreferences;
}> {
  const db = await openDatabase();

  const habits = await new Promise<Habit[]>((resolve, reject) => {
    const tx = db.transaction('habits', 'readonly');
    const req = tx.objectStore('habits').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const completionsArr = await new Promise<HabitCompletion[]>(
    (resolve, reject) => {
      const tx = db.transaction('completions', 'readonly');
      const req = tx.objectStore('completions').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }
  );

  const prefs = await new Promise<UserPreferences | undefined>(
    (resolve, reject) => {
      const tx = db.transaction('preferences', 'readonly');
      const req = tx.objectStore('preferences').get('default');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }
  );

  const cleanStartFlag = localStorage.getItem('cadence_clean_zero_start_v5');
  const onboardingDone =
    localStorage.getItem('streak_onboarding_completed_v1') === 'true';

  if ((!cleanStartFlag || !onboardingDone) && !isShowcaseModeActive()) {
    const userHabits = habits.filter((h) => !h.isSample);
    const userCompletions = completionsArr.filter((c) => !c.isSample);
    const cleanedName =
      !onboardingDone ||
      !prefs?.userName ||
      prefs.userName.trim().toLowerCase() === 'vineeth'
        ? ''
        : prefs.userName;

    const mergedPrefs: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(prefs || {}),
      userName: cleanedName,
    };

    await saveBulkData(userHabits, userCompletions, mergedPrefs);
    localStorage.setItem('cadence_clean_zero_start_v5', 'true');

    const map: Record<string, HabitCompletion> = {};
    for (const c of userCompletions) {
      map[c.id] = c;
    }
    return {
      habits: userHabits.sort((a, b) => a.order - b.order),
      completions: map,
      preferences: mergedPrefs,
    };
  }

  const sanitizedPrefs: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(prefs || {}),
    userName:
      prefs?.userName?.trim().toLowerCase() === 'vineeth'
        ? ''
        : (prefs?.userName ?? ''),
  };

  const completions: Record<string, HabitCompletion> = {};
  for (const c of completionsArr) {
    completions[c.id] = c;
  }

  return {
    habits: habits.sort((a, b) => a.order - b.order),
    completions,
    preferences: sanitizedPrefs,
  };
}

export async function seedDatabaseIfEmpty(): Promise<{
  habits: Habit[];
  completions: HabitCompletion[];
  preferences: UserPreferences;
}> {
  const data = await loadAllData();
  return {
    habits: data.habits,
    completions: Object.values(data.completions),
    preferences: data.preferences,
  };
}

export async function saveHabitToDB(habit: Habit): Promise<void> {
  const normalized: Habit = {
    ...habit,
    target: habit.target ?? habit.dailyTarget,
    dailyTarget: habit.dailyTarget ?? habit.target,
    schedule: {
      ...habit.schedule,
      everyNDays: habit.schedule.everyNDays ?? habit.schedule.intervalDays,
      intervalDays: habit.schedule.intervalDays ?? habit.schedule.everyNDays,
    },
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readwrite');
    tx.objectStore('habits').put(normalized);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const saveHabit = saveHabitToDB;

export async function saveHabitsOrderToDB(habits: Habit[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    for (const h of habits) {
      store.put(h);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteHabitFromDB(habitId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'completions'], 'readwrite');
    tx.objectStore('habits').delete(habitId);
    const compStore = tx.objectStore('completions');
    const idx = compStore.index('by_habit');
    const req = idx.openCursor(IDBKeyRange.only(habitId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        compStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const deleteHabit = deleteHabitFromDB;

export async function saveCompletionToDB(record: HabitCompletion): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('completions', 'readwrite');
    tx.objectStore('completions').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const upsertCompletion = saveCompletionToDB;

export async function deleteCompletionFromDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('completions', 'readwrite');
    tx.objectStore('completions').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const deleteCompletion = deleteCompletionFromDB;

export async function savePreferencesToDB(prefs: UserPreferences): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('preferences', 'readwrite');
    tx.objectStore('preferences').put(prefs);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const savePreferences = savePreferencesToDB;

export async function clearSampleDataFromDB(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'completions'], 'readwrite');
    const habitStore = tx.objectStore('habits');
    const compStore = tx.objectStore('completions');

    const hReq = habitStore.openCursor();
    hReq.onsuccess = () => {
      const cursor = hReq.result;
      if (cursor) {
        const val = cursor.value as Habit;
        if (val.isSample) {
          habitStore.delete(cursor.primaryKey);
        }
        cursor.continue();
      }
    };

    const cReq = compStore.openCursor();
    cReq.onsuccess = () => {
      const cursor = cReq.result;
      if (cursor) {
        const val = cursor.value as HabitCompletion;
        if (val.isSample) {
          compStore.delete(cursor.primaryKey);
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllDataFromDB(): Promise<void> {
  const db = await openDatabase();
  localStorage.setItem('cadence_clean_zero_start_v4', 'true');
  saveFocusSessions([]);
  saveIslandState(DEFAULT_ISLAND_STATE);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'completions'], 'readwrite');
    tx.objectStore('habits').clear();
    tx.objectStore('completions').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const clearAllDatabaseData = clearAllDataFromDB;

export async function saveBulkData(
  habits: Habit[],
  completions: HabitCompletion[],
  preferences: UserPreferences
): Promise<void> {
  const db = await openDatabase();
  localStorage.setItem('cadence_streak_seeded_v2', 'true');
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['habits', 'completions', 'preferences'],
      'readwrite'
    );
    const hStore = tx.objectStore('habits');
    const cStore = tx.objectStore('completions');
    const pStore = tx.objectStore('preferences');

    hStore.clear();
    cStore.clear();

    for (const h of habits) hStore.put(h);
    for (const c of completions) cStore.put(c);
    pStore.put(preferences);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportBackupData(): Promise<BackupPayload> {
  const data = await seedDatabaseIfEmpty();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Cadence',
    habits: data.habits,
    completions: data.completions,
    preferences: data.preferences,
  };
}

export async function importBackupData(payload: BackupPayload): Promise<void> {
  await saveBulkData(
    payload.habits || [],
    payload.completions || [],
    payload.preferences || DEFAULT_PREFERENCES
  );
}

export async function resetToSampleData(): Promise<{
  habits: Habit[];
  completions: HabitCompletion[];
  preferences: UserPreferences;
}> {
  const todayStr = formatDateKey(new Date());
  const seed = buildSampleSeedData(todayStr);
  await saveBulkData(seed.habits, seed.completions, DEFAULT_PREFERENCES);
  return {
    habits: seed.habits,
    completions: seed.completions,
    preferences: DEFAULT_PREFERENCES,
  };
}

const FOCUS_STORAGE_KEY = 'cadence_focus_sessions_v1';
const ISLAND_STORAGE_KEY = 'cadence_island_state_v1';

export function buildSampleFocusSessions(todayStr: string): FocusSession[] {
  return [
    {
      id: 'focus-sample-1',
      habitId: 'sample-reading',
      label: 'Read before bed',
      minutes: 25,
      mode: 'pomodoro',
      date: todayStr,
      completedAt: Date.now() - 3600000 * 3,
    },
    {
      id: 'focus-sample-2',
      habitId: 'sample-meditate',
      label: 'Mindful Meditation',
      minutes: 20,
      mode: 'free',
      date: addDays(todayStr, -1),
      completedAt: Date.now() - 86400000,
    },
    {
      id: 'focus-sample-3',
      habitId: 'sample-gym',
      label: 'Strength Training Focus',
      minutes: 45,
      mode: 'free',
      date: addDays(todayStr, -2),
      completedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'focus-sample-4',
      habitId: 'sample-reading',
      label: 'Deep Reading',
      minutes: 30,
      mode: 'pomodoro',
      date: addDays(todayStr, -3),
      completedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'focus-sample-5',
      habitId: 'sample-meditate',
      label: 'Evening Breathwork',
      minutes: 15,
      mode: 'free',
      date: addDays(todayStr, -5),
      completedAt: Date.now() - 86400000 * 5,
    },
  ];
}

export function loadFocusSessions(_todayStr?: string): FocusSession[] {
  try {
    const cleanStartFlag = localStorage.getItem('cadence_clean_zero_start_v4');
    const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!cleanStartFlag && !isShowcaseModeActive()) {
      const userOnly = parsed.filter(
        (s: FocusSession) =>
          s &&
          typeof s.id === 'string' &&
          !s.id.startsWith('focus-sample-') &&
          !s.id.startsWith('showcase-focus-')
      );
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(userOnly));
      return userOnly;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveFocusSessions(sessions: FocusSession[]): void {
  try {
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore storage quota errors
  }
}

export function loadIslandState(): IslandState {
  try {
    const cleanStartFlag = localStorage.getItem('cadence_clean_zero_start_v4');
    const raw = localStorage.getItem(ISLAND_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ISLAND_STORAGE_KEY, JSON.stringify(DEFAULT_ISLAND_STATE));
      return DEFAULT_ISLAND_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<IslandState>;
    if (!cleanStartFlag && !isShowcaseModeActive()) {
      const resetState: IslandState = {
        ...DEFAULT_ISLAND_STATE,
        ...parsed,
        unlockedIds: [],
      };
      localStorage.setItem(ISLAND_STORAGE_KEY, JSON.stringify(resetState));
      return resetState;
    }
    return { ...DEFAULT_ISLAND_STATE, ...parsed };
  } catch {
    return DEFAULT_ISLAND_STATE;
  }
}

export function saveIslandState(state: IslandState): void {
  try {
    localStorage.setItem(ISLAND_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

const SHOWCASE_ACTIVE_KEY = 'cadence_showcase_active_v1';
const ORIGINAL_SNAPSHOT_KEY = 'cadence_original_snapshot_v1';

export interface OriginalDataSnapshot {
  habits: Habit[];
  completions: HabitCompletion[];
  preferences: UserPreferences;
  focusSessions: FocusSession[];
  islandState: IslandState;
}

export function isShowcaseModeActive(): boolean {
  try {
    return localStorage.getItem(SHOWCASE_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function activateShowcaseData(
  current: OriginalDataSnapshot
): Promise<OriginalDataSnapshot> {
  try {
    // Only overwrite snapshot if we are not already in showcase mode
    if (!isShowcaseModeActive()) {
      localStorage.setItem(ORIGINAL_SNAPSHOT_KEY, JSON.stringify(current));
    }
    localStorage.setItem(SHOWCASE_ACTIVE_KEY, 'true');
  } catch {
    // ignore storage quota errors
  }

  const todayStr = formatDateKey(new Date());
  const showcase = buildShowcaseDuplicateData(
    todayStr,
    current.habits,
    current.completions
  );

  await saveBulkData(showcase.habits, showcase.completions, current.preferences);
  saveFocusSessions(showcase.focusSessions);
  saveIslandState(showcase.islandState);

  return {
    habits: showcase.habits,
    completions: showcase.completions,
    preferences: current.preferences,
    focusSessions: showcase.focusSessions,
    islandState: showcase.islandState,
  };
}

export async function restoreOriginalData(): Promise<OriginalDataSnapshot> {
  let snapshot: OriginalDataSnapshot | null = null;

  try {
    const raw = localStorage.getItem(ORIGINAL_SNAPSHOT_KEY);
    if (raw) {
      snapshot = JSON.parse(raw) as OriginalDataSnapshot;
    }
    localStorage.removeItem(SHOWCASE_ACTIVE_KEY);
    localStorage.removeItem(ORIGINAL_SNAPSHOT_KEY);
  } catch {
    snapshot = null;
  }

  if (snapshot && Array.isArray(snapshot.habits)) {
    const restoredHabits = snapshot.habits;
    const restoredCompletions = snapshot.completions || [];
    const restoredPreferences = snapshot.preferences || DEFAULT_PREFERENCES;
    const restoredFocus = snapshot.focusSessions || [];
    const restoredIsland = snapshot.islandState || DEFAULT_ISLAND_STATE;

    await saveBulkData(
      restoredHabits,
      restoredCompletions,
      restoredPreferences
    );
    saveFocusSessions(restoredFocus);
    saveIslandState(restoredIsland);

    return {
      habits: restoredHabits,
      completions: restoredCompletions,
      preferences: restoredPreferences,
      focusSessions: restoredFocus,
      islandState: restoredIsland,
    };
  }

  // Fallback if snapshot was cleared manually: restore clean 0-data state
  await saveBulkData([], [], DEFAULT_PREFERENCES);
  saveFocusSessions([]);
  saveIslandState(DEFAULT_ISLAND_STATE);

  return {
    habits: [],
    completions: [],
    preferences: DEFAULT_PREFERENCES,
    focusSessions: [],
    islandState: DEFAULT_ISLAND_STATE,
  };
}


