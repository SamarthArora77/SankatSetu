import { Router } from 'express';
import * as missionController from '../controllers/mission.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  assignMissionSchema,
  claimMissionSchema,
  claimMissionParamSchema,
  missionIdParamSchema,
  missionListQuerySchema,
  missionStatusUpdateSchema,
} from '../schemas/mission.schema';

const router = Router();

router.post(
  '/assign',
  authenticate,
  authorize('ADMIN'),
  validate(assignMissionSchema),
  missionController.assignMission,
);

router.post(
  '/:emergencyId/claim',
  authenticate,
  authorize('RESPONDER'),
  validate(claimMissionParamSchema, 'params'),
  validate(claimMissionSchema),
  missionController.claimMission,
);

router.get('/my', authenticate, authorize('RESPONDER'), missionController.listMyMissions);
router.get('/', authenticate, authorize('ADMIN'), validate(missionListQuerySchema, 'query'), missionController.listMissions);
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'RESPONDER'),
  validate(missionIdParamSchema, 'params'),
  missionController.getMission,
);
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'RESPONDER'),
  validate(missionIdParamSchema, 'params'),
  validate(missionStatusUpdateSchema),
  missionController.updateMissionStatus,
);

export default router;
