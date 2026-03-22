import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as foodController from '../controllers/foodController';

const router = Router();

router.get('/search', foodController.searchFoods);
router.get('/barcode/:barcode', foodController.getFoodByBarcode);
router.post('/', authenticate, foodController.createFood);

export default router;
