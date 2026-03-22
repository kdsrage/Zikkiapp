import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as profileController from '../controllers/profileController';

const router = Router();

router.get('/', authenticate, profileController.getProfile);
router.put('/', authenticate, profileController.updateProfile);
router.post('/calculate', profileController.calculateTargets);

export default router;
