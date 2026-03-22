import Anthropic from '@anthropic-ai/sdk';
import { LRUCache } from 'lru-cache';
import pool from '../config/db';
import { ParsedMealItem, DailyInsight, DailySummary, UserProfile } from '../types';
import * as foodService from './foodService';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cache für parsed meals (key: normalized input text)
const mealParseCache = new LRUCache<string, ParsedMealItem[]>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
});

const MEAL_PARSE_SYSTEM_PROMPT = `Du bist ein präziser Ernährungsassistent für eine deutsche Ernährungs-App.
Der Nutzer beschreibt seine Mahlzeit auf Deutsch.

Analysiere die Eingabe und extrahiere alle Lebensmittel mit Nährwerten.
Verwende deutsche Standardportionsgrößen wenn keine Menge angegeben ist:
- 1 Ei = 55g
- 1 Scheibe Toast = 30g
- 1 Scheibe Brot = 50g
- 1 Avocado = 200g (halb = 100g)
- 1 Banane = 120g
- 1 Apfel = 150g
- 1 Tasse Kaffee/Cappuccino = 200ml
- 1 EL Butter = 10g
- 1 Portion Hähnchenbrust = 150g
- 1 Portion Lachs = 150g
- 1 Portion Pasta = 200g (gekocht)
- 1 Portion Reis = 200g (gekocht)

Gib AUSSCHLIESSLICH ein valides JSON-Array zurück. Kein erklärender Text davor oder danach.
Format: [{"name": string, "amount_g": number, "unit": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": number}]
confidence ist 0.0-1.0 (wie sicher bist du bei der Erkennung und Mengenangabe)`;

const COACHING_SYSTEM_PROMPT = `Du bist Zikki, ein einfühlsamer und motivierender Ernährungscoach.
Du kommunizierst ausschließlich auf Deutsch, direkt und persönlich (du-Form).
Deine Insights sind spezifisch, nicht generisch. Du verwendest echte Zahlen aus den Daten.
Sei positiv aber ehrlich. Feiere Erfolge, weise auf Verbesserungsmöglichkeiten hin.`;

export async function parseMeal(rawInput: string): Promise<ParsedMealItem[]> {
  const cacheKey = rawInput.toLowerCase().trim();
  const cached = mealParseCache.get(cacheKey);
  if (cached) return cached;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: MEAL_PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawInput }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonText = jsonMatch[1];

    const parsed = JSON.parse(jsonText) as ParsedMealItem[];

    // Try to match each item against our food DB for a food_id
    const itemsWithIds = await Promise.all(
      parsed.map(async (item) => {
        try {
          const results = await foodService.searchFoods(item.name, 1);
          if (results.length > 0 && (item.confidence ?? 0.7) > 0.6) {
            return { ...item, food_id: results[0].id };
          }
        } catch {}
        return item;
      })
    );

    mealParseCache.set(cacheKey, itemsWithIds);
    return itemsWithIds;
  } catch (error) {
    console.error('Meal parse error:', error);
    throw new Error('KI-Analyse fehlgeschlagen. Bitte erneut versuchen.');
  }
}

export async function getDailyInsight(
  userId: string,
  profile: UserProfile,
  summary: DailySummary
): Promise<DailyInsight> {
  const today = new Date().toISOString().split('T')[0];

  // Check cache in DB
  const cached = await pool.query(
    'SELECT content FROM daily_insights WHERE user_id = $1 AND insight_date = $2',
    [userId, today]
  );

  if (cached.rows.length > 0) {
    return cached.rows[0].content as DailyInsight;
  }

  // Build context
  const calorieGoal = profile.calorie_target ?? 2000;
  const proteinGoal = profile.protein_target_g ?? 150;
  const calorieProgress = Math.round((summary.total_calories / calorieGoal) * 100);
  const proteinProgress = Math.round((summary.total_protein_g / proteinGoal) * 100);
  const calorieRemaining = calorieGoal - Math.round(summary.total_calories);

  const mealBreakdown = Object.entries(
    summary.entries.reduce((acc: Record<string, number>, e) => {
      acc[e.meal_type] = (acc[e.meal_type] ?? 0) + Number(e.calories);
      return acc;
    }, {})
  )
    .map(([type, kcal]) => `${type}: ${Math.round(kcal)} kcal`)
    .join(', ');

  const prompt = `Analysiere diese Ernährungsdaten und erstelle 3 persönliche Coaching-Insights:

TAGESZIELE:
- Kalorien: ${calorieGoal} kcal
- Protein: ${proteinGoal}g
- Kohlenhydrate: ${profile.carbs_target_g ?? 200}g
- Fett: ${profile.fat_target_g ?? 65}g

HEUTE BISHER (${new Date().toLocaleDateString('de-DE')}):
- Kalorien: ${Math.round(summary.total_calories)} kcal (${calorieProgress}% des Ziels)
- Protein: ${Math.round(summary.total_protein_g)}g (${proteinProgress}% des Ziels)
- Kohlenhydrate: ${Math.round(summary.total_carbs_g)}g
- Fett: ${Math.round(summary.total_fat_g)}g
- Verbleibende Kalorien: ${calorieRemaining} kcal
- Mahlzeiten: ${summary.entries.length} Einträge
${mealBreakdown ? `- Verteilung: ${mealBreakdown}` : ''}

NUTZERPROFIL:
- Ziel: ${profile.goal === 'lose' ? 'Abnehmen' : profile.goal === 'gain' ? 'Zunehmen' : 'Gewicht halten'}
- Aktivität: ${profile.activity_level ?? 'unbekannt'}

Erstelle genau 3 Insights als JSON:
{
  "insights": [
    {"emoji": "🎯", "title": "Kurzer Titel (<50 Zeichen)", "message": "Konkrete Nachricht (1-2 Sätze) mit echten Zahlen", "priority": "high"},
    {"emoji": "💪", "title": "...", "message": "...", "priority": "medium"},
    {"emoji": "💡", "title": "...", "message": "...", "priority": "low"}
  ],
  "summary": "Ein zusammenfassender Satz für heute"
}
Gib NUR das JSON zurück.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: COACHING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonText = jsonMatch[1];

    const insight = JSON.parse(jsonText) as DailyInsight;

    // Cache in DB
    await pool.query(
      `INSERT INTO daily_insights (user_id, insight_date, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, insight_date) DO UPDATE SET content = $3`,
      [userId, today, JSON.stringify(insight)]
    );

    return insight;
  } catch (error) {
    console.error('Coaching error:', error);
    // Fallback insight
    return {
      insights: [
        {
          emoji: '📊',
          title: 'Tagesübersicht',
          message: `Du hast heute ${Math.round(summary.total_calories)} von ${calorieGoal} Kalorien gegessen (${calorieProgress}%).`,
          priority: 'medium',
        },
      ],
      summary: `Heute ${calorieProgress}% des Kalorienziels erreicht.`,
    };
  }
}
