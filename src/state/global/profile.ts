import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface OwnedGroup {
  groupId: number;
  groupName: string;
  description?: string;
  memberCount?: number;
  [key: string]: any; // Allow for additional properties
}

// Store map of address -> preferred name for multi-account support
// This allows each address to remember which name they prefer to use
export const preferredNamesMapAtom = atomWithStorage<Record<string, string>>(
  'preferred_qortal_names_by_address',
  {}
);

// Atom to track if the user has a profile
// This will be updated after checking the cache
export const hasProfileAtom = atom<boolean>(false);

// Atom to store profile data
export const profileDataAtom = atom<{
  bio: string;
  qortalName?: string;
  avatar?: string;
  coverImage?: string; // Base64 encoded cover image
  groupId?: number; // Single private group attached to profile
} | null>(null);

// Atom to track if profile is being fetched/initialized
export const isLoadingProfileAtom = atom<boolean>(true);

// Atom to track which name the current profile data is for
// This prevents showing stale profile data when name changes
export const profileNameAtom = atom<string | null>(null);

// Atoms for owned groups - fetched once at app level
export const ownedGroupsAtom = atom<OwnedGroup[]>([]);
export const isLoadingOwnedGroupsAtom = atom<boolean>(false);
export const ownedGroupsErrorAtom = atom<string | null>(null);

// Store encryption preference for article publishing (per user)
// Key format: 'encryption_pref_{address}' to support multiple accounts
export const encryptionPreferenceAtom = atomWithStorage<Record<string, boolean>>(
  'article_encryption_preferences',
  {}
);

// Store metadata encryption preference for article publishing (per user)
// When true, also encrypt title/subtitle/coverImage. When false (default), keep them public.
// Key format: 'encrypt_metadata_{address}' to support multiple accounts
export const encryptMetadataPreferenceAtom = atomWithStorage<Record<string, boolean>>(
  'article_encrypt_metadata_preferences',
  {}
);

// Atom to store primary names of group owners that the user is a member of
export const groupOwnerPrimaryNamesAtom = atom<string[]>([]);
export const isLoadingGroupOwnerNamesAtom = atom<boolean>(false);

// Atom to store groups the user is a member of (for looking up group names by ID)
// Null means not yet loaded, Map means loaded (can be empty)
export const memberGroupsAtom = atom<Map<number, string> | null>(null);

// Groups the user is subscribed to (member of but not owner). Map<groupId, groupName>.
export const mySubscriptionGroupsAtom = atom<Map<number, string> | null>(null);

// Groups the user owns (for identifying own publications on discover page). Map<groupId, groupName>.
// Note: This is different from ownedGroupsAtom which stores full OwnedGroup[] for group management.
export const ownedGroupsMapAtom = atom<Map<number, string> | null>(null);

// Group subscription search prefixes (built globally for notifications + DiscoverPage)
export const groupArticleSearchPrefixesAtom = atom<string[] | null>(null);
export const groupEpisodeSearchPrefixesAtom = atom<string[] | null>(null);
