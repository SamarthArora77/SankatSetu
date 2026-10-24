import * as donationService from '../services/donation.service';
import { serializeDonation } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser, requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';
import { ApiError } from '../utils/ApiError';

function trackingTokenFrom(req: Parameters<typeof currentUser>[0]): string | undefined {
  const header = req.headers['x-tracking-token'];
  return typeof header === 'string' && header.length <= 200 ? header.trim() : undefined;
}

export const createDonation = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const result = await donationService.createDonation(
    req.body,
    user ? { id: user.id, role: user.role, name: user.name, email: user.email, ip: req.ip } : undefined,
  );

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(
    res,
    'Donation registered.',
    {
      donation: serializeDonation(result.donation, user ? 'owner' : 'public'),
      trackingToken: result.trackingToken,
    },
    201,
  );
});

export const listDonations = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const { donations, total, page, limit } = await donationService.listDonations(
    req.query as never,
    actor,
  );

  sendSuccess(res, 'Donations loaded.', {
    donations: donations.map((donation) =>
      serializeDonation(
        donation,
        actor.role === 'DONOR' || String(donation.donor ?? '') === actor.id ? 'owner' : 'staff',
      ),
    ),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const getDonation = asyncHandler(async (req, res) => {
  const donation = await donationService.getDonationById(req.params.id);
  sendSuccess(res, 'Donation loaded.', { donation: serializeDonation(donation, 'staff') });
});

export const trackDonation = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const donation = await donationService.getDonationByTrackingId(req.params.trackingId);
  const token = trackingTokenFrom(req);

  if (!donationService.hasDonationTrackingAccess(donation, user, token)) {
    throw ApiError.unauthorized(
      'A valid tracking token is required to view this donation.',
      'TRACKING_TOKEN_REQUIRED',
    );
  }

  const view = user && ['ADMIN', 'NGO'].includes(user.role)
    ? 'staff'
    : user && donation.donor && String(donation.donor) === user.id
      ? 'owner'
      : 'public';

  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, 'Donation tracking loaded.', { donation: serializeDonation(donation, view) });
});

export const appendDonationEvent = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const donation = await donationService.appendDonationEvent(req.params.id, req.body, actor);
  sendSuccess(res, 'Donation checkpoint recorded.', { donation: serializeDonation(donation, 'staff') });
});
