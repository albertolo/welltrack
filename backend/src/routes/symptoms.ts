import { Router } from 'express';
import { getSymptoms, createSymptom, updateSymptom, deleteSymptom } from '../controllers/symptomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSymptoms);
router.post('/', createSymptom);
router.patch('/:id', updateSymptom);
router.delete('/:id', deleteSymptom);

export default router;
