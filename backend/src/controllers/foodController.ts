import { Request, Response, NextFunction } from 'express';
import * as foodService from '../services/foodService';

export async function searchFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const foods = await foodService.searchFoods(query, limit);
    res.json(foods);
  } catch (error) {
    next(error);
  }
}

export async function getFoodByBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { barcode } = req.params;
    const food = await foodService.getFoodByBarcode(barcode);
    if (!food) {
      res.status(404).json({ error: 'Produkt nicht gefunden' });
      return;
    }
    res.json(food);
  } catch (error) {
    next(error);
  }
}

export async function createFood(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const food = await foodService.createFood(req.body, req.user?.userId);
    res.status(201).json(food);
  } catch (error) {
    next(error);
  }
}
