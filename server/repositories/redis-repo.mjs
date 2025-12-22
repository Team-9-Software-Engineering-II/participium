import redisClient from "../config/redis.mjs";

const TTL_SECONDS = 1800;

/**
 * Saves temporary registration data to Redis.
 * Key: email (specifically a prefix + email)
 * Value: JSON object containing user data and the verification code
 */
export async function saveTemporaryUser(email, userData, verificationCode) {
  const key = `registration:${email}`;
  const value = JSON.stringify({
    ...userData,
    verificationCode,
  });

  await redisClient.set(key, value, {
    EX: TTL_SECONDS,
  });
}

/**
 * Retrieves temporary data given the email.
 */
export async function getTemporaryUser(email) {
  const key = `registration:${email}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Deletes temporary data (to be called after successful verification).
 */
export async function deleteTemporaryUser(email) {
  const key = `registration:${email}`;
  await redisClient.del(key);
}
