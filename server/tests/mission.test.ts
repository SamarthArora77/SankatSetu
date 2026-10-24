import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createResponder,
  createUser,
  emergencyPayload,
  loginAgent,
  startTestServer,
  type TestServer,
  type TestAgent,
} from './helpers';

let server: TestServer;
let adminAgent: TestAgent;
let responderAAgent: TestAgent;
let responderBAgent: TestAgent;
let responderCAgent: TestAgent;

async function createVerifiedEmergency(title: string) {
  const created = await request(server.app)
    .post('/api/v1/emergencies')
    .send(emergencyPayload({ title }));
  const id = created.body.data.emergency.id as string;
  await adminAgent.patch(`/api/v1/emergencies/${id}/verification`).send({
    verificationStatus: 'VERIFIED',
  });
  return id;
}

beforeAll(async () => {
  server = await startTestServer();
  await createUser('ADMIN', 'admin@test.dev', { name: 'Admin Test' });
  await createResponder('responder.a@test.dev', 'Responder A');
  await createResponder('responder.b@test.dev', 'Responder B');
  await createResponder('responder.c@test.dev', 'Responder C');
  adminAgent = await loginAgent(server.app, 'admin@test.dev');
  responderAAgent = await loginAgent(server.app, 'responder.a@test.dev');
  responderBAgent = await loginAgent(server.app, 'responder.b@test.dev');
  responderCAgent = await loginAgent(server.app, 'responder.c@test.dev');
});

afterAll(async () => {
  await server.close();
});

describe('missions', () => {
  it('lets an available responder claim a verified emergency', async () => {
    const emergencyId = await createVerifiedEmergency('Claimable emergency');

    const response = await responderAAgent
      .post(`/api/v1/missions/${emergencyId}/claim`)
      .send({ notes: 'En route shortly.' });

    expect(response.status).toBe(201);
    expect(response.body.data.mission.status).toBe('ASSIGNED');

    const emergency = await adminAgent.get(`/api/v1/emergencies/${emergencyId}`);
    expect(emergency.body.data.emergency.status).toBe('ASSIGNED');
    expect(emergency.body.data.emergency.assignedResponderName).toBe('Responder A');
  });

  it('prevents claiming while the responder has an active mission', async () => {
    const emergencyId = await createVerifiedEmergency('Blocked second claim');
    const response = await responderAAgent.post(`/api/v1/missions/${emergencyId}/claim`).send({});
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('RESPONDER_UNAVAILABLE');
  });

  it('prevents claiming an emergency that is already assigned', async () => {
    const emergencyId = await createVerifiedEmergency('Double claim attempt');
    expect((await responderBAgent.post(`/api/v1/missions/${emergencyId}/claim`).send({})).status).toBe(201);

    // Responder A is still AVAILABLE here only if their earlier mission finished; use a fresh responder.
    const response = await responderCAgent.post(`/api/v1/missions/${emergencyId}/claim`).send({});
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMERGENCY_ALREADY_ASSIGNED');
  });

  it('enforces the mission state machine', async () => {
    const my = await responderAAgent.get('/api/v1/missions/my');
    const missionId = my.body.data.missions[0].id as string;

    const skipAhead = await responderAAgent
      .patch(`/api/v1/missions/${missionId}/status`)
      .send({ status: 'ARRIVED' });
    expect(skipAhead.status).toBe(409);
    expect(skipAhead.body.code).toBe('INVALID_STATUS_TRANSITION');

    const enRoute = await responderAAgent
      .patch(`/api/v1/missions/${missionId}/status`)
      .send({ status: 'EN_ROUTE', location: { lat: 28.61, lng: 77.21 } });
    expect(enRoute.status).toBe(200);
    expect(enRoute.body.data.mission.status).toBe('EN_ROUTE');
  });

  it('blocks other responders from updating a mission they do not own', async () => {
    const my = await responderAAgent.get('/api/v1/missions/my');
    const missionId = my.body.data.missions[0].id as string;

    const response = await responderBAgent
      .patch(`/api/v1/missions/${missionId}/status`)
      .send({ status: 'ARRIVED' });
    expect(response.status).toBe(403);
  });

  it('completing a mission resolves the emergency and frees the responder', async () => {
    const my = await responderAAgent.get('/api/v1/missions/my');
    const mission = my.body.data.missions[0];
    const emergencyId = mission.emergency.id as string;

    const arrived = await responderAAgent
      .patch(`/api/v1/missions/${mission.id}/status`)
      .send({ status: 'ARRIVED' });
    expect(arrived.status).toBe(200);

    const inProgress = await adminAgent.get(`/api/v1/emergencies/${emergencyId}`);
    expect(inProgress.body.data.emergency.status).toBe('IN_PROGRESS');

    const completed = await responderAAgent
      .patch(`/api/v1/missions/${mission.id}/status`)
      .send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);

    const resolved = await adminAgent.get(`/api/v1/emergencies/${emergencyId}`);
    expect(resolved.body.data.emergency.status).toBe('RESOLVED');
    expect(resolved.body.data.emergency.resolvedAt).toBeDefined();
  });

  it('rejects claims on emergencies that are not verified', async () => {
    const created = await request(server.app)
      .post('/api/v1/emergencies')
      .send(emergencyPayload({ title: 'Still pending report' }));
    const emergencyId = created.body.data.emergency.id as string;

    const response = await responderAAgent.post(`/api/v1/missions/${emergencyId}/claim`).send({});
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMERGENCY_NOT_VERIFIED');
  });

  it('lets an admin cancel a mission, returning the emergency to verified', async () => {
    const emergencyId = await createVerifiedEmergency('Cancellable mission');
    const claimed = await responderAAgent.post(`/api/v1/missions/${emergencyId}/claim`).send({});
    expect(claimed.status).toBe(201);
    const missionId = claimed.body.data.mission.id as string;

    const cancelled = await adminAgent
      .patch(`/api/v1/missions/${missionId}/status`)
      .send({ status: 'CANCELLED', notes: 'Duplicate of another ticket.' });
    expect(cancelled.status).toBe(200);

    const emergency = await adminAgent.get(`/api/v1/emergencies/${emergencyId}`);
    expect(emergency.body.data.emergency.status).toBe('VERIFIED');
    expect(emergency.body.data.emergency.assignedResponder).toBeUndefined();
  });
});
