import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as weightController from '../controllers/weightController';

const router = Router();

router.post('/', authenticate, weightController.logWeight);
router.get('/', authenticate, weightController.getHistory);
router.delete('/:id', authenticate, weightController.deleteLog);

export default router;
