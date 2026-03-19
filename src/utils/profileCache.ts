/**
 * Profile Cache Utilities
 *
 * Handles local caching of user profiles in IndexedDB for faster loading
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ProfileCacheDB extends DBSchema {
  profiles: {
    key: string; // qortalName
    value: {
      qortalName: string;
      bio: string;
      avatar?: string;
      coverImage?: string;
      groupId?: number;
      cachedAt: number; // Timestamp when cached
      expiresAt: number; // Timestamp when cache expires
    };
  };
}

const DB_NAME = 'subwire-profile-cache';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let dbPromise: Promise<IDBPDatabase<ProfileCacheDB>> | null = null;

/**
 * Initialize the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase<ProfileCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProfileCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'qortalName' });
        }
      },
    });
  }
  return dbPromise;
}

interface CachedProfile {
  qortalName: string;
  bio: string;
  avatar?: string;
  coverImage?: string;
  groupId?: number;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Save a profile to the cache
 * @param qortalName - The Qortal name
 * @param profile - The profile data to cache
 */
export async function saveProfileToCache(
  qortalName: string,
  profile: {
    bio: string;
    avatar?: string;
    coverImage?: string;
    groupId?: number;
  }
): Promise<void> {
  try {
    const db = await getDB();
    const now = Date.now();

    const cachedProfile: CachedProfile = {
      qortalName,
      bio: profile.bio,
      avatar: profile.avatar,
      coverImage: profile.coverImage,
      groupId: profile.groupId,
      cachedAt: now,
      expiresAt: now + CACHE_DURATION,
    };

    await db.put(STORE_NAME, cachedProfile);
  } catch (error) {
    console.error('Error saving profile to cache:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Load a profile from the cache
 * @param qortalName - The Qortal name
 * @returns Cached profile or null if not found/expired
 */
export async function loadProfileFromCache(qortalName: string): Promise<{
  bio: string;
  avatar?: string;
  coverImage?: string;
  groupId?: number;
} | null> {
  try {
    const db = await getDB();
    const cachedProfile = await db.get(STORE_NAME, qortalName);

    if (!cachedProfile) {
      return null;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now > cachedProfile.expiresAt) {
      // Cache expired, remove it
      await db.delete(STORE_NAME, qortalName);
      return null;
    }

    return {
      bio: cachedProfile.bio,
      avatar: cachedProfile.avatar,
      coverImage: cachedProfile.coverImage,
      groupId: cachedProfile.groupId,
    };
  } catch (error) {
    console.error('Error loading profile from cache:', error);
    return null;
  }
}

/**
 * Clear a specific profile from the cache
 * @param qortalName - The Qortal name
 */
export async function clearProfileCache(qortalName: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, qortalName);
  } catch (error) {
    console.error('Error clearing profile cache:', error);
  }
}

/**
 * Clear all expired profiles from the cache
 */
export async function clearExpiredProfiles(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allProfiles = await store.getAll();

    const now = Date.now();
    for (const profile of allProfiles) {
      if (now > profile.expiresAt) {
        await store.delete(profile.qortalName);
      }
    }

    await tx.done;
  } catch (error) {
    console.error('Error clearing expired profiles:', error);
  }
}

/**
 * Clear all profiles from the cache
 */
export async function clearAllProfiles(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Error clearing all profiles:', error);
  }
}
