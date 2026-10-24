import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Emergency } from '../src/models/Emergency';
import { sha256 } from '../src/utils/crypto';
import { generateTrackingToken } from '../src/utils/ids';
import {
  createUser,
  emergencyPayload,
  loginAgent,
  startTestServer,
  type TestServer,
  type TestAgent,
} from './helpers';

let server: TestServer;
let adminAgent: TestAgent;

beforeAll(async () => {
  server = await startTestServer();
  await createUser('ADMIN', 'admin@test.dev', { name: 'Admin Test' });
  adminAgent = await loginAgent(server.app, 'admin@test.dev');
});

afterAll(async () => {
  await server.close();
});

describe('emergency reports', () => {
  it('accepts an anonymous report and returns a ticket with a tracking token', async () => {
    const response = await request(server.app)
      .post('/api/v1/emergencies')
      .send(emergencyPayload());

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.emergency.ticketId).toMatch(/^RS-\d{6}$/);
    expect(response.body.data.trackingToken).toHaveLength(48);
    expect(response.body.data.emergency.status).toBe('PENDING');
  });

  it('generates unique ticket ids for repeated reports', async () => {
    const ticketIds = new Set<string>();
    for (let index = 0; index < 3; index += 1) {
      const response = await request(server.app)
        .post('/api/v1/emergencies')
        .send(emergencyPayload({ title: `Repeated incident ${index}` }));
      expect(response.status).toBe(201);
      ticketIds.add(response.body.data.emergency.ticketId);
    }
    expect(ticketIds.size).toBe(3);
  });

  it('rejects invalid payloads with a validation error envelope', async () => {
    const response = await request(server.app)
      .post('/api/v1/emergencies')
      .send(emergencyPayload({ title: 'ok', description: 'short' }));

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('excludes rejected reports from the public list by default', async () => {
    const rejected = await Emergency.create({
      ticketId: 'RS-999999',
      title: 'Rejected drill report',
      description: 'Filed during a drill and rejected.',
      category: ['OTHER'],
      location: { type: 'Point', coordinates: [77.21, 28.61] },
      urgency: 'LOW',
      status: 'REJECTED',
      peopleCount: 1,
      isAnonymous: true,
      isForOther: false,
      verificationStatus: 'REJECTED',
      trustScore: 5,
      trustSignals: [],
      corroboratingReportCount: 0,
      trackingTokenHash: sha256(generateTrackingToken()),
    });
    await request(server.app).post('/api/v1/emergencies').send(emergencyPayload());

    const response = await request(server.app).get('/api/v1/emergencies');
    expect(response.status).toBe(200);
    const ticketIds = response.body.data.emergencies.map(
      (emergency: { ticketId: string }) => emergency.ticketId,
    );
    expect(ticketIds).not.toContain(rejected.ticketId);
    expect(ticketIds.length).toBeGreaterThan(0);
  });

  it('returns nearby active reports for the public map', async () => {
    const response = await request(server.app)
      .get('/api/v1/emergencies/nearby')
      .query({ lat: 28.61, lng: 77.21, radiusKm: 10 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.emergencies)).toBe(true);
  });

  it('requires a tracking token for anonymous ticket access', async () => {
    const created = await request(server.app)
      .post('/api/v1/emergencies')
      .send(emergencyPayload());
    const { emergency, trackingToken } = created.body.data as {
      emergency: { ticketId: string };
      trackingToken: string;
    };
    const ticketId = emergency.ticketId;

    const denied = await request(server.app).get(`/api/v1/emergencies/ticket/${ticketId}`);
    expect(denied.status).toBe(401);

    const wrongToken = await request(server.app)
      .get(`/api/v1/emergencies/ticket/${ticketId}`)
      .set('X-Tracking-Token', generateTrackingToken());
    expect(wrongToken.status).toBe(401);

    const allowed = await request(server.app)
      .get(`/api/v1/emergencies/ticket/${ticketId}`)
      .set('X-Tracking-Token', trackingToken);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.emergency.ticketId).toBe(ticketId);
  });

  it('lets an admin verify a pending report', async () => {
    const created = await request(server.app)
      .post('/api/v1/emergencies')
      .send(emergencyPayload());
    const emergencyId = created.body.data.emergency.id as string;

    const response = await adminAgent
      .patch(`/api/v1/emergencies/${emergencyId}/verification`)
      .send({ verificationStatus: 'VERIFIED', notes: 'Confirmed by phone.' });

    expect(response.status).toBe(200);
    expect(response.body.data.emergency.verificationStatus).toBe('VERIFIED');
    expect(response.body.data.emergency.status).toBe('VERIFIED');
  });
});
