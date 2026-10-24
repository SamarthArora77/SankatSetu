import type { FilterQuery } from 'mongoose';
import { Resource, type IResource } from '../models/Resource';
import { ReliefCamp } from '../models/ReliefCamp';
import { Emergency } from '../models/Emergency';
import type { Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/text';
import { recordAudit } from './audit.service';
import { emitToRole } from './socket.service';
import { serializeResource } from '../serializers';
import type {
  CreateResourceInput,
  DispatchResourceInput,
  UpdateResourceInput,
} from '../schemas/resource.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  organization?: string;
  ip?: string;
}

const RESOURCE_AUDIENCE: Role[] = ['ADMIN', 'NGO', 'RESPONDER'];

function emitResourceUpdate(resource: IResource) {
  for (const role of RESOURCE_AUDIENCE) {
    emitToRole(role, 'resource:updated', serializeResource(resource));
  }
}

function assertCanManage(resource: IResource, actor: Actor) {
  if (actor.role === 'ADMIN') return;
  if (actor.role === 'NGO' && resource.owner && resource.owner.toString() === actor.id) return;
  throw ApiError.forbidden('NGOs can only modify resources they own.', 'RESOURCE_NOT_OWNED');
}

export async function createResource(input: CreateResourceInput, actor: Actor) {
  const availableQuantity = input.availableQuantity ?? input.quantity;
  if (availableQuantity > input.quantity) {
    throw ApiError.badRequest(
      'availableQuantity cannot exceed quantity.',
      'INVALID_STOCK',
      [{ field: 'availableQuantity', message: 'Must be less than or equal to quantity' }],
    );
  }

  const resource = await Resource.create({
    name: input.name,
    category: input.category,
    quantity: input.quantity,
    availableQuantity,
    unit: input.unit,
    owner: actor.id,
    organizationName: input.organizationName ?? actor.organization ?? actor.name,
    warehouseName: input.warehouseName,
    location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    status: input.status,
    criticalThreshold: input.criticalThreshold,
  });

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'RESOURCE_CREATED',
    targetType: 'Resource',
    targetId: resource.id,
    details: `Created ${resource.name} (${resource.quantity} ${resource.unit}) at ${resource.warehouseName}.`,
    ip: actor.ip,
  });

  emitResourceUpdate(resource);
  return resource;
}

export async function getResource(resourceId: string): Promise<IResource> {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found.', 'RESOURCE_NOT_FOUND');
  return resource;
}

export async function updateResource(resourceId: string, input: UpdateResourceInput, actor: Actor) {
  const resource = await getResource(resourceId);
  assertCanManage(resource, actor);

  const nextQuantity = input.quantity ?? resource.quantity;
  const nextAvailable = input.availableQuantity ?? resource.availableQuantity;
  if (nextAvailable > nextQuantity) {
    throw ApiError.badRequest(
      'availableQuantity cannot exceed quantity.',
      'INVALID_STOCK',
      [{ field: 'availableQuantity', message: 'Must be less than or equal to quantity' }],
    );
  }

  if (input.name !== undefined) resource.name = input.name;
  if (input.category !== undefined) resource.category = input.category;
  if (input.unit !== undefined) resource.unit = input.unit;
  if (input.warehouseName !== undefined) resource.warehouseName = input.warehouseName;
  if (input.status !== undefined) resource.status = input.status;
  if (input.criticalThreshold !== undefined) resource.criticalThreshold = input.criticalThreshold;
  if (input.location) {
    resource.location = { type: 'Point', coordinates: [input.location.lng, input.location.lat] };
  }
  resource.quantity = nextQuantity;
  resource.availableQuantity = nextAvailable;

  await resource.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'RESOURCE_UPDATED',
    targetType: 'Resource',
    targetId: resource.id,
    details: `Updated inventory to ${resource.availableQuantity}/${resource.quantity} ${resource.unit} available.`,
    ip: actor.ip,
  });

  emitResourceUpdate(resource);
  return resource;
}

export async function dispatchResource(
  resourceId: string,
  input: DispatchResourceInput,
  actor: Actor,
) {
  const resource = await getResource(resourceId);
  assertCanManage(resource, actor);

  let targetName = input.targetName;
  if (input.targetType === 'CAMP' && input.targetId) {
    const camp = await ReliefCamp.findById(input.targetId);
    if (!camp) throw ApiError.notFound('Relief camp not found.', 'CAMP_NOT_FOUND');
    if (camp.status === 'CLOSED') {
      throw ApiError.conflict('Cannot dispatch supplies to a closed camp.', 'CAMP_CLOSED');
    }
    targetName = camp.name;
  }
  if (input.targetType === 'EMERGENCY' && input.targetId) {
    const emergency = await Emergency.findById(input.targetId);
    if (!emergency) throw ApiError.notFound('Emergency not found.', 'EMERGENCY_NOT_FOUND');
    if (emergency.status === 'RESOLVED' || emergency.status === 'REJECTED') {
      throw ApiError.conflict('Cannot dispatch supplies to a closed emergency.', 'EMERGENCY_CLOSED');
    }
    targetName = `${emergency.ticketId} — ${emergency.title}`;
  }

  const updateFilter: FilterQuery<IResource> = {
    _id: resource.id,
    availableQuantity: { $gte: input.quantity },
  };
  if (actor.role !== 'ADMIN') {
    updateFilter.owner = actor.id;
  }

  const updated = await Resource.findOneAndUpdate(
    updateFilter,
    { $inc: { availableQuantity: -input.quantity } },
    { new: true },
  );

  if (!updated) {
    const fresh = await Resource.findById(resourceId);
    if (!fresh) throw ApiError.notFound('Resource not found.', 'RESOURCE_NOT_FOUND');
    throw ApiError.conflict(
      `Insufficient stock. Only ${fresh.availableQuantity} ${fresh.unit} are available.`,
      'INSUFFICIENT_STOCK',
    );
  }

  const dispatchedAt = new Date();
  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'RESOURCE_DISPATCHED',
    targetType: 'Resource',
    targetId: updated.id,
    details: `Dispatched ${input.quantity} ${updated.unit} of ${updated.name} to ${targetName}${input.notes ? ` (${input.notes})` : ''}.`,
    ip: actor.ip,
  });

  emitResourceUpdate(updated);
  emitToRole('ADMIN', 'resource:dispatched', {
    resource: serializeResource(updated),
    dispatch: {
      quantity: input.quantity,
      unit: updated.unit,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName,
      notes: input.notes,
      dispatchedAt: dispatchedAt.toISOString(),
      dispatchedBy: actor.name,
    },
  });

  return {
    resource: updated,
    dispatch: {
      quantity: input.quantity,
      unit: updated.unit,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName,
      notes: input.notes,
      dispatchedAt: dispatchedAt.toISOString(),
      dispatchedBy: actor.name,
    },
  };
}

export async function listResources(
  query: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
    mine?: boolean;
  },
  actor: Actor,
) {
  const filter: FilterQuery<IResource> = {};
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.mine) filter.owner = actor.id;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { warehouseName: pattern }, { organizationName: pattern }];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;

  const [resources, total] = await Promise.all([
    Resource.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Resource.countDocuments(filter),
  ]);

  return { resources, total, page, limit };
}
