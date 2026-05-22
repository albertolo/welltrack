import { Router } from 'express';
import { getMedications, createMedication, updateMedication, deleteMedication } from '../controllers/medicationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMedications);
router.post('/', createMedication);
router.patch('/:id', updateMedication);
router.delete('/:id', deleteMedication);

export default router;
