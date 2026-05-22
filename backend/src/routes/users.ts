import { Router } from 'express';
import { getMe, updateMe, deleteMe } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.delete('/me', deleteMe);

export default router;
