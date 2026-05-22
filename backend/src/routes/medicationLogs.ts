import { Router } from 'express';
import { getMedicationLogs, createMedicationLog, updateMedicationLog, deleteMedicationLog } from '../controllers/medicationLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMedicationLogs);
router.post('/', createMedicationLog);
router.patch('/:id', updateMedicationLog);
router.delete('/:id', deleteMedicationLog);

export default router;
