import { Router } from 'express';
import * as donationController from '../controllers/donation.controller';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { trackLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  createDonationSchema,
  donationEventSchema,
  donationIdParamSchema,
  donationListQuerySchema,
  trackingParamSchema,
} from '../schemas/donation.schema';

const router = Router();

router.post('/', optionalAuthenticate, validate(createDonationSchema), donationController.createDonation);
router.get('/', authenticate, authorize('ADMIN', 'NGO', 'DONOR'), validate(donationListQuerySchema, 'query'), donationController.listDonations);
router.get(
  '/track/:trackingId',
  trackLimiter,
  optionalAuthenticate,
  validate(trackingParamSchema, 'params'),
  donationController.trackDonation,
);
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'NGO'),
  validate(donationIdParamSchema, 'params'),
  donationController.getDonation,
);
router.post(
  '/:id/events',
  authenticate,
  authorize('ADMIN', 'NGO'),
  validate(donationIdParamSchema, 'params'),
  validate(donationEventSchema),
  donationController.appendDonationEvent,
);

export default router;
