import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createUser,
  loginAgent,
  startTestServer,
  type TestServer,
  type TestAgent,
} from './helpers';

let server: TestServer;
let donorAgent: TestAgent;
let ngoAgent: TestAgent;

const donationPayload = {
  donationType: 'SUPPLIES',
  itemDescription: 'Family hygiene kits for displaced residents',
  amountOrQuantity: '150 hygiene kits',
  quantity: 150,
  destination: 'Ganga Nagar Relief Camp',
};

beforeAll(async () => {
  server = await startTestServer();
  await createUser('DONOR', 'donor@test.dev', { name: 'Donor Test' });
  await createUser('NGO', 'ngo@test.dev', { name: 'NGO Test', organization: 'Aid Collective' });
  donorAgent = await loginAgent(server.app, 'donor@test.dev');
  ngoAgent = await loginAgent(server.app, 'ngo@test.dev');
});

afterAll(async () => {
  await server.close();
});

describe('donations', () => {
  it('registers an anonymous donation and returns tracking credentials', async () => {
    const response = await request(server.app).post('/api/v1/donations').send(donationPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.donation.trackingId).toMatch(/^RS-DON-[A-Z2-9]{6}$/);
    expect(response.body.data.trackingToken).toHaveLength(48);
    expect(response.body.data.donation.status).toBe('REGISTERED');
    expect(response.body.data.donation.trackingEvents).toHaveLength(1);
  });

  it('requires a tracking token for public tracking', async () => {
    const created = await request(server.app).post('/api/v1/donations').send(donationPayload);
    const { donation, trackingToken } = created.body.data as {
      donation: { trackingId: string };
      trackingToken: string;
    };
    const trackingId = donation.trackingId;

    const denied = await request(server.app).get(`/api/v1/donations/track/${trackingId}`);
    expect(denied.status).toBe(401);

    const allowed = await request(server.app)
      .get(`/api/v1/donations/track/${trackingId}`)
      .set('X-Tracking-Token', trackingToken);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.donation.trackingId).toBe(trackingId);
    expect(allowed.body.data.donation.trackingEvents).toHaveLength(1);
  });

  it('scopes a donor listing to their own donations', async () => {
    await donorAgent.post('/api/v1/donations').send(donationPayload);
    const response = await donorAgent.get('/api/v1/donations');

    expect(response.status).toBe(200);
    expect(response.body.data.donations.length).toBe(1);
    expect(response.body.data.donations[0].donorName).toBe('Donor Test');
  });

  it('blocks donors from recording checkpoints', async () => {
    const created = await donorAgent.post('/api/v1/donations').send(donationPayload);
    const donationId = created.body.data.donation.id as string;

    const response = await donorAgent.post(`/api/v1/donations/${donationId}/events`).send({
      status: 'COLLECTED',
      location: 'Donor warehouse',
    });
    expect(response.status).toBe(403);
  });

  it('enforces valid donation status transitions for staff', async () => {
    const created = await ngoAgent.post('/api/v1/donations').send(donationPayload);
    const donationId = created.body.data.donation.id as string;

    const skipAhead = await ngoAgent.post(`/api/v1/donations/${donationId}/events`).send({
      status: 'IN_TRANSIT',
      location: 'Highway checkpoint',
    });
    expect(skipAhead.status).toBe(409);
    expect(skipAhead.body.code).toBe('INVALID_STATUS_TRANSITION');

    const collected = await ngoAgent.post(`/api/v1/donations/${donationId}/events`).send({
      status: 'COLLECTED',
      location: 'Donor warehouse',
      notes: 'Picked up by logistics van.',
    });
    expect(collected.status).toBe(200);
    expect(collected.body.data.donation.status).toBe('COLLECTED');

    const inTransit = await ngoAgent.post(`/api/v1/donations/${donationId}/events`).send({
      status: 'IN_TRANSIT',
      location: 'Highway checkpoint 2',
    });
    expect(inTransit.status).toBe(200);
    expect(inTransit.body.data.donation.trackingEvents).toHaveLength(3);
  });
});
