import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/aiService';
import * as logService from '../services/logService';
import * as onboardingService from '../services/onboardingService';

export async function parseMeal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 2) {
      res.status(400).json({ error: 'Mahlzeit-Text erforderlich' });
      return;
    }
    const items = await aiService.parseMeal(text);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getDailyInsight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [profile, summary] = await Promise.all([
      onboardingService.getProfile(req.user!.userId),
      logService.getDailySummary(req.user!.userId, today),
    ]);

    if (!profile) {
      res.status(404).json({ error: 'Profil nicht gefunden' });
      return;
    }

    const insight = await aiService.getDailyInsight(req.user!.userId, profile, summary);
    res.json(insight);
  } catch (error) {
    next(error);
  }
}
