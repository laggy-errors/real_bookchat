import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { bookController } from '../controllers/book.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookSchema, bookIdParamSchema, joinBookSchema } from '../validators/book.validator';

const joinBookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 attempts per 15 minutes to prevent guessing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many attempts to join a book. Please try again after 15 minutes.',
    errorCode: 'TOO_MANY_JOIN_ATTEMPTS',
  },
});

const router = Router();

// Books and details are protected, requiring authentication to verify membership/identity
router.get('/', authMiddleware, bookController.listBooks);
router.get('/mine', authMiddleware, bookController.listMyBooks);
router.get('/:bookId', authMiddleware, validate(bookIdParamSchema), bookController.getBook);
router.patch('/:bookId', authMiddleware, validate(bookIdParamSchema), bookController.updateBook);
router.delete('/:bookId', authMiddleware, validate(bookIdParamSchema), bookController.deleteBook);

router.post('/', authMiddleware, validate(createBookSchema), bookController.createBook);
router.post('/join', authMiddleware, joinBookLimiter, validate(joinBookSchema), bookController.joinBook);
router.get('/:bookId/visible-members', authMiddleware, validate(bookIdParamSchema), bookController.getVisibleMembers);

// Visibility grants routes
router.get('/:bookId/visibility-grants', authMiddleware, validate(bookIdParamSchema), bookController.listVisibilityGrants);
router.post('/:bookId/visibility-grants', authMiddleware, validate(bookIdParamSchema), bookController.createVisibilityGrant);
router.delete('/:bookId/visibility-grants/:grantId', authMiddleware, bookController.deleteVisibilityGrant);

// Member nickname and removal routes
router.delete('/:bookId/members/:userId', authMiddleware, bookController.removeMember);
router.post('/:bookId/members/:userId/nickname', authMiddleware, bookController.updateNickname);
router.delete('/:bookId/leave', authMiddleware, validate(bookIdParamSchema), bookController.leaveBook);
router.post('/:bookId/leave', authMiddleware, validate(bookIdParamSchema), bookController.leaveBook);

export const bookRoutes = router;
