import { Request, Response, NextFunction } from 'express';
import * as onboardingService from '../services/onboardingService';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await onboardingService.getProfile(req.user!.userId);
    res.json(profile ?? { user_id: req.user!.userId, onboarding_done: false });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await onboardingService.saveProfile(req.user!.userId, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function calculateTargets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gender, weight_kg, height_cm, birth_year, activity_level, goal, weekly_change_kg } = req.body;

    if (!gender || !weight_kg || !height_cm || !birth_year || !activity_level || !goal) {
      res.status(400).json({ error: 'Alle Körperdaten erforderlich' });
      return;
    }

    const tdee = onboardingService.calculateTDEE(gender, weight_kg, height_cm, birth_year, activity_level);
    const macros = onboardingService.calculateMacros(tdee, goal, weight_kg, weekly_change_kg ?? 0.5);

    res.json(macros);
  } catch (error) {
    next(error);
  }
}
