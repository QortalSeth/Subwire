import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  hasProfileAtom,
  profileDataAtom,
  isLoadingProfileAtom,
  profileNameAtom,
} from '../state/global/profile';
import { fetchProfileFromQdn } from '../utils/profileQdn';
import {
  loadProfileFromCache,
  saveProfileToCache,
} from '../utils/profileCache';

/**
 * Hook to initialize the user's profile from cache or QDN
 * Automatically loads the profile when the user authenticates
 */
export const useInitializeProfile = () => {
  const { auth, identifierOperations } = useGlobal();
  const setHasProfile = useSetAtom(hasProfileAtom);
  const setProfileData = useSetAtom(profileDataAtom);
  const setIsLoadingProfile = useSetAtom(isLoadingProfileAtom);
  const setProfileName = useSetAtom(profileNameAtom);

  // Track previous values to prevent infinite re-renders
  const prevAuthNameRef = useRef<string>('');
  const prevIdentifierOperationsRef = useRef<string>('');

  useEffect(() => {
    const currentAuthName = auth?.name || '';
    const currentIdentifierOperations = identifierOperations ? 'present' : '';

    if (
      currentAuthName === prevAuthNameRef.current &&
      currentIdentifierOperations === prevIdentifierOperationsRef.current
    ) {
      return;
    }

    prevAuthNameRef.current = currentAuthName;
    prevIdentifierOperationsRef.current = currentIdentifierOperations;

    const initializeProfile = async () => {
      // Only try to load if user is authenticated and has a name
      if (!auth?.name) {
        // User is not authenticated or doesn't have a name
        // Clear profile state
        setHasProfile(false);
        setProfileData(null);
        setProfileName(null);
        setIsLoadingProfile(false);
        return;
      }

      // User has a name, start loading profile
      setIsLoadingProfile(true);

      // Reset profile state for new name
      setHasProfile(false);
      setProfileData(null);
      setProfileName(null);

      try {
        // Step 1: Check cache first (fast)
        const cachedProfile = await loadProfileFromCache(auth.name);

        if (cachedProfile) {
          setProfileData(cachedProfile);
          setHasProfile(true);
          setProfileName(auth.name);
          setIsLoadingProfile(false);
          return;
        }

        // Step 2: Cache miss - fetch from QDN (authoritative source)
        const { profile } = await fetchProfileFromQdn(
          auth.name,
          identifierOperations
        );

        if (profile) {
          // Profile exists on QDN
          setProfileData(profile);
          setHasProfile(true);
          setProfileName(auth.name);

          // Cache it for future page loads (5 minute expiry)
          await saveProfileToCache(auth.name, profile);
        } else {
          // Profile doesn't exist - clear state and let user create profile
          setHasProfile(false);
          setProfileData(null);
          setProfileName(null);
        }
      } catch (error) {
        console.error('Error initializing profile:', error);
        // Error occurred - assume no profile and let user create one
        setHasProfile(false);
        setProfileData(null);
        setProfileName(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    initializeProfile();
  }, [
    auth?.name,
    identifierOperations,
    setHasProfile,
    setProfileData,
    setIsLoadingProfile,
    setProfileName,
  ]);
};

