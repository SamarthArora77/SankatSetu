import { Router } from 'express';
import * as uploadController from '../controllers/upload.controller';
import { optionalAuthenticate } from '../middleware/authenticate';
import { uploadLimiter } from '../middleware/rateLimit';
import { uploadSingleFile } from '../middleware/upload';

const router = Router();

router.post('/', uploadLimiter, optionalAuthenticate, uploadSingleFile, uploadController.uploadFile);

export default router;
