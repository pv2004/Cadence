import { GoogleGenAI, ThinkingLevel } from '@google/genai';

interface HabitWeekItem {
  name: string;
  completedDays: number;
  scheduledDays: number;
  ratePercent: number;
  currentStreak: number;
}

interface WeeklyDigestPayload {
  scopeName: string;
  weekCompletionRate: number;
  totalCompletedThisWeek: number;
  totalScheduledThisWeek: number;
  bestStreakDays: number;
  topHabitName: string | null;
  focusHabitName: string | null;
  habits: HabitWeekItem[];
}

interface VercelRequestLike {
  method?: string;
  body?: { digest?: WeeklyDigestPayload } | string;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const parsedBody =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const digest = parsedBody?.digest as WeeklyDigestPayload | undefined;

    if (!digest || typeof digest !== 'object') {
      res.status(400).json({ error: 'Missing weekly habit performance digest.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in environment variables.',
      });
      return;
    }

    const habitLines = Array.isArray(digest.habits)
      ? digest.habits
          .map(
            (h) =>
              `- ${h.name}: ${h.completedDays}/${h.scheduledDays} days (${h.ratePercent}%), current streak ${h.currentStreak}d`
          )
          .join('\n')
      : 'No active habits logged yet.';

    const prompt = [
      `Scope: ${digest.scopeName || 'All Habits'}`,
      `Weekly Completion Rate: ${digest.weekCompletionRate}% (${digest.totalCompletedThisWeek} completed out of ${digest.totalScheduledThisWeek} scheduled check-ins in the last 7 days)`,
      `Best Current Streak: ${digest.bestStreakDays} days`,
      digest.topHabitName ? `Strongest Habit: ${digest.topHabitName}` : '',
      digest.focusHabitName
        ? `Habit Needing Attention: ${digest.focusHabitName}`
        : '',
      `Per-Habit 7-Day Breakdown:\n${habitLines}`,
    ]
      .filter(Boolean)
      .join('\n');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          "You are a concise, warm habit coach inside a mobile habit tracker app. Analyze the user's last 7 days of habit performance and write a short, encouraging, and actionable summary in 2 to 3 sentences (maximum 55 words total). Mention specific habit names and numbers from the data, celebrate momentum, and offer one concrete, easy action for today. Plain text only, no markdown bullets or headings.",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const summary = (response.text ?? '').trim();
    if (!summary) {
      res.status(502).json({ error: 'Empty response from Gemini model.' });
      return;
    }

    res.status(200).json({ summary });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate weekly summary.';
    res.status(500).json({ error: message });
  }
}
