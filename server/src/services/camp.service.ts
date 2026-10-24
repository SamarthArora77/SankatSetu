import type { FilterQuery } from 'mongoose';
import { ReliefCamp, type IReliefCamp } from '../models/ReliefCamp';
import type { Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/text';
import { recordAudit } from './audit.service';
import { emitToPublic, emitToRole } from './socket.service';
import { serializeCamp } from '../serializers';
import { invalidatePublicCache } from './cache.service';
import type { CreateCampInput, UpdateCampInput } from '../schemas/camp.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  ip?: string;
}

function applyAutoStatus(camp: IReliefCamp) {
  if (camp.status === 'CLOSED') return;
  camp.status = camp.currentOccupancy >= camp.capacity ? 'FULL' : 'OPEN';
}

export async function createCamp(input: CreateCampInput, actor: Actor) {
  const camp = await ReliefCamp.create({
    name: input.name,
    location: { type: 'Point', coordinates: [input.location.lng, input.location.lat] },
    address: input.address,
    capacity: input.capacity,
    currentOccupancy: input.currentOccupancy,
    availableServices: input.availableServices,
    status: input.status,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    suppliesStatus: input.suppliesStatus,
    hasMedicalPost: input.hasMedicalPost,
    hasDrinkingWater: input.hasDrinkingWater,
    hasPowerBackup: input.hasPowerBackup,
  });

  applyAutoStatus(camp);
  await camp.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'CAMP_CREATED',
    targetType: 'ReliefCamp',
    targetId: camp.id,
    details: `Created relief camp ${camp.name} with capacity ${camp.capacity}.`,
    ip: actor.ip,
  });

  emitToPublic('camp:created', serializeCamp(camp, 'public'));
  await invalidatePublicCache();
  return camp;
}

export async function getCamp(campId: string): Promise<IReliefCamp> {
  const camp = await ReliefCamp.findById(campId);
  if (!camp) throw ApiError.notFound('Relief camp not found.', 'CAMP_NOT_FOUND');
  return camp;
}

export async function updateCamp(campId: string, input: UpdateCampInput, actor: Actor) {
  const camp = await getCamp(campId);

  const nextCapacity = input.capacity ?? camp.capacity;
  if (nextCapacity < camp.currentOccupancy) {
    throw ApiError.badRequest(
      `Capacity cannot be lower than current occupancy (${camp.currentOccupancy}).`,
      'INVALID_CAPACITY',
    );
  }

  if (input.name !== undefined) camp.name = input.name;
  if (input.location) {
    camp.location = { type: 'Point', coordinates: [input.location.lng, input.location.lat] };
  }
  if (input.address !== undefined) camp.address = input.address;
  if (input.availableServices !== undefined) camp.availableServices = input.availableServices;
  if (input.contactPerson !== undefined) camp.contactPerson = input.contactPerson;
  if (input.contactPhone !== undefined) camp.contactPhone = input.contactPhone;
  if (input.suppliesStatus !== undefined) camp.suppliesStatus = input.suppliesStatus;
  if (input.hasMedicalPost !== undefined) camp.hasMedicalPost = input.hasMedicalPost;
  if (input.hasDrinkingWater !== undefined) camp.hasDrinkingWater = input.hasDrinkingWater;
  if (input.hasPowerBackup !== undefined) camp.hasPowerBackup = input.hasPowerBackup;
  if (input.status !== undefined) camp.status = input.status;
  camp.capacity = nextCapacity;

  applyAutoStatus(camp);
  await camp.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'CAMP_UPDATED',
    targetType: 'ReliefCamp',
    targetId: camp.id,
    details: `Updated camp ${camp.name}.`,
    ip: actor.ip,
  });

  emitToPublic('camp:updated', serializeCamp(camp, 'public'));
  emitToRole('ADMIN', 'camp:updated', serializeCamp(camp, 'staff'));
  await invalidatePublicCache();
  return camp;
}

export async function updateCampOccupancy(campId: string, currentOccupancy: number, actor: Actor) {
  const camp = await getCamp(campId);
  if (currentOccupancy > camp.capacity) {
    throw ApiError.badRequest(
      `Occupancy cannot exceed capacity (${camp.capacity}).`,
      'INVALID_OCCUPANCY',
    );
  }

  camp.currentOccupancy = currentOccupancy;
  applyAutoStatus(camp);
  await camp.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'CAMP_OCCUPANCY_UPDATED',
    targetType: 'ReliefCamp',
    targetId: camp.id,
    details: `Occupancy set to ${camp.currentOccupancy}/${camp.capacity}.`,
    ip: actor.ip,
  });

  emitToPublic('camp:updated', serializeCamp(camp, 'public'));
  emitToRole('ADMIN', 'camp:updated', serializeCamp(camp, 'staff'));
  await invalidatePublicCache();
  return camp;
}

export async function listCamps(query: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const filter: FilterQuery<IReliefCamp> = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { address: pattern }, { availableServices: pattern }];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 100;

  const [camps, total] = await Promise.all([
    ReliefCamp.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ReliefCamp.countDocuments(filter),
  ]);

  return { camps, total, page, limit };
}
