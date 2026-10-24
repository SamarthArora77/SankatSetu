import * as alertService from '../services/alert.service';
import { serializeAlert } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const listActiveAlerts = asyncHandler(async (_req, res) => {
  const alerts = await alertService.listActiveAlerts(20);
  sendSuccess(res, 'Active alerts loaded.', { alerts: alerts.map(serializeAlert) });
});
