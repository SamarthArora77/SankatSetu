import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';
import { User } from '../src/models/User';
import type { Role } from '../src/utils/constants';

export const TEST_PASSWORD = 'TestPass!2345';

export interface TestServer {
  app: Express;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('sankatsetu-test');
  const { connectDB, disconnectDB } = await import('../src/config/db');
  await connectDB(process.env.MONGODB_URI);
  const { createApp } = await import('../src/app');
  return {
    app: createApp(),
    close: async () => {
      await disconnectDB();
      await mongod.stop();
    },
  };
}

export async function createUser(role: Role, email: string, overrides: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return User.create({
    name: overrides.name ?? `${role.charAt(0)}${role.slice(1).toLowerCase()} Test`,
    email,
    passwordHash,
    role,
    ...overrides,
  });
}

export async function createResponder(email: string, name: string, team = 'Test Response Unit') {
  return createUser('RESPONDER', email, {
    name,
    responderProfile: {
      team,
      vehicleType: 'AMBULANCE',
      status: 'AVAILABLE',
      equipment: ['First-aid kit'],
    },
  });
}

export type TestAgent = ReturnType<typeof request.agent>;

export async function loginAgent(app: Express, email: string): Promise<TestAgent> {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}

export function emergencyPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Flooded lane needs rescue boats',
    description: 'Water is waist deep and three families are trapped on the upper floors.',
    category: ['FLOOD', 'RESCUE'],
    location: { lat: 28.61, lng: 77.21, address: '12 Test Lane' },
    urgency: 'HIGH',
    peopleCount: 8,
    isAnonymous: true,
    ...overrides,
  };
}
