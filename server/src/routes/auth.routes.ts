import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.get('/me', authenticate, authController.me);
router.post('/logout', optionalAuthenticate, authController.logout);

export default router;
