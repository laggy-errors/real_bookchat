import { Router } from 'express';
import { attachmentController } from '../controllers/attachment.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/upload', attachmentController.upload);

export const attachmentRoutes = router;
