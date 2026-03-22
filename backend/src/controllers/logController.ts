import { Request, Response, NextFunction } from 'express';
import * as logService from '../services/logService';

export async function getDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = (req.query.date as string) ?? new Date().toISOString().split('T')[0];
    const summary = await logService.getDailySummary(req.user!.userId, date);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function addEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = await logService.addEntry(req.user!.userId, req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

export async function addMultipleEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      res.status(400).json({ error: 'entries array required' });
      return;
    }
    const result = await logService.addMultipleEntries(req.user!.userId, entries);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await logService.deleteEntry(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getWeekHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const history = await logService.getWeekHistory(req.user!.userId);
    res.json(history);
  } catch (error) {
    next(error);
  }
}
