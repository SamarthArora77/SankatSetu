import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createUser,
  loginAgent,
  startTestServer,
  type TestServer,
  type TestAgent,
} from './helpers';

let server: TestServer;
let ngoAgent: TestAgent;
let otherNgoAgent: TestAgent;
let citizenAgent: TestAgent;
let resourceId: string;

beforeAll(async () => {
  server = await startTestServer();
  await createUser('NGO', 'ngo.one@test.dev', { name: 'NGO One', organization: 'Aid Collective' });
  await createUser('NGO', 'ngo.two@test.dev', { name: 'NGO Two', organization: 'Second Trust' });
  await createUser('CITIZEN', 'citizen@test.dev', { name: 'Citizen Test' });
  ngoAgent = await loginAgent(server.app, 'ngo.one@test.dev');
  otherNgoAgent = await loginAgent(server.app, 'ngo.two@test.dev');
  citizenAgent = await loginAgent(server.app, 'citizen@test.dev');
});

afterAll(async () => {
  await server.close();
});

describe('resource inventory', () => {
  it('lets an NGO register stock', async () => {
    const response = await ngoAgent.post('/api/v1/resources').send({
      name: 'Packaged Drinking Water',
      category: 'WATER',
      quantity: 1000,
      unit: 'bottles',
      warehouseName: 'Central Warehouse',
      location: { lat: 28.61, lng: 77.21 },
      criticalThreshold: 100,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.resource.availableQuantity).toBe(1000);
    expect(response.body.data.resource.organizationName).toBe('Aid Collective');
    resourceId = response.body.data.resource.id as string;
  });

  it('blocks non-NGO roles from creating stock', async () => {
    const response = await citizenAgent.post('/api/v1/resources').send({
      name: 'Blankets',
      category: 'SHELTER',
      quantity: 50,
      unit: 'pieces',
      warehouseName: 'Home garage',
      location: { lat: 28.61, lng: 77.21 },
    });
    expect(response.status).toBe(403);
  });

  it('blocks other NGOs from modifying someone else\'s stock', async () => {
    const response = await otherNgoAgent.patch(`/api/v1/resources/${resourceId}`).send({
      quantity: 5,
    });
    expect(response.status).toBe(403);
  });

  it('rejects stock levels where available exceeds total', async () => {
    const response = await ngoAgent.patch(`/api/v1/resources/${resourceId}`).send({
      availableQuantity: 5000,
    });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects dispatching more stock than is available', async () => {
    const response = await ngoAgent.post(`/api/v1/resources/${resourceId}/dispatch`).send({
      quantity: 5000,
      targetType: 'FIELD',
      targetName: 'Riverside distribution point',
    });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('INSUFFICIENT_STOCK');
  });

  it('dispatches available stock atomically', async () => {
    const response = await ngoAgent.post(`/api/v1/resources/${resourceId}/dispatch`).send({
      quantity: 250,
      targetType: 'FIELD',
      targetName: 'Riverside distribution point',
      notes: 'First consignment for the morning shift.',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.resource.availableQuantity).toBe(750);
    expect(response.body.data.dispatch.quantity).toBe(250);
  });
});
