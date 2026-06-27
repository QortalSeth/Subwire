import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  groupOwnerPrimaryNamesAtom,
  isLoadingGroupOwnerNamesAtom,
  memberGroupsAtom,
  mySubscriptionGroupsAtom,
  ownedGroupsMapAtom,
} from '../state/global/profile';

/**
 * Hook to fetch and store primary names of group owners
 * for groups where the authenticated user is a member.
 * Uses ownerPrimaryName from the member-groups API response (no per-owner fetch).
 */
export function useGroupOwnerNames() {
  const { auth } = useGlobal();
  const setGroupOwnerNames = useSetAtom(groupOwnerPrimaryNamesAtom);
  const setIsLoading = useSetAtom(isLoadingGroupOwnerNamesAtom);
  const setMemberGroups = useSetAtom(memberGroupsAtom);
  const setMySubscriptionGroups = useSetAtom(mySubscriptionGroupsAtom);
  const setOwnedGroupsMap = useSetAtom(ownedGroupsMapAtom);

  // Track previous values to prevent infinite re-renders
  const prevAuthAddressRef = useRef<string>('');

  useEffect(() => {
    const currentAuthAddress = auth?.address || '';

    if (currentAuthAddress === prevAuthAddressRef.current) {
      return;
    }

    prevAuthAddressRef.current = currentAuthAddress;

    const fetchGroupOwnerNames = async () => {
      if (!auth?.address) {
        setGroupOwnerNames([]);
        setMemberGroups(new Map());
        setMySubscriptionGroups(new Map());
        setOwnedGroupsMap(new Map());
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const groupsResponse = await fetch(`/groups/member/${auth.address}`);
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch groups');
        }

        const groups = await groupsResponse.json();
        const groupsFiltered = groups.filter((group: any) => !group?.isOpen);

        if (!Array.isArray(groupsFiltered) || groupsFiltered.length === 0) {
          setGroupOwnerNames([]);
          setMemberGroups(new Map());
          setMySubscriptionGroups(new Map());
          setOwnedGroupsMap(new Map());
          setIsLoading(false);
          return;
        }

        // All member groups (including owned)
        const groupsMap = new Map<number, string>();
        groupsFiltered.forEach((group: any) => {
          if (group.groupId && group.groupName) {
            groupsMap.set(group.groupId, group.groupName);
          }
        });
        setMemberGroups(groupsMap);

        // Groups user owns (for identifying own publications on discover page)
        const ownedGroupsMap = new Map<number, string>();
        groupsFiltered
          .filter((group: any) => group?.owner === auth?.address)
          .forEach((group: any) => {
            if (group.groupId && group.groupName) {
              ownedGroupsMap.set(group.groupId, group.groupName);
            }
          });
        setOwnedGroupsMap(ownedGroupsMap);

        // Groups user is subscribed to (member but not owner)
        const groupsSubscriptionMap = new Map<number, string>();
        groupsFiltered
          .filter((group: any) => group?.owner !== auth?.address)
          .forEach((group: any) => {
            if (group.groupId && group.groupName) {
              groupsSubscriptionMap.set(group.groupId, group.groupName);
            }
          });
        setMySubscriptionGroups(groupsSubscriptionMap);

        // All group owner names (including own - for discover page filtering)
        const validNames = Array.from(
          new Set(
            groupsFiltered
              .map((group: any) => group.ownerPrimaryName)
              .filter((name): name is string => Boolean(name))
          )
        );
        setGroupOwnerNames(validNames);
      } catch (error) {
        console.error('Error fetching group owner names:', error);
        setGroupOwnerNames([]);
        setMemberGroups(new Map());
        setMySubscriptionGroups(new Map());
        setOwnedGroupsMap(new Map());
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupOwnerNames();
  }, [
    auth?.address,
    setGroupOwnerNames,
    setIsLoading,
    setMemberGroups,
    setMySubscriptionGroups,
    setOwnedGroupsMap,
  ]);
}
