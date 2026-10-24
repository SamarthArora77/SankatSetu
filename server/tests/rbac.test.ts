import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createUser,
  emergencyPayload,
  loginAgent,
  startTestServer,
  type TestServer,
} from './helpers';

let server: TestServer;
let emergencyId: string;

beforeAll(async () => {
  server = await startTestServer();
  await createUser('ADMIN', 'admin@test.dev', { name: 'Admin Test' });
  await createUser('CITIZEN', 'citizen@test.dev', { name: 'Citizen Test' });

  const created = await request(server.app)
    .post('/api/v1/emergencies')
    .send(emergencyPayload());
  emergencyId = created.body.data.emergency.id as string;
});

afterAll(async () => {
  await server.close();
});

describe('RBAC and authorization', () => {
  it('returns 404 with the standard envelope for unknown routes', async () => {
    const response = await request(server.app).get('/api/v1/definitely-not-real');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('blocks unauthenticated status updates', async () => {
    const response = await request(server.app)
      .patch(`/api/v1/emergencies/${emergencyId}/status`)
      .send({ status: 'VERIFIED' });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('blocks citizens from staff operations', async () => {
    const agent = await loginAgent(server.app, 'citizen@test.dev');

    const statusUpdate = await agent
      .patch(`/api/v1/emergencies/${emergencyId}/status`)
      .send({ status: 'VERIFIED' });
    expect(statusUpdate.status).toBe(403);

    const verification = await agent
      .patch(`/api/v1/emergencies/${emergencyId}/verification`)
      .send({ verificationStatus: 'VERIFIED' });
    expect(verification.status).toBe(403);

    const adminUsers = await agent.get('/api/v1/users');
    expect(adminUsers.status).toBe(403);

    const missions = await agent.get('/api/v1/missions');
    expect(missions.status).toBe(403);
  });

  it('blocks unauthenticated access to admin routes', async () => {
    const response = await request(server.app).get('/api/v1/users');
    expect(response.status).toBe(401);
  });

  it('blocks AI analysis for non-staff roles', async () => {
    const agent = await loginAgent(server.app, 'citizen@test.dev');
    const response = await agent.post(`/api/v1/emergencies/${emergencyId}/analyze`);
    expect(response.status).toBe(403);
  });

  it('returns 503 AI_NOT_CONFIGURED instead of fabricating an analysis', async () => {
    const agent = await loginAgent(server.app, 'admin@test.dev');
    const response = await agent.post(`/api/v1/emergencies/${emergencyId}/analyze`);

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('AI_NOT_CONFIGURED');
  });

  it('blocks citizens from claiming missions', async () => {
    const agent = await loginAgent(server.app, 'citizen@test.dev');
    const response = await agent.post(`/api/v1/missions/${emergencyId}/claim`).send({});
    expect(response.status).toBe(403);
  });
});
