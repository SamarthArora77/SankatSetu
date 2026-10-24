import { Router } from 'express';
import adminRoutes from './admin.routes';
import alertRoutes from './alert.routes';
import authRoutes from './auth.routes';
import campRoutes from './camp.routes';
import donationRoutes from './donation.routes';
import emergencyRoutes from './emergency.routes';
import healthRoutes from './health.routes';
import missionRoutes from './mission.routes';
import notificationRoutes from './notification.routes';
import resourceRoutes from './resource.routes';
import responderRoutes from './responder.routes';
import uploadRoutes from './upload.routes';
import volunteerRoutes from './volunteer.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/emergencies', emergencyRoutes);
router.use('/missions', missionRoutes);
router.use('/responders', responderRoutes);
router.use('/resources', resourceRoutes);
router.use('/camps', campRoutes);
router.use('/donations', donationRoutes);
router.use('/volunteer-tasks', volunteerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use(alertRoutes);
router.use(adminRoutes);

export default router;
