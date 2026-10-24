import type { FilterQuery } from 'mongoose';
import { VolunteerTask, type IVolunteerTask } from '../models/VolunteerTask';
import { VOLUNTEER_TASK_TRANSITIONS, type Role, type VolunteerTaskStatus } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/text';
import { recordAudit } from './audit.service';
import { notifyUser } from './notification.service';
import { emitToPublic, emitToRole, emitToUser } from './socket.service';
import { serializeTask } from '../serializers';
import type { CreateVolunteerTaskInput } from '../schemas/volunteer.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

function emitTaskUpdate(task: IVolunteerTask) {
  emitToPublic('volunteer-task:updated', serializeTask(task));
  emitToRole('VOLUNTEER', 'volunteer-task:updated', serializeTask(task));
  emitToRole('ADMIN', 'volunteer-task:updated', serializeTask(task));
  for (const assignment of task.assignedVolunteers) {
    emitToUser(
      assignment.volunteer.toString(),
      'volunteer-task:updated',
      serializeTask(task, assignment.volunteer.toString()),
    );
  }
}

export async function createVolunteerTask(input: CreateVolunteerTaskInput, actor: Actor) {
  const task = await VolunteerTask.create({
    title: input.title,
    description: input.description,
    category: input.category,
    urgency: input.urgency,
    location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    locationName: input.locationName,
    requiredVolunteers: input.requiredVolunteers,
    timeEstimate: input.timeEstimate,
    createdBy: actor.id,
  });

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'VOLUNTEER_TASK_CREATED',
    targetType: 'VolunteerTask',
    targetId: task.id,
    details: `Created task "${task.title}" for ${task.requiredVolunteers} volunteers.`,
    ip: actor.ip,
  });

  emitTaskUpdate(task);
  return task;
}

export async function getVolunteerTask(taskId: string): Promise<IVolunteerTask> {
  const task = await VolunteerTask.findById(taskId);
  if (!task) throw ApiError.notFound('Volunteer task not found.', 'TASK_NOT_FOUND');
  return task;
}

export async function listVolunteerTasks(
  query: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    urgency?: string;
    search?: string;
    mine?: boolean;
  },
  userId?: string,
) {
  const filter: FilterQuery<IVolunteerTask> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.urgency) filter.urgency = query.urgency;
  if (query.mine) {
    if (!userId) throw ApiError.unauthorized('Sign in to view the tasks you joined.');
    filter['assignedVolunteers.volunteer'] = userId;
  }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { locationName: pattern }];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [tasks, total] = await Promise.all([
    VolunteerTask.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    VolunteerTask.countDocuments(filter),
  ]);

  return { tasks, total, page, limit };
}

export async function joinVolunteerTask(taskId: string, volunteerId: string) {
  const joined = new Date();
  const task = await VolunteerTask.findOneAndUpdate(
    {
      _id: taskId,
      status: 'OPEN',
      'assignedVolunteers.volunteer': { $ne: volunteerId },
      $expr: { $lt: [{ $size: '$assignedVolunteers' }, '$requiredVolunteers'] },
    },
    { $push: { assignedVolunteers: { volunteer: volunteerId, joinedAt: joined } } },
    { new: true },
  );

  if (!task) {
    const existing = await VolunteerTask.findById(taskId);
    if (!existing) throw ApiError.notFound('Volunteer task not found.', 'TASK_NOT_FOUND');
    if (existing.assignedVolunteers.some((assignment) => assignment.volunteer.toString() === volunteerId)) {
      throw ApiError.conflict('You have already joined this task.', 'ALREADY_JOINED');
    }
    if (existing.assignedVolunteers.length >= existing.requiredVolunteers) {
      throw ApiError.conflict('This task already has enough volunteers.', 'TASK_FULL');
    }
    throw ApiError.conflict('This task is no longer open.', 'TASK_CLOSED');
  }

  await recordAudit({
    actor: { id: volunteerId, name: 'Volunteer' },
    action: 'VOLUNTEER_JOINED',
    targetType: 'VolunteerTask',
    targetId: task.id,
    details: `Volunteer joined "${task.title}".`,
  });

  emitTaskUpdate(task);
  return task;
}

export async function checkInVolunteerTask(taskId: string, volunteerId: string) {
  const task = await VolunteerTask.findOneAndUpdate(
    { _id: taskId, 'assignedVolunteers.volunteer': volunteerId },
    { $set: { 'assignedVolunteers.$[assignment].checkedInAt': new Date() } },
    { new: true, arrayFilters: [{ 'assignment.volunteer': volunteerId }] },
  );
  if (!task) throw ApiError.notFound('You are not assigned to this task.', 'NOT_ASSIGNED');
  emitTaskUpdate(task);
  return task;
}

export async function checkOutVolunteerTask(taskId: string, volunteerId: string) {
  const task = await VolunteerTask.findOneAndUpdate(
    { _id: taskId, 'assignedVolunteers.volunteer': volunteerId },
    { $set: { 'assignedVolunteers.$[assignment].checkedOutAt': new Date() } },
    { new: true, arrayFilters: [{ 'assignment.volunteer': volunteerId }] },
  );
  if (!task) throw ApiError.notFound('You are not assigned to this task.', 'NOT_ASSIGNED');
  emitTaskUpdate(task);
  return task;
}

export async function updateVolunteerTaskStatus(
  taskId: string,
  status: VolunteerTaskStatus,
  actor: Actor,
) {
  const task = await getVolunteerTask(taskId);
  const allowed = VOLUNTEER_TASK_TRANSITIONS[task.status] ?? [];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(
      `Cannot move task from ${task.status} to ${status}.`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  task.status = status;
  await task.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'VOLUNTEER_TASK_STATUS_CHANGED',
    targetType: 'VolunteerTask',
    targetId: task.id,
    details: `Task "${task.title}" moved to ${status}.`,
    ip: actor.ip,
  });

  if (status === 'COMPLETED' || status === 'CANCELLED') {
    for (const assignment of task.assignedVolunteers) {
      void notifyUser(assignment.volunteer, {
        type: 'SYSTEM',
        title: `Task ${status.toLowerCase()}`,
        message: `"${task.title}" has been ${status.toLowerCase()}.`,
        relatedEntity: { type: 'VolunteerTask', id: task.id },
      }).catch((error) => console.warn('[notify] Could not notify volunteer:', error instanceof Error ? error.message : error));
    }
  }

  emitTaskUpdate(task);
  return task;
}
