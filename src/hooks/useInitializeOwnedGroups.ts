import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  ownedGroupsAtom,
  isLoadingOwnedGroupsAtom,
  ownedGroupsErrorAtom,
} from '../state/global/profile';

/**
 * Hook to initialize owned groups from API
 * This should be called once at the app root level when auth?.address is available
 */
export const useInitializeOwnedGroups = () => {
  const { auth } = useGlobal();
  const [, setOwnedGroups] = useAtom(ownedGroupsAtom);
  const [, setIsLoading] = useAtom(isLoadingOwnedGroupsAtom);
  const [, setError] = useAtom(ownedGroupsErrorAtom);

  // Track previous values to prevent infinite re-renders
  const prevAuthAddressRef = useRef<string>('');

  useEffect(() => {
    const currentAuthAddress = auth?.address || '';

    if (currentAuthAddress === prevAuthAddressRef.current) {
      return;
    }

    prevAuthAddressRef.current = currentAuthAddress;

    const fetchOwnedGroups = async () => {
      if (!auth?.address) {
        setOwnedGroups([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/groups/owner/${auth.address}`);

        if (!response.ok) {
          if (response.status === 404) {
            // No groups found is not an error
            setOwnedGroups([]);
            return;
          }
          throw new Error(`Failed to fetch groups: ${response.statusText}`);
        }

        const data = await response.json();
        // Handle both array and object responses
        const groupsArray = Array.isArray(data) ? data : data.groups || [];
        setOwnedGroups(groupsArray.filter((group: any) => !group.isOpen));
      } catch (err) {
        console.error('Error fetching owned groups:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch groups');
        setOwnedGroups([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOwnedGroups();
  }, [auth?.address, setOwnedGroups, setIsLoading, setError]);
};

