import { createClient, type RedisClientType } from 'redis';
import { env } from './env';

let client: RedisClientType | null = null;
let available = false;

export function isRedisAvailable(): boolean {
  return available;
}

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    console.log('[redis] REDIS_URL is not set. Caching is disabled.');
    return;
  }

  client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 2500,
      reconnectStrategy: false,
    },
  });

  client.on('error', (error) => {
    if (available) {
      console.warn('[redis] Connection error; cache disabled:', error.message);
    }
    available = false;
  });

  try {
    await client.connect();
    available = true;
    console.log('[redis] Connected. Public map caching is enabled.');
  } catch (error) {
    available = false;
    const message = error instanceof Error ? error.message : 'unknown error';
    console.warn(`[redis] Unavailable; continuing without cache (${message}).`);
    try {
      await client.disconnect();
    } catch {
      // Ignore cleanup failures.
    }
    client = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!available || !client) return null;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.warn('[redis] Cache read failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!available || !client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.warn('[redis] Cache write failed:', error instanceof Error ? error.message : error);
  }
}

export async function getCacheVersion(namespace: string): Promise<number> {
  if (!available || !client) return 0;
  try {
    const value = await client.get(`${namespace}:version`);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

export async function bumpCacheVersion(namespace: string): Promise<void> {
  if (!available || !client) return;
  try {
    await client.incr(`${namespace}:version`);
  } catch (error) {
    console.warn('[redis] Cache invalidation failed:', error instanceof Error ? error.message : error);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    try {
      await client.disconnect();
    } catch {
      // Ignore cleanup failures.
    }
  }
  client = null;
  available = false;
}
