import { useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  groupOwnerPrimaryNamesAtom,
  groupArticleSearchPrefixesAtom,
  groupEpisodeSearchPrefixesAtom,
  isLoadingGroupOwnerNamesAtom,
  mySubscriptionGroupsAtom,
} from '../state/global/profile';
import { notificationPermissionAtom } from '../state/global/system';
import {
  GROUP_PRIVATE_ARTICLE,
  GROUP_PRIVATE_EPISODE,
} from '../utils/articleQdn';
import { SERVICE_DOCUMENT, useTestIdentifiers } from '../constants/qdn';

declare const qortalRequest: (params: any) => Promise<any>;

/**
 * Global hook: builds subscription search prefixes into atoms and, when
 * notification permission is granted, registers NOTIFICATION_ADD for
 * subscription content. Run once in Layout.
 */
export function useSubscriptionNotificationRegistration() {
  const { identifierOperations } = useGlobal();
  const notificationPermission = useAtomValue(notificationPermissionAtom);
  const memberGroups = useAtomValue(mySubscriptionGroupsAtom);
  const primaryNamesGroup = useAtomValue(groupOwnerPrimaryNamesAtom);
  const isLoadingGroupOwnerNames = useAtomValue(isLoadingGroupOwnerNamesAtom);
  const groupArticleSearchPrefixes = useAtomValue(
    groupArticleSearchPrefixesAtom
  );
  const groupEpisodeSearchPrefixes = useAtomValue(
    groupEpisodeSearchPrefixesAtom
  );
  const setGroupArticleSearchPrefixes = useSetAtom(
    groupArticleSearchPrefixesAtom
  );
  const setGroupEpisodeSearchPrefixes = useSetAtom(
    groupEpisodeSearchPrefixesAtom
  );

  // Build group subscription prefixes and store in global atoms
  useEffect(() => {
    if (
      isLoadingGroupOwnerNames ||
      !identifierOperations ||
      memberGroups === null
    ) {
      return;
    }
    console.log('memberGroups', memberGroups);
    const groupIds = Array.from(memberGroups.keys());
    if (groupIds.length === 0) {
      setGroupArticleSearchPrefixes([]);
      setGroupEpisodeSearchPrefixes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const groupArticlePrefixes = await Promise.all(
          groupIds.map((groupId) =>
            identifierOperations.buildSearchPrefix(
              groupId.toString(),
              '',
              GROUP_PRIVATE_ARTICLE
            )
          )
        );
        if (cancelled) return;
        setGroupArticleSearchPrefixes(groupArticlePrefixes);

        const groupEpisodePrefixes = await Promise.all(
          groupIds.map((groupId) =>
            identifierOperations.buildSearchPrefix(
              groupId.toString(),
              '',
              GROUP_PRIVATE_EPISODE
            )
          )
        );
        if (cancelled) return;
        setGroupEpisodeSearchPrefixes(groupEpisodePrefixes);
      } catch (err) {
        console.error('Failed to build subscription prefixes:', err);
        if (!cancelled) {
          setGroupArticleSearchPrefixes([]);
          setGroupEpisodeSearchPrefixes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    identifierOperations,
    isLoadingGroupOwnerNames,
    memberGroups,
    setGroupArticleSearchPrefixes,
    setGroupEpisodeSearchPrefixes,
  ]);

  console.log('notificationPermission', notificationPermission);

  // When permission is granted, register subscription notifications (global NOTIFICATION_ADD)
  useEffect(() => {
    if (!notificationPermission) return;
    if (
      !primaryNamesGroup?.length ||
      !groupArticleSearchPrefixes?.length ||
      !groupEpisodeSearchPrefixes?.length
    ) {
      return;
    }
    const appName = 'subwire';
    const baseFilters = {
      service: SERVICE_DOCUMENT,
      excludeBlocked: true,
      mode: 'ALL' as const,
    };
    const notifications: Array<{
      notificationId: string;
      link: string;
      image: string;
      message: { en: string };
      filters: {
        service: string;
        identifier: string;
        names: string[];
        excludeBlocked: boolean;
        mode: string;
      };
    }> = [];

    groupArticleSearchPrefixes.forEach((prefix, index) => {
      notifications.push({
        notificationId: `subwire-subscription-articles-${index}`,
        link: `qortal://app/${appName}/publication/{name}/{identifier}`,
        image: '/arbitrary/THUMBNAIL/Subwire/qortal_avatar?async=true',
        message: { en: 'You have a new subscription article' },
        filters: {
          ...baseFilters,
          identifier: prefix,
          names: primaryNamesGroup,
        },
      });
    });
    groupEpisodeSearchPrefixes.forEach((prefix, index) => {
      notifications.push({
        notificationId: `subwire-subscription-episodes-${index}`,
        link: `qortal://app/${appName}/publication/{name}/{identifier}`,
        image: '/arbitrary/THUMBNAIL/Subwire/qortal_avatar?async=true',
        message: { en: 'You have a new subscription episode' },
        filters: {
          ...baseFilters,
          identifier: prefix,
          names: primaryNamesGroup,
        },
      });
    });

    qortalRequest({
      action: 'NOTIFICATION_ADD',
      notifications,
    }).catch((err) => {
      console.error('Failed to add subscription notifications:', err);
    });
  }, [
    notificationPermission,
    primaryNamesGroup,
    groupArticleSearchPrefixes,
    groupEpisodeSearchPrefixes,
  ]);
}
