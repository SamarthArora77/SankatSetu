import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createUser,
  loginAgent,
  startTestServer,
  TEST_PASSWORD,
  type TestServer,
} from './helpers';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.close();
});

describe('auth', () => {
  it('registers a public user and sets an HttpOnly auth cookie', async () => {
    const response = await request(server.app).post('/api/v1/auth/register').send({
      name: 'Test Citizen',
      email: 'citizen@test.dev',
      password: TEST_PASSWORD,
      role: 'CITIZEN',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('citizen@test.dev');
    expect(response.body.data.user.role).toBe('CITIZEN');
    expect(response.body.data.user.passwordHash).toBeUndefined();

    const cookies = (response.headers['set-cookie'] as unknown as string[]).map(String);
    const accessCookie = cookies.find((cookie) => cookie.startsWith('rs_access='));
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain('HttpOnly');
  });

  it('rejects duplicate email registration', async () => {
    const payload = {
      name: 'Duplicate User',
      email: 'dupe@test.dev',
      password: TEST_PASSWORD,
      role: 'CITIZEN',
    };
    await request(server.app).post('/api/v1/auth/register').send(payload);
    const response = await request(server.app).post('/api/v1/auth/register').send(payload);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('rejects client-supplied privileged roles', async () => {
    for (const role of ['ADMIN', 'RESPONDER', 'NGO']) {
      const response = await request(server.app).post('/api/v1/auth/register').send({
        name: 'Role Escalator',
        email: `escalator-${role.toLowerCase()}@test.dev`,
        password: TEST_PASSWORD,
        role,
      });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }
  });

  it('rejects login with an incorrect password', async () => {
    await createUser('CITIZEN', 'wrongpw@test.dev');
    const response = await request(server.app).post('/api/v1/auth/login').send({
      email: 'wrongpw@test.dev',
      password: 'CompletelyWrong1!',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects /me without credentials', async () => {
    const response = await request(server.app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('authenticates /me with a valid session', async () => {
    await createUser('VOLUNTEER', 'me@test.dev');
    const agent = await loginAgent(server.app, 'me@test.dev');

    const response = await agent.get('/api/v1/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('me@test.dev');
    expect(response.body.data.user.role).toBe('VOLUNTEER');
  });

  it('logout revokes the current session', async () => {
    await createUser('DONOR', 'logout@test.dev');
    const agent = await loginAgent(server.app, 'logout@test.dev');

    expect((await agent.get('/api/v1/auth/me')).status).toBe(200);
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });
});
