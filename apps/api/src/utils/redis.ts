/**
 * Redis Client Configuration
 * Uses validated env from env.ts
 */
import { createClient } from "redis";
import { env } from "../env.js";

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on("error", (err) => {
  console.error("Redis error", err);
});

export async function ensureRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
