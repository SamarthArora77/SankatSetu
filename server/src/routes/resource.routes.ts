import { Router } from 'express';
import * as resourceController from '../controllers/resource.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createResourceSchema,
  dispatchResourceSchema,
  resourceIdParamSchema,
  resourceListQuerySchema,
  updateResourceSchema,
} from '../schemas/resource.schema';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'NGO', 'RESPONDER'), validate(resourceListQuerySchema, 'query'), resourceController.listResources);
router.post('/', authenticate, authorize('NGO', 'ADMIN'), validate(createResourceSchema), resourceController.createResource);
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'NGO', 'RESPONDER'),
  validate(resourceIdParamSchema, 'params'),
  resourceController.getResource,
);
router.patch(
  '/:id',
  authenticate,
  authorize('NGO', 'ADMIN'),
  validate(resourceIdParamSchema, 'params'),
  validate(updateResourceSchema),
  resourceController.updateResource,
);
router.post(
  '/:id/dispatch',
  authenticate,
  authorize('NGO', 'ADMIN'),
  validate(resourceIdParamSchema, 'params'),
  validate(dispatchResourceSchema),
  resourceController.dispatchResource,
);

export default router;
