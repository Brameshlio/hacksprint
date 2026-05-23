/**
 * deviceSession.js — NutriChain AI Consumer Device UUID Factory
 * ---------------------------------------------------------------
 * Generates and permanently stores a browser-local consumer UUID
 * using crypto.randomUUID() (or a fallback) in localStorage.
 * This UUID is the primary claimant key for scan-limiter Rule C.
 */

const STORAGE_KEY = 'nutrichain_consumer_uuid';

/**
 * Generates a cryptographically-strong UUID string with a branded prefix.
 * Uses native crypto.randomUUID() when available (all modern browsers),
 * otherwise falls back to a manual RFC4122-v4 implementation.
 * @returns {string}  e.g. "NC-ID-550e8400-e29b-41d4-a716-446655440000"
 */
const generateBrandedUUID = () => {
  let raw;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    raw = crypto.randomUUID();
  } else {
    // Manual RFC4122 v4 UUID fallback for older environments
    raw = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return `NC-ID-${raw}`;
};

/**
 * Synchronous accessor — returns the existing consumer UUID from localStorage,
 * or mints a fresh one and commits it permanently before returning.
 * @returns {string} The permanent device-scoped consumer UUID.
 */
export const getOrCreateConsumerUUID = () => {
  try {
    let uuid = localStorage.getItem(STORAGE_KEY);
    if (!uuid) {
      uuid = generateBrandedUUID();
      localStorage.setItem(STORAGE_KEY, uuid);
      console.log(`🔑 [NutriChain] New consumer device UUID minted: ${uuid}`);
    }
    return uuid;
  } catch (err) {
    // If localStorage is blocked (private browser mode), return a session-only UUID
    console.warn('⚠️ [NutriChain] localStorage unavailable. Using session-scoped UUID.', err);
    return generateBrandedUUID();
  }
};

export default getOrCreateConsumerUUID;
