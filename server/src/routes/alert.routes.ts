import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';

const router = Router();

router.get('/alerts', alertController.listActiveAlerts);

export default router;
