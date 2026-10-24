import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { Donation, type IDonation } from '../models/Donation';
import { ReliefCamp } from '../models/ReliefCamp';
import { DONATION_TRANSITIONS, type Role } from '../utils/constants';
import { ApiError } from '../utils/ApiError';
import { generateTrackingId, generateTrackingToken } from '../utils/ids';
import { safeEqual, sha256 } from '../utils/crypto';
import { escapeRegex } from '../utils/text';
import { recordAudit } from './audit.service';
import { notifyUser } from './notification.service';
import { emitToRole, emitToUser } from './socket.service';
import { serializeDonation } from '../serializers';
import type { CreateDonationInput, DonationEventInput } from '../schemas/donation.schema';

interface Actor {
  id: string;
  role: Role;
  name: string;
  email?: string;
  ip?: string;
}

const DONATION_STAFF: Role[] = ['ADMIN', 'NGO'];

function isDonationStaff(role?: Role): boolean {
  return Boolean(role && DONATION_STAFF.includes(role));
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

function emitDonationUpdate(donation: IDonation) {
  for (const role of DONATION_STAFF) {
    emitToRole(role, 'donation:updated', serializeDonation(donation, 'staff'));
  }
  if (donation.donor) {
    emitToUser(donation.donor.toString(), 'donation:updated', serializeDonation(donation, 'owner'));
  }
}

export function hasDonationTrackingAccess(
  donation: IDonation,
  user: { id: string; role: Role } | undefined,
  token?: string,
): boolean {
  if (user) {
    if (isDonationStaff(user.role)) return true;
    if (donation.donor && String(donation.donor) === user.id) return true;
  }
  if (!token || token.length < 16) return false;
  return safeEqual(token, donation.trackingTokenHash);
}

export async function createDonation(input: CreateDonationInput, actor?: Actor) {
  let destination = input.destination ?? 'Relief operations pool';
  let allocatedCampName: string | undefined;

  if (input.allocatedCampId) {
    const camp = await ReliefCamp.findById(input.allocatedCampId);
    if (!camp) throw ApiError.notFound('Allocated relief camp not found.', 'CAMP_NOT_FOUND');
    if (camp.status === 'CLOSED') {
      throw ApiError.conflict('The selected relief camp is closed.', 'CAMP_CLOSED');
    }
    destination = camp.name;
    allocatedCampName = camp.name;
  }

  const donorName = input.donorName ?? actor?.name ?? 'Anonymous donor';
  const donorEmail = input.donorEmail ?? actor?.email;
  const trackingToken = generateTrackingToken();
  const registeredAt = new Date();

  let donation: IDonation | null = null;
  for (let attempt = 0; attempt < 5 && !donation; attempt += 1) {
    try {
      donation = await Donation.create({
        trackingId: generateTrackingId(),
        trackingTokenHash: sha256(trackingToken),
        donor: actor?.id,
        donorName,
        donorEmail,
        donationType: input.donationType,
        itemDescription: input.itemDescription,
        amountOrQuantity: input.amountOrQuantity,
        quantity: input.quantity,
        pickupLocation: input.pickupLocation
          ? {
              type: 'Point',
              coordinates: [input.pickupLocation.lng, input.pickupLocation.lat],
            }
          : undefined,
        destination,
        allocatedCamp: input.allocatedCampId,
        allocatedCampName,
        status: 'REGISTERED',
        currentLocation: input.pickupLocation ? 'Pickup location registered' : 'Registered — awaiting collection',
        trackingEvents: [
          {
            status: 'REGISTERED',
            location: input.pickupLocation ? 'Donor pickup location' : 'Donation portal',
            notes: 'Donation pledge registered.',
            verifiedBy: actor ? new Types.ObjectId(actor.id) : undefined,
            verifiedByName: actor?.name ?? donorName,
            at: registeredAt,
          },
        ],
      });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  if (!donation) {
    throw ApiError.serviceUnavailable(
      'Could not allocate a unique tracking code. Please retry.',
      'TRACKING_ALLOCATION_FAILED',
    );
  }

  await recordAudit({
    actor: actor ? { id: actor.id, name: actor.name } : undefined,
    actorName: donorName,
    action: 'DONATION_REGISTERED',
    targetType: 'Donation',
    targetId: donation.trackingId,
    details: `Registered ${input.donationType.toLowerCase()} donation "${input.amountOrQuantity}" for ${destination}.`,
    ip: actor?.ip,
  });

  emitToRole('ADMIN', 'donation:created', serializeDonation(donation, 'staff'));
  emitToRole('NGO', 'donation:created', serializeDonation(donation, 'staff'));
  if (donation.donor) {
    emitToUser(donation.donor.toString(), 'donation:created', serializeDonation(donation, 'owner'));
  }

  return { donation, trackingToken };
}

export async function listDonations(
  query: {
    page?: number;
    limit?: number;
    status?: string;
    donationType?: string;
    search?: string;
    mine?: boolean;
  },
  actor: Actor,
) {
  const filter: FilterQuery<IDonation> = {};
  if (query.status) filter.status = query.status;
  if (query.donationType) filter.donationType = query.donationType;
  if (query.mine || actor.role === 'DONOR') filter.donor = actor.id;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { trackingId: pattern },
      { donorName: pattern },
      { itemDescription: pattern },
      { destination: pattern },
    ];
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const [donations, total] = await Promise.all([
    Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Donation.countDocuments(filter),
  ]);

  return { donations, total, page, limit };
}

export async function getDonationById(donationId: string): Promise<IDonation> {
  const donation = await Donation.findById(donationId);
  if (!donation) throw ApiError.notFound('Donation not found.', 'DONATION_NOT_FOUND');
  return donation;
}

export async function getDonationByTrackingId(trackingId: string): Promise<IDonation> {
  const donation = await Donation.findOne({ trackingId }).select('+trackingTokenHash');
  if (!donation) throw ApiError.notFound('No donation matches that tracking code.', 'DONATION_NOT_FOUND');
  return donation;
}

export async function appendDonationEvent(
  donationId: string,
  input: DonationEventInput,
  actor: Actor,
) {
  const donation = await getDonationById(donationId);
  const allowed = DONATION_TRANSITIONS[donation.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw ApiError.conflict(
      `Cannot move donation from ${donation.status} to ${input.status}.`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  donation.status = input.status;
  donation.currentLocation = input.location;
  donation.trackingEvents.push({
    status: input.status,
    location: input.location,
    notes: input.notes,
    verifiedBy: new Types.ObjectId(actor.id),
    verifiedByName: actor.name,
    at: new Date(),
  });
  await donation.save();

  await recordAudit({
    actor: { id: actor.id, name: actor.name },
    action: 'DONATION_CHECKPOINT_RECORDED',
    targetType: 'Donation',
    targetId: donation.trackingId,
    details: `Checkpoint ${input.status} at ${input.location}.${input.notes ? ` Notes: ${input.notes}` : ''}`,
    ip: actor.ip,
  });

  if (donation.donor) {
    void notifyUser(donation.donor, {
      type: 'DONATION_UPDATE',
      title: `Donation ${donation.trackingId} updated`,
      message: `Status is now ${input.status.replace(/_/g, ' ')} at ${input.location}.`,
      relatedEntity: { type: 'Donation', id: donation.id },
    }).catch((error) => console.warn('[notify] Could not notify donor:', error instanceof Error ? error.message : error));
  }

  emitDonationUpdate(donation);
  return donation;
}
