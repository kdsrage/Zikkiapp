import Anthropic from '@anthropic-ai/sdk';
import { LRUCache } from 'lru-cache';
import pool from '../config/db';
import { ParsedMealItem, DailyInsight, DailySummary, UserProfile } from '../types';
import * as foodService from './foodService';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const mealParseCache = new LRUCache<string, ParsedMealItem[]>({
  max: 500,
  ttl: 1000 * 60 * 60,
});

// FIX 3: Robuster Prompt mit explizitem JSON-Format und Beispiel
const MEAL_PARSE_SYSTEM_PROMPT = `Du bist ein Ernährungsexperte für eine deutsche App. Deine Aufgabe: Mahlzeiten aus deutschem Freitext extrahieren.

REGELN:
1. Gib NUR ein JSON-Array zurück — kein Text davor oder danach, keine Markdown-Blöcke
2. Jedes Objekt im Array hat EXAKT diese Felder: name, amount_g, unit, calories, protein_g, carbs_g, fat_g, confidence
3. Alle Felder sind Pflicht, alle Zahlen sind Dezimalzahlen (z.B. 0.0 statt null)
4. confidence: 0.0-1.0 (1.0 = sehr sicher, 0.5 = Menge geschätzt)

STANDARDPORTIONEN (wenn keine Menge angegeben):
- 1 Ei = 55g | 1 Scheibe Toast = 30g | 1 Scheibe Brot = 50g
- 1 Banane = 120g | 1 Apfel = 150g | 1 Avocado = 200g (halb = 100g)
- 1 Tasse Kaffee/Cappuccino = 200ml (Kcal Cappuccino = 80)
- 1 EL Butter = 10g | 1 EL Öl = 10g | 1 EL Erdnussbutter = 16g
- 1 Portion Hähnchenbrust = 150g | 1 Portion Lachs = 150g | 1 Portion Rinderhack = 150g
- 1 Portion Pasta (gekocht) = 200g | 1 Portion Reis (gekocht) = 200g
- 1 Portion Haferflocken = 80g | 1 Joghurt = 150g | 1 Magerquark = 200g

NÄHRWERTDATEN (pro 100g, zur Orientierung):
- Hühnerei: 155 kcal, 13g P, 1g K, 11g F
- Toastbrot: 265 kcal, 8g P, 49g K, 4g F
- Vollkornbrot: 247 kcal, 9g P, 41g K, 4g F
- Hähnchenbrust (gebraten): 165 kcal, 31g P, 0g K, 4g F
- Lachs (gebraten): 208 kcal, 28g P, 0g K, 10g F
- Rinderhack (gebraten): 250 kcal, 18g P, 0g K, 20g F
- Reis (gekocht): 130 kcal, 3g P, 28g K, 0g F
- Pasta (gekocht): 131 kcal, 5g P, 25g K, 1g F
- Haferflocken: 375 kcal, 13g P, 66g K, 7g F
- Avocado: 160 kcal, 2g P, 9g K, 15g F
- Banane: 89 kcal, 1g P, 23g K, 0g F
- Cappuccino (200ml): 80 kcal, 4g P, 8g K, 3g F
- Butter: 741 kcal, 1g P, 1g K, 81g F
- Magerquark: 67 kcal, 12g P, 4g K, 0g F

BEISPIEL:
Input: "2 Eier und Toast mit Butter"
Output: [{"name":"Hühnerei, gekocht","amount_g":110,"unit":"2 Stück","calories":170.5,"protein_g":14.3,"carbs_g":1.2,"fat_g":12.1,"confidence":0.95},{"name":"Toastbrot","amount_g":30,"unit":"1 Scheibe","calories":79.5,"protein_g":2.4,"carbs_g":14.7,"fat_g":1.1,"confidence":0.80},{"name":"Butter","amount_g":10,"unit":"1 Portion","calories":74.1,"protein_g":0.1,"carbs_g":0.1,"fat_g":8.1,"confidence":0.75}]`;

const COACHING_SYSTEM_PROMPT = `Du bist Zikki, ein freundlicher Ernährungscoach. Antworte immer auf Deutsch, persönlich (du-Form), konkret mit echten Zahlen. Sei motivierend aber ehrlich.`;

// FIX 3: Robustes JSON parsing
function extractJSON(text: string): string {
  // Remove markdown code blocks
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) return blockMatch[1];

  // Find first [ ... ] array
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  // Find first { ... } object
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];

  return text.trim();
}

function validateParsedItems(items: unknown[]): ParsedMealItem[] {
  const MAX_SINGLE_CALORIES = 3000;
  const MAX_AMOUNT_G = 2000;

  return items
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      name: String(item.name ?? 'Unbekannt'),
      amount_g: Math.min(Math.max(Number(item.amount_g) || 100, 1), MAX_AMOUNT_G),
      unit: String(item.unit ?? 'g'),
      calories: Math.min(Math.max(Number(item.calories) || 0, 0), MAX_SINGLE_CALORIES),
      protein_g: Math.max(Number(item.protein_g) || 0, 0),
      carbs_g: Math.max(Number(item.carbs_g) || 0, 0),
      fat_g: Math.max(Number(item.fat_g) || 0, 0),
      confidence: Math.min(Math.max(Number(item.confidence) || 0.7, 0), 1),
    }))
    .filter((item) => item.name !== 'Unbekannt' && item.calories >= 0);
}

// FIX 3: Built-in fallback for when backend has no API key
const FALLBACK_FOODS: Record<string, ParsedMealItem> = {
  ei: { name: 'Hühnerei', amount_g: 55, unit: '1 Stück', calories: 85, protein_g: 7.2, carbs_g: 0.6, fat_g: 6.1, confidence: 0.9 },
  eier: { name: 'Hühnerei', amount_g: 110, unit: '2 Stück', calories: 170, protein_g: 14.3, carbs_g: 1.2, fat_g: 12.1, confidence: 0.9 },
  toast: { name: 'Toastbrot', amount_g: 30, unit: '1 Scheibe', calories: 80, protein_g: 2.4, carbs_g: 14.7, fat_g: 1.1, confidence: 0.8 },
  hähnchen: { name: 'Hähnchenbrust', amount_g: 150, unit: '1 Portion', calories: 248, protein_g: 46.5, carbs_g: 0, fat_g: 5.4, confidence: 0.85 },
  reis: { name: 'Reis, gegart', amount_g: 200, unit: '1 Portion', calories: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.6, confidence: 0.85 },
  banane: { name: 'Banane', amount_g: 120, unit: '1 Stück', calories: 107, protein_g: 1.3, carbs_g: 27.6, fat_g: 0.4, confidence: 0.9 },
  avocado: { name: 'Avocado', amount_g: 100, unit: 'halbe', calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15, confidence: 0.8 },
  cappuccino: { name: 'Cappuccino', amount_g: 200, unit: '1 Tasse', calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3, confidence: 0.85 },
};

function localFallbackParse(input: string): ParsedMealItem[] {
  const lower = input.toLowerCase();
  const results: ParsedMealItem[] = [];
  for (const [keyword, item] of Object.entries(FALLBACK_FOODS)) {
    if (lower.includes(keyword)) {
      results.push({ ...item });
    }
  }
  return results;
}

export async function parseMeal(rawInput: string): Promise<ParsedMealItem[]> {
  const cacheKey = rawInput.toLowerCase().trim();
  const cached = mealParseCache.get(cacheKey);
  if (cached) return cached;

  // FIX 3: Check for API key upfront
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('REPLACE')) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — using local fallback parser');
    const fallback = localFallbackParse(rawInput);
    if (fallback.length > 0) return fallback;
    throw new Error('KI nicht verfügbar. Bitte ANTHROPIC_API_KEY in backend/.env setzen.');
  }

  try {
    console.log(`🤖 Parsing meal: "${rawInput.substring(0, 60)}..."`);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: MEAL_PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawInput }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

    console.log(`🤖 Raw response: ${content.text.substring(0, 200)}`);

    const jsonText = extractJSON(content.text);
    const rawParsed = JSON.parse(jsonText);

    if (!Array.isArray(rawParsed)) {
      throw new Error(`Expected JSON array, got: ${typeof rawParsed}`);
    }

    const validated = validateParsedItems(rawParsed);
    if (validated.length === 0) {
      throw new Error('KI hat keine Lebensmittel erkannt. Bitte genauer beschreiben.');
    }

    // Try to match each item to DB for food_id
    const itemsWithIds = await Promise.all(
      validated.map(async (item) => {
        try {
          const results = await foodService.searchFoods(item.name, 1);
          if (results.length > 0 && (item.confidence ?? 0.7) >= 0.6) {
            return { ...item, food_id: results[0].id };
          }
        } catch {}
        return item;
      })
    );

    mealParseCache.set(cacheKey, itemsWithIds);
    console.log(`✅ Parsed ${itemsWithIds.length} items`);
    return itemsWithIds;

  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Meal parse error:', err.message);

    // FIX 3: Fallback to local parser on error
    const fallback = localFallbackParse(rawInput);
    if (fallback.length > 0) {
      console.log(`⚡ Using local fallback: ${fallback.length} items`);
      return fallback;
    }

    // Re-throw with user-friendly message
    if (err.message.includes('API key')) {
      throw new Error('API-Key fehlt. Bitte ANTHROPIC_API_KEY in backend/.env eintragen.');
    }
    if (err.message.includes('JSON')) {
      throw new Error('KI-Antwort konnte nicht verarbeitet werden. Bitte erneut versuchen.');
    }
    throw new Error(err.message || 'KI-Analyse fehlgeschlagen. Bitte erneut versuchen.');
  }
}

export async function getDailyInsight(
  userId: string,
  profile: UserProfile,
  summary: DailySummary
): Promise<DailyInsight> {
  const today = new Date().toISOString().split('T')[0];

  // Check DB cache
  const cached = await pool.query(
    'SELECT content FROM daily_insights WHERE user_id = $1 AND insight_date = $2',
    [userId, today]
  );
  if (cached.rows.length > 0) {
    return cached.rows[0].content as DailyInsight;
  }

  const calorieGoal = profile.calorie_target ?? 2000;
  const proteinGoal = profile.protein_target_g ?? 150;
  const calorieProgress = Math.round((summary.total_calories / calorieGoal) * 100);
  const proteinProgress = Math.round((summary.total_protein_g / proteinGoal) * 100);
  const remaining = calorieGoal - Math.round(summary.total_calories);

  const mealBreakdown = Object.entries(
    summary.entries.reduce((acc: Record<string, number>, e) => {
      acc[e.meal_type] = (acc[e.meal_type] ?? 0) + Number(e.calories);
      return acc;
    }, {})
  ).map(([t, k]) => `${t}: ${Math.round(k as number)} kcal`).join(', ');

  const prompt = `Analysiere diese Ernährungsdaten und erstelle 3 kurze, persönliche Coaching-Insights:

HEUTE (${new Date().toLocaleDateString('de-DE')}):
- Kalorien: ${Math.round(summary.total_calories)} / ${calorieGoal} kcal (${calorieProgress}%)
- Protein: ${Math.round(summary.total_protein_g)} / ${proteinGoal}g (${proteinProgress}%)
- Kohlenhydrate: ${Math.round(summary.total_carbs_g)}g | Fett: ${Math.round(summary.total_fat_g)}g
- Verbleibend: ${remaining > 0 ? remaining + ' kcal' : 'Ziel überschritten um ' + Math.abs(remaining) + ' kcal'}
- Mahlzeiten: ${summary.entries.length} Einträge${mealBreakdown ? ' (' + mealBreakdown + ')' : ''}
- Ziel: ${profile.goal === 'lose' ? 'Abnehmen' : profile.goal === 'gain' ? 'Zunehmen' : 'Gewicht halten'}

Antworte mit GENAU diesem JSON-Format:
{"insights":[{"emoji":"🎯","title":"Titel max 45 Zeichen","message":"Konkrete Nachricht mit echten Zahlen, 1-2 Sätze.","priority":"high"},{"emoji":"💪","title":"...","message":"...","priority":"medium"},{"emoji":"💡","title":"...","message":"...","priority":"low"}],"summary":"Ein Satz Zusammenfassung"}`;

  // FIX 3: Fallback insight when no API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('REPLACE')) {
    const fallback = buildFallbackInsight(summary, calorieGoal, proteinGoal, calorieProgress);
    await saveDailyInsight(userId, today, fallback);
    return fallback;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: COACHING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Bad response');

    const jsonText = extractJSON(content.text);
    const insight = JSON.parse(jsonText) as DailyInsight;

    await saveDailyInsight(userId, today, insight);
    return insight;

  } catch (error) {
    console.error('Coaching error:', error);
    const fallback = buildFallbackInsight(summary, calorieGoal, proteinGoal, calorieProgress);
    await saveDailyInsight(userId, today, fallback);
    return fallback;
  }
}

function buildFallbackInsight(
  summary: DailySummary,
  calorieGoal: number,
  proteinGoal: number,
  calorieProgress: number
): DailyInsight {
  const insights: DailyInsight['insights'] = [];
  const remaining = calorieGoal - Math.round(summary.total_calories);

  if (calorieProgress < 50) {
    insights.push({
      emoji: '⚠️',
      title: 'Wenig gegessen heute',
      message: `Du hast erst ${Math.round(summary.total_calories)} von ${calorieGoal} kcal gegessen. Denk an eine Mahlzeit!`,
      priority: 'high',
    });
  } else if (calorieProgress >= 90 && calorieProgress <= 110) {
    insights.push({
      emoji: '🎯',
      title: 'Kalorienziel fast erreicht!',
      message: `${Math.round(summary.total_calories)} / ${calorieGoal} kcal — du bist sehr nah am Ziel.`,
      priority: 'high',
    });
  } else if (calorieProgress > 110) {
    insights.push({
      emoji: '⚡',
      title: 'Kalorienziel überschritten',
      message: `Du hast ${Math.abs(remaining)} kcal mehr als geplant gegessen.`,
      priority: 'high',
    });
  } else {
    insights.push({
      emoji: '📊',
      title: `${calorieProgress}% des Kalorienziels`,
      message: `Noch ${remaining} kcal verbleiben heute.`,
      priority: 'medium',
    });
  }

  const proteinPct = Math.round((summary.total_protein_g / proteinGoal) * 100);
  if (proteinPct < 70) {
    insights.push({
      emoji: '🥩',
      title: 'Protein nachbessern',
      message: `${Math.round(summary.total_protein_g)}g / ${proteinGoal}g Protein (${proteinPct}%). Quark, Ei oder Hähnchen helfen.`,
      priority: 'medium',
    });
  } else {
    insights.push({
      emoji: '💪',
      title: 'Gute Protein-Versorgung',
      message: `${Math.round(summary.total_protein_g)}g Protein — ${proteinPct}% deines Tagesziels erreicht.`,
      priority: 'medium',
    });
  }

  insights.push({
    emoji: '💡',
    title: 'Tipp: KI-Coaching aktivieren',
    message: 'Trage deinen Anthropic API-Key in backend/.env ein um personalisierte Insights zu erhalten.',
    priority: 'low',
  });

  return { insights, summary: `Heute ${calorieProgress}% des Kalorienziels erreicht.` };
}

async function saveDailyInsight(userId: string, date: string, insight: DailyInsight): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO daily_insights (user_id, insight_date, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, insight_date) DO UPDATE SET content = $3`,
      [userId, date, JSON.stringify(insight)]
    );
  } catch (e) {
    console.error('Failed to save insight:', e);
  }
}
