import mongoose from 'mongoose';
import { env } from './env';

let listenersAttached = false;

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('error', (error) => {
    console.error('[db] MongoDB connection error:', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected.');
  });
}

function safeTarget(uri: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return 'configured MongoDB instance';
  }
}

export async function connectDB(uri: string = env.MONGODB_URI): Promise<void> {
  attachListeners();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      });
      console.log(`[db] Connected to MongoDB (${safeTarget(uri)}).`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`[db] Connection attempt ${attempt}/${attempts} failed.`);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown MongoDB connection error';
  throw new Error(`Could not connect to MongoDB: ${message}`);
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
