import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as aiController from '../controllers/aiController';

const router = Router();

router.post('/parse-meal', authenticate, aiController.parseMeal);
router.get('/daily-insight', authenticate, aiController.getDailyInsight);

export default router;
