import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

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

function getGenAIClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post('/api/weekly-summary', async (req, res) => {
    try {
      const digest = req.body?.digest as WeeklyDigestPayload | undefined;
      if (!digest || typeof digest !== 'object') {
        res.status(400).json({ error: 'Missing weekly habit performance digest.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel.',
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

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a concise, warm habit coach inside a mobile habit tracker app. Analyze the user\'s last 7 days of habit performance and write a short, encouraging, and actionable summary in 2 to 3 sentences (maximum 55 words total). Mention specific habit names and numbers from the data, celebrate momentum, and offer one concrete, easy action for today. Plain text only, no markdown bullets or headings.',
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

      res.json({ summary });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate weekly summary.';
      const status =
        message.includes('403') || message.includes('PERMISSION_DENIED')
          ? 403
          : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
            ? 429
            : message.includes('404') || message.includes('NOT_FOUND')
              ? 404
              : 500;
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
