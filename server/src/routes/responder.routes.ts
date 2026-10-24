import { Router } from 'express';
import * as responderController from '../controllers/responder.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  responderIdParamSchema,
  responderListQuerySchema,
  responderLocationSchema,
  responderNearbyQuerySchema,
  responderStatusSchema,
} from '../schemas/responder.schema';

const router = Router();

router.get('/', optionalAuthenticate, validate(responderListQuerySchema, 'query'), responderController.listResponders);
router.get(
  '/nearby',
  validate(responderNearbyQuerySchema, 'query'),
  responderController.listNearbyResponders,
);
router.get('/me', authenticate, authorize('RESPONDER'), responderController.getMyProfile);
router.patch(
  '/me/location',
  authenticate,
  authorize('RESPONDER'),
  validate(responderLocationSchema),
  responderController.updateMyLocation,
);
router.patch(
  '/me/status',
  authenticate,
  authorize('RESPONDER'),
  validate(responderStatusSchema),
  responderController.updateMyStatus,
);
router.get(
  '/:id',
  optionalAuthenticate,
  validate(responderIdParamSchema, 'params'),
  responderController.getResponder,
);

export default router;
