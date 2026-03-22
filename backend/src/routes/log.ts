import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as logController from '../controllers/logController';

const router = Router();

router.get('/', authenticate, logController.getDailySummary);
router.post('/', authenticate, logController.addEntry);
router.post('/bulk', authenticate, logController.addMultipleEntries);
router.delete('/:id', authenticate, logController.deleteEntry);
router.get('/week', authenticate, logController.getWeekHistory);

export default router;
