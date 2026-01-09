import { createClient } from "redis";
import logger from "../shared/logging/logger.mjs";

/** @type {Object} The initialized Redis client instance or an in-memory mock. */
let redisClient;

/** @type {boolean} Indicates if the current environment is set to testing. */
const isTest = process.env.NODE_ENV === "test";

/** * Detects if the module is being executed within a Jest Unit Test context.
 * In ESM, if 'createClient' has been replaced by a Jest spy/mock, it will possess a '.mock' property.
 * @type {boolean}
 */
const isUnitTesting = typeof createClient.mock !== "undefined";

if (isTest && !isUnitTesting) {
  // --- MOCK FOR INTEGRATION TESTING ---
  const storage = new Map();
  redisClient = {
    isOpen: false,
    connect: async () => {
      redisClient.isOpen = true;
      return Promise.resolve();
    },
    quit: async () => {
      redisClient.isOpen = false;
      return Promise.resolve();
    },
    on: () => redisClient,
    set: async (key, value) => {
      storage.set(key, value);
      return "OK";
    },
    get: async (key) => storage.get(key) || null,
    del: async (key) => storage.delete(key),
  };
} else {
  // --- REAL LOGIC AND UNIT TEST COMPATIBILITY ---
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) => {
    if (process.env.NODE_ENV !== "test" || isUnitTesting) {
      logger.error("Redis Client Error", err);
    }
  });

  redisClient.on("connect", () => {
    if (process.env.NODE_ENV !== "test" || isUnitTesting) {
      logger.info("Redis Client Connected");
    }
  });
}

/**
 * Safely executes the Redis connection logic.
 */
export const connectRedis = async () => {
  if (redisClient && typeof redisClient.connect === "function") {
    const maybePromise = redisClient.connect();

    if (maybePromise instanceof Promise) {
      await maybePromise.catch(() => {
        // Connection errors are handled via the 'error' event listener
      });
    }
  }
};

export default redisClient;
