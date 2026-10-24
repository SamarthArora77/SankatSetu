import * as volunteerService from '../services/volunteer.service';
import { serializeTask } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser, requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';

export const createVolunteerTask = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const task = await volunteerService.createVolunteerTask(req.body, actor);
  sendSuccess(res, 'Volunteer task created.', { task: serializeTask(task) }, 201);
});

export const listVolunteerTasks = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { tasks, total, page, limit } = await volunteerService.listVolunteerTasks(
    req.query as never,
    user?.id,
  );
  sendSuccess(res, 'Volunteer tasks loaded.', {
    tasks: tasks.map((task) => serializeTask(task, user?.id)),
    pagination: paginationMeta(total, { page, limit, skip: ((page ?? 1) - 1) * (limit ?? 20) }),
  });
});

export const listMyVolunteerTasks = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const { tasks, total } = await volunteerService.listVolunteerTasks(
    { ...(req.query as object), mine: true, page, limit },
    actor.id,
  );
  sendSuccess(res, 'Your volunteer tasks loaded.', {
    tasks: tasks.map((task) => serializeTask(task, actor.id)),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const getVolunteerTask = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const task = await volunteerService.getVolunteerTask(req.params.id);
  sendSuccess(res, 'Volunteer task loaded.', { task: serializeTask(task, user?.id) });
});

export const joinVolunteerTask = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const task = await volunteerService.joinVolunteerTask(req.params.id, actor.id);
  sendSuccess(res, 'Joined volunteer task.', { task: serializeTask(task, actor.id) });
});

export const checkInVolunteerTask = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const task = await volunteerService.checkInVolunteerTask(req.params.id, actor.id);
  sendSuccess(res, 'Checked in to volunteer task.', { task: serializeTask(task, actor.id) });
});

export const checkOutVolunteerTask = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const task = await volunteerService.checkOutVolunteerTask(req.params.id, actor.id);
  sendSuccess(res, 'Checked out of volunteer task.', { task: serializeTask(task, actor.id) });
});

export const updateVolunteerTaskStatus = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const task = await volunteerService.updateVolunteerTaskStatus(req.params.id, req.body.status, actor);
  sendSuccess(res, 'Volunteer task status updated.', { task: serializeTask(task) });
});
