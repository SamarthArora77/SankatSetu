import { Router } from 'express';
import * as volunteerController from '../controllers/volunteer.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createVolunteerTaskSchema,
  volunteerTaskIdParamSchema,
  volunteerTaskListQuerySchema,
  volunteerTaskStatusSchema,
} from '../schemas/volunteer.schema';

const router = Router();

router.get('/', optionalAuthenticate, validate(volunteerTaskListQuerySchema, 'query'), volunteerController.listVolunteerTasks);
router.get('/mine', authenticate, authorize('VOLUNTEER'), volunteerController.listMyVolunteerTasks);
router.post('/', authenticate, authorize('ADMIN', 'NGO'), validate(createVolunteerTaskSchema), volunteerController.createVolunteerTask);
router.get(
  '/:id',
  optionalAuthenticate,
  validate(volunteerTaskIdParamSchema, 'params'),
  volunteerController.getVolunteerTask,
);
router.post(
  '/:id/join',
  authenticate,
  authorize('VOLUNTEER'),
  validate(volunteerTaskIdParamSchema, 'params'),
  volunteerController.joinVolunteerTask,
);
router.patch(
  '/:id/check-in',
  authenticate,
  authorize('VOLUNTEER'),
  validate(volunteerTaskIdParamSchema, 'params'),
  volunteerController.checkInVolunteerTask,
);
router.patch(
  '/:id/check-out',
  authenticate,
  authorize('VOLUNTEER'),
  validate(volunteerTaskIdParamSchema, 'params'),
  volunteerController.checkOutVolunteerTask,
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'NGO'),
  validate(volunteerTaskIdParamSchema, 'params'),
  validate(volunteerTaskStatusSchema),
  volunteerController.updateVolunteerTaskStatus,
);

export default router;
