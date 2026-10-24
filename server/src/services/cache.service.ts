import crypto from 'node:crypto';
import { bumpCacheVersion, cacheGet, cacheSet, getCacheVersion, isRedisAvailable } from '../config/redis';

const PUBLIC_NAMESPACE = 'public';
const DEFAULT_TTL_SECONDS = 20;

function hashKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export async function cachedPublic<T>(
  scope: string,
  params: Record<string, unknown>,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  if (!isRedisAvailable()) {
    return { data: await fetcher(), cached: false };
  }

  const version = await getCacheVersion(PUBLIC_NAMESPACE);
  const key = `v1:${scope}:v${version}:${hashKey(JSON.stringify(params))}`;
  const hit = await cacheGet<T>(key);
  if (hit !== null) {
    return { data: hit, cached: true };
  }

  const data = await fetcher();
  await cacheSet(key, data, Math.max(1, ttlSeconds));
  return { data, cached: false };
}

export async function invalidatePublicCache(): Promise<void> {
  await bumpCacheVersion(PUBLIC_NAMESPACE).catch((error) =>
    console.warn('[cache] Invalidation failed:', error instanceof Error ? error.message : error),
  );
}

export { DEFAULT_TTL_SECONDS };
