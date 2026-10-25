import http from 'node:http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { initializeSockets } from './sockets';

async function bootstrap() {
  await connectDB();
  await connectRedis();

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = initializeSockets(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[server] SankatSetu API listening on http://localhost:${env.PORT}`);
    console.log(`[server] Allowed client origins: ${env.clientOrigins.join(', ')}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} received. Shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error('[server] Graceful shutdown timed out. Exiting.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await disconnectRedis();
    await disconnectDB();
    clearTimeout(forceExit);
    console.log('[server] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});
