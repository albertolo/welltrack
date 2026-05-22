import { Router } from 'express';
import { getHabitLogs, createHabitLog, updateHabitLog, deleteHabitLog } from '../controllers/habitLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getHabitLogs);
router.post('/', createHabitLog);
router.patch('/:id', updateHabitLog);
router.delete('/:id', deleteHabitLog);

export default router;
