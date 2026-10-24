import { Router } from 'express';
import * as campController from '../controllers/camp.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  campIdParamSchema,
  campListQuerySchema,
  campOccupancySchema,
  createCampSchema,
  updateCampSchema,
} from '../schemas/camp.schema';

const router = Router();

router.get('/', optionalAuthenticate, validate(campListQuerySchema, 'query'), campController.listCamps);
router.get('/:id', optionalAuthenticate, validate(campIdParamSchema, 'params'), campController.getCamp);
router.post('/', authenticate, authorize('ADMIN'), validate(createCampSchema), campController.createCamp);
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(campIdParamSchema, 'params'),
  validate(updateCampSchema),
  campController.updateCamp,
);
router.patch(
  '/:id/occupancy',
  authenticate,
  authorize('ADMIN'),
  validate(campIdParamSchema, 'params'),
  validate(campOccupancySchema),
  campController.updateCampOccupancy,
);

export default router;
