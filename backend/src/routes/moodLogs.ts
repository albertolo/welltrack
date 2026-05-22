import { Router } from 'express';
import { getMoodLogs, createMoodLog, updateMoodLog, deleteMoodLog } from '../controllers/moodLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMoodLogs);
router.post('/', createMoodLog);
router.patch('/:id', updateMoodLog);
router.delete('/:id', deleteMoodLog);

export default router;
