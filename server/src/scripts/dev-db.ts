import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const port = Number(process.env.DEV_DB_PORT ?? 27017);
  const dbName = process.env.DEV_DB_NAME ?? 'sankatsetu';

  const server = await MongoMemoryServer.create({
    instance: { port, dbName, ip: '127.0.0.1' },
  });

  console.log(`[dev-db] In-memory MongoDB running at ${server.getUri()}${dbName}`);
  console.log('[dev-db] Data is ephemeral and is discarded when this process stops.');
  console.log('[dev-db] Press Ctrl+C to stop.');

  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

main().catch((error) => {
  console.error('[dev-db] Failed to start in-memory MongoDB:', error);
  process.exit(1);
});
