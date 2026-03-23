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
    const { gender, activity_level, goal } = req.body;
    const weight_kg = Number(req.body.weight_kg);
    const height_cm = Number(req.body.height_cm);
    const birth_year = Number(req.body.birth_year);
    const weekly_change_kg = req.body.weekly_change_kg != null ? Number(req.body.weekly_change_kg) : 0.5;

    if (!gender || !activity_level || !goal ||
        !weight_kg || !height_cm || !birth_year ||
        isNaN(weight_kg) || isNaN(height_cm) || isNaN(birth_year)) {
      res.status(400).json({ error: 'Alle Körperdaten erforderlich' });
      return;
    }

    const tdee = onboardingService.calculateTDEE(gender, weight_kg, height_cm, birth_year, activity_level);
    const macros = onboardingService.calculateMacros(tdee, goal, weight_kg, weekly_change_kg);

    res.json(macros);
  } catch (error) {
    next(error);
  }
}
