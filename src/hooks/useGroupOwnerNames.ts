import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  groupOwnerPrimaryNamesAtom,
  isLoadingGroupOwnerNamesAtom,
  memberGroupsAtom,
} from '../state/global/profile';
import {
  getCachedPrimaryName,
  setCachedPrimaryName,
  cleanupExpiredPrimaryNames,
} from '../utils/primaryNamesCache';

/**
 * Hook to fetch and store primary names of group owners
 * for groups where the authenticated user is a member.
 * Uses 24-hour cache to avoid refetching primary names on each refresh.
 */
export function useGroupOwnerNames() {
  const { auth } = useGlobal();
  const [groupOwnerNames, setGroupOwnerNames] = useAtom(
    groupOwnerPrimaryNamesAtom
  );
  const [isLoading, setIsLoading] = useAtom(isLoadingGroupOwnerNamesAtom);
  const setMemberGroups = useSetAtom(memberGroupsAtom);

  useEffect(() => {
    const fetchGroupOwnerNames = async () => {
      // Only fetch if we have an authenticated address
      if (!auth?.address) {
        setGroupOwnerNames([]);
        setMemberGroups(new Map());
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Clean up expired cache entries in the background
        cleanupExpiredPrimaryNames().catch(console.error);

        // Fetch groups where the user is a member (always fetch fresh)
        const groupsResponse = await fetch(`/groups/member/${auth.address}`);
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch groups');
        }

        const groups = await groupsResponse.json();
        const groupsFiltered = groups.filter((group: any) => !group?.isOpen);

        if (!Array.isArray(groupsFiltered) || groupsFiltered.length === 0) {
          setGroupOwnerNames([]);
          setMemberGroups(new Map());
          setIsLoading(false);
          return;
        }

        // Create a map of groupId -> groupName for easy lookup
        const groupsMap = new Map<number, string>();
        groupsFiltered.forEach((group: any) => {
          if (group.groupId && group.groupName) {
            groupsMap.set(group.groupId, group.groupName);
          }
        });
        setMemberGroups(groupsMap);

        // Extract unique owners from the groups
        const uniqueOwners = Array.from(
          new Set(
            groupsFiltered
              .map((group: any) => group.owner)
              .filter((owner: any) => owner) // Filter out null/undefined
          )
        ) as string[];

        // Fetch primary name for each owner (with caching)
        const primaryNamesPromises = uniqueOwners.map(async (owner) => {
          try {
            // Check cache first
            const cachedName = await getCachedPrimaryName(owner);

            // If we have a cached value (even if null), use it
            if (cachedName !== undefined) {
              return cachedName;
            }

            // Cache miss, fetch from API
            const response = await fetch(`/names/primary/${owner}`);
            if (!response.ok) {
              // Cache the null result to avoid repeated failed requests
              return null;
            }

            const name = await response.json();
            const primaryName = name?.name || null;

            // Cache the result
            if (primaryName) {
              await setCachedPrimaryName(owner, primaryName);
            }

            return primaryName;
          } catch (error) {
            console.error(`Failed to fetch name for owner ${owner}:`, error);
            // Cache null on error to avoid repeated failed requests

            return null;
          }
        });

        const primaryNames = await Promise.all(primaryNamesPromises);

        // Filter out null values and store the list
        const validNames = primaryNames.filter(
          (name): name is string => name !== null
        );
        setGroupOwnerNames(validNames);
      } catch (error) {
        console.error('Error fetching group owner names:', error);
        setGroupOwnerNames([]);
        setMemberGroups(new Map());
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupOwnerNames();
  }, [auth?.address, setGroupOwnerNames, setIsLoading, setMemberGroups]);
}

