import * as adminService from '../services/admin.service';
import * as alertService from '../services/alert.service';
import { serializeAlert, serializeAuditLog, serializeUser } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';

export const listUsers = asyncHandler(async (req, res) => {
  const { users, total, page, limit } = await adminService.listUsers(req.query as never);
  sendSuccess(res, 'Users loaded.', {
    users: users.map(serializeUser),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const user = await adminService.createUser(req.body, actor);
  sendSuccess(res, 'User created.', { user: serializeUser(user) }, 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const user = await adminService.updateUser(req.params.id, req.body, actor);
  sendSuccess(res, 'User updated.', { user: serializeUser(user) });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { logs, total, page, limit } = await adminService.listAuditLogs(req.query as never);
  sendSuccess(res, 'Audit trail loaded.', {
    auditLogs: logs.map(serializeAuditLog),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const createAlert = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const alert = await alertService.createAlert(req.body, actor);
  sendSuccess(res, 'Emergency alert broadcast.', { alert: serializeAlert(alert) }, 201);
});

export const listAlerts = asyncHandler(async (req, res) => {
  const { alerts, total, page, limit } = await alertService.listAlerts(req.query as never);
  sendSuccess(res, 'Alerts loaded.', {
    alerts: alerts.map(serializeAlert),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const stats = asyncHandler(async (_req, res) => {
  const data = await adminService.getAdminStats();
  sendSuccess(res, 'Operational statistics loaded.', data);
});
