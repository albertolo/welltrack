import { Router } from 'express';
import { getSymptomLogs, createSymptomLog, updateSymptomLog, deleteSymptomLog } from '../controllers/symptomLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSymptomLogs);
router.post('/', createSymptomLog);
router.patch('/:id', updateSymptomLog);
router.delete('/:id', deleteSymptomLog);

export default router;
