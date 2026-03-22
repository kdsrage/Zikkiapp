import axios from 'axios';
import pool from '../config/db';
import { Food } from '../types';

export async function searchFoods(query: string, limit = 20): Promise<Food[]> {
  if (!query || query.trim().length < 2) return [];

  const result = await pool.query<Food>(
    `SELECT *,
       GREATEST(
         similarity(name, $1),
         COALESCE(similarity(brand, $1), 0)
       ) AS sim
     FROM foods
     WHERE name % $1
       OR brand % $1
       OR name ILIKE '%' || $1 || '%'
     ORDER BY verified DESC, sim DESC, use_count DESC
     LIMIT $2`,
    [query.trim(), limit]
  );

  return result.rows;
}

export async function getFoodById(id: string): Promise<Food | null> {
  const result = await pool.query<Food>('SELECT * FROM foods WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  // Check own DB first
  const local = await pool.query<Food>('SELECT * FROM foods WHERE barcode = $1', [barcode]);
  if (local.rows.length > 0) return local.rows[0];

  // Fallback to OpenFoodFacts
  return fetchFromOpenFoodFacts(barcode);
}

export async function fetchFromOpenFoodFacts(barcode: string): Promise<Food | null> {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { timeout: 5000 }
    );

    const data = response.data;
    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    const n = product.nutriments ?? {};

    const food: Partial<Food> & { barcode: string; source: string; verified: boolean } = {
      barcode,
      name: product.product_name_de || product.product_name || 'Unbekanntes Produkt',
      brand: product.brands || undefined,
      calories_per_100g: parseFloat(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) || 0,
      protein_per_100g: parseFloat(n['proteins_100g'] ?? n['proteins'] ?? 0) || 0,
      carbs_per_100g: parseFloat(n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0) || 0,
      fat_per_100g: parseFloat(n['fat_100g'] ?? n['fat'] ?? 0) || 0,
      fiber_per_100g: parseFloat(n['fiber_100g'] ?? n['fiber'] ?? 0) || undefined,
      serving_size_g: parseFloat(product.serving_size) || undefined,
      source: 'openfoodfacts',
      verified: false,
    };

    // Save to our DB for future lookups
    const saved = await createFood(food as Omit<Food, 'id' | 'use_count' | 'created_at'>);
    return saved;
  } catch {
    return null;
  }
}

export async function createFood(
  data: Omit<Food, 'id' | 'use_count' | 'created_at'>,
  createdBy?: string
): Promise<Food> {
  const result = await pool.query<Food>(
    `INSERT INTO foods (barcode, name, brand, calories_per_100g, protein_per_100g,
       carbs_per_100g, fat_per_100g, fiber_per_100g, serving_size_g, serving_desc,
       source, verified, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (barcode) WHERE barcode IS NOT NULL
     DO UPDATE SET
       name = EXCLUDED.name,
       brand = EXCLUDED.brand,
       calories_per_100g = EXCLUDED.calories_per_100g,
       protein_per_100g = EXCLUDED.protein_per_100g,
       carbs_per_100g = EXCLUDED.carbs_per_100g,
       fat_per_100g = EXCLUDED.fat_per_100g
     RETURNING *`,
    [
      data.barcode ?? null,
      data.name,
      data.brand ?? null,
      data.calories_per_100g,
      data.protein_per_100g,
      data.carbs_per_100g,
      data.fat_per_100g,
      data.fiber_per_100g ?? null,
      data.serving_size_g ?? null,
      data.serving_desc ?? null,
      data.source ?? 'manual',
      data.verified ?? false,
      createdBy ?? null,
    ]
  );

  return result.rows[0];
}

export async function incrementUseCount(foodId: string): Promise<void> {
  await pool.query('UPDATE foods SET use_count = use_count + 1 WHERE id = $1', [foodId]);
}
