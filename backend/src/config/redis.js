import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isRedisConnected = false;

// In-memory fallback cache
const inMemoryCache = new Map();

export async function initializeRedis() {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const url = `redis://${host}:${port}`;

  try {
    redisClient = createClient({
      url,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('Redis connection retries exceeded. Disabling Redis backend integration.');
            isRedisConnected = false;
            return false; // stop reconnecting
          }
          return 1000;
        }
      }
    });

    redisClient.on('error', (err) => {
      // Avoid crash on error, log and fallback
      console.warn('Redis Connection Warning:', err.message || err);
      isRedisConnected = false;
    });

    await redisClient.connect();
    console.log(`Connected to Redis at ${url}`);
    isRedisConnected = true;
  } catch (error) {
    console.warn('Could not establish initial Redis connection. Using in-memory cache fallback.');
    isRedisConnected = false;
    redisClient = null;
  }
}

export async function cacheSet(key, value, expirySeconds = 300) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: expirySeconds });
      return;
    } catch (e) {
      console.warn('Redis set error:', e.message);
    }
  }
  inMemoryCache.set(key, {
    data: value,
    expiry: Date.now() + (expirySeconds * 1000)
  });
}

export async function cacheGet(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Redis get error:', e.message);
    }
  }

  const cached = inMemoryCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    inMemoryCache.delete(key);
    return null;
  }
  return cached.data;
}

export async function cacheDelete(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (e) {
      console.warn('Redis delete error:', e.message);
    }
  }
  inMemoryCache.delete(key);
}

export async function cacheFlush() {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.flushAll();
      return;
    } catch (e) {
      console.warn('Redis flush error:', e.message);
    }
  }
  inMemoryCache.clear();
}
