import { Request, Response, NextFunction } from 'express';
import * as weightService from '../services/weightService';

export async function logWeight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { weight_kg, date, notes } = req.body;
    if (!weight_kg) {
      res.status(400).json({ error: 'weight_kg erforderlich' });
      return;
    }
    const log = await weightService.logWeight(req.user!.userId, weight_kg, date, notes);
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const history = await weightService.getWeightHistory(req.user!.userId, days);
    const trend = weightService.calculateTrend(history);
    res.json({ history, trend });
  } catch (error) {
    next(error);
  }
}

export async function deleteLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await weightService.deleteWeightLog(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
