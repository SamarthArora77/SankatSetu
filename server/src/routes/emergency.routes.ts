import { Router } from 'express';
import * as emergencyController from '../controllers/emergency.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { aiLimiter, publicReportLimiter, trackLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  createEmergencySchema,
  emergencyIdParamSchema,
  emergencyStatusUpdateSchema,
  emergencyVerificationSchema,
  listEmergencyQuerySchema,
  nearbyEmergencyQuerySchema,
  ticketParamSchema,
} from '../schemas/emergency.schema';

const router = Router();

router.post(
  '/',
  publicReportLimiter,
  optionalAuthenticate,
  validate(createEmergencySchema),
  emergencyController.createEmergency,
);

router.get('/', optionalAuthenticate, validate(listEmergencyQuerySchema, 'query'), emergencyController.listEmergencies);

router.get(
  '/nearby',
  validate(nearbyEmergencyQuerySchema, 'query'),
  emergencyController.listNearbyEmergencies,
);

router.get(
  '/ticket/:ticketId',
  trackLimiter,
  optionalAuthenticate,
  validate(ticketParamSchema, 'params'),
  emergencyController.getEmergencyByTicket,
);

router.get(
  '/:id',
  optionalAuthenticate,
  validate(emergencyIdParamSchema, 'params'),
  emergencyController.getEmergency,
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'RESPONDER'),
  validate(emergencyIdParamSchema, 'params'),
  validate(emergencyStatusUpdateSchema),
  emergencyController.updateEmergencyStatus,
);

router.patch(
  '/:id/verification',
  authenticate,
  authorize('ADMIN'),
  validate(emergencyIdParamSchema, 'params'),
  validate(emergencyVerificationSchema),
  emergencyController.verifyEmergency,
);

router.post(
  '/:id/analyze',
  authenticate,
  authorize('ADMIN', 'RESPONDER'),
  aiLimiter,
  validate(emergencyIdParamSchema, 'params'),
  emergencyController.analyzeEmergency,
);

export default router;
