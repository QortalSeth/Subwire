import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useGlobal } from 'qapp-core';
import {
  groupOwnerPrimaryNamesAtom,
  groupArticleSearchPrefixesAtom,
  groupEpisodeSearchPrefixesAtom,
  isLoadingGroupOwnerNamesAtom,
  memberGroupsAtom,
} from '../state/global/profile';
import { notificationPermissionAtom } from '../state/global/system';
import {
  GROUP_PRIVATE_ARTICLE,
  GROUP_PRIVATE_EPISODE,
} from '../utils/articleQdn';
import { SERVICE_DOCUMENT } from '../constants/qdn';

declare const qortalRequest: (params: any) => Promise<any>;

type NotificationMessage = Record<string, string>;

const SUBSCRIPTION_ARTICLE_NOTIFICATION_MESSAGE: NotificationMessage = {
  en: 'You have a new subscription article',
  de: 'Du hast einen neuen Abo-Artikel',
  ar: 'لديك مقالة اشتراك جديدة',
  fi: 'Sinulla on uusi tilausartikkeli',
  it: 'Hai un nuovo articolo in abbonamento',
  et: 'Sul on uus tellimusartikkel',
  ru: 'У вас новая статья по подписке',
  fr: 'Vous avez un nouvel article d’abonnement',
  pt: 'Tens um novo artigo de subscrição',
  es: 'Tienes un nuevo artículo de suscripción',
  ja: '新しい購読記事があります',
  zh: '你有一篇新的订阅文章',
};

const SUBSCRIPTION_EPISODE_NOTIFICATION_MESSAGE: NotificationMessage = {
  en: 'You have a new subscription episode',
  de: 'Du hast eine neue Abo-Folge',
  ar: 'لديك حلقة اشتراك جديدة',
  fi: 'Sinulla on uusi tilausjakso',
  it: 'Hai un nuovo episodio in abbonamento',
  et: 'Sul on uus tellimusosa',
  ru: 'У вас новый выпуск по подписке',
  fr: 'Vous avez un nouvel épisode d’abonnement',
  pt: 'Tens um novo episódio de subscrição',
  es: 'Tienes un nuevo episodio de suscripción',
  ja: '新しい購読エピソードがあります',
  zh: '你有一集新的订阅内容',
};

/**
 * Global hook: builds subscription search prefixes into atoms and, when
 * notification permission is granted, registers NOTIFICATION_ADD for
 * subscription content. Run once in Layout.
 */
export function useSubscriptionNotificationRegistration() {
  const { identifierOperations } = useGlobal();
  const notificationPermission = useAtomValue(notificationPermissionAtom);
  const memberGroups = useAtomValue(memberGroupsAtom);
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

  // Track previous values to detect when they actually change
  const prevMemberGroupsRef = useRef<string>('');
  const prevGroupArticlePrefixesRef = useRef<string>('');
  const prevGroupEpisodePrefixesRef = useRef<string>('');
  
  // Build group subscription prefixes and store in global atoms
  useEffect(() => {
    if (
      isLoadingGroupOwnerNames ||
      !identifierOperations ||
      memberGroups === null
    ) {
      return;
    }

    const groupIds = Array.from(memberGroups.keys());
    const groupIdsString = JSON.stringify(groupIds);
    
    // Only rebuild if groupIds actually changed
    if (groupIdsString === prevMemberGroupsRef.current) {
      return;
    }
    
    prevMemberGroupsRef.current = groupIdsString;
    
    if (groupIds.length === 0) {
      if (prevGroupArticlePrefixesRef.current !== '[]') {
        prevGroupArticlePrefixesRef.current = '[]';
        setGroupArticleSearchPrefixes([]);
      }
      if (prevGroupEpisodePrefixesRef.current !== '[]') {
        prevGroupEpisodePrefixesRef.current = '[]';
        setGroupEpisodeSearchPrefixes([]);
      }
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
        
        const articlePrefixesString = JSON.stringify(groupArticlePrefixes);
        if (articlePrefixesString !== prevGroupArticlePrefixesRef.current) {
          prevGroupArticlePrefixesRef.current = articlePrefixesString;
          setGroupArticleSearchPrefixes(groupArticlePrefixes);
        }

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
        
        const episodePrefixesString = JSON.stringify(groupEpisodePrefixes);
        if (episodePrefixesString !== prevGroupEpisodePrefixesRef.current) {
          prevGroupEpisodePrefixesRef.current = episodePrefixesString;
          setGroupEpisodeSearchPrefixes(groupEpisodePrefixes);
        }
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

  // Track previous values for notification registration
  const prevNotificationValuesRef = useRef<string>('');
  
  // When permission is granted, register subscription notifications (global NOTIFICATION_ADD)
  useEffect(() => {
    if (!notificationPermission) return;
    if (
      !memberGroups?.size ||
      !primaryNamesGroup?.length ||
      !groupArticleSearchPrefixes?.length ||
      !groupEpisodeSearchPrefixes?.length
    ) {
      return;
    }
    
    // Create a string representation of all dependencies to detect actual changes
    const currentValues = JSON.stringify({
      memberGroupsSize: memberGroups.size,
      primaryNamesGroupLength: primaryNamesGroup.length,
      groupArticleSearchPrefixesLength: groupArticleSearchPrefixes.length,
      groupEpisodeSearchPrefixesLength: groupEpisodeSearchPrefixes.length,
    });
    
    // Only register if values actually changed
    if (currentValues === prevNotificationValuesRef.current) {
      return;
    }
    
    prevNotificationValuesRef.current = currentValues;
    
    const groupIds = Array.from(memberGroups.keys());
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
      message: NotificationMessage;
      filters: {
        service: string;
        identifier: string;
        names: string[];
        excludeBlocked: boolean;
        mode: string;
      };
    }> = [];

    groupArticleSearchPrefixes.forEach((prefix, index) => {
      const groupId = groupIds[index];
      notifications.push({
        notificationId: `subwire-subscription-articles-${groupId}`,
        link: `qortal://app/${appName}/publication/{name}/{identifier}`,
        image: '/arbitrary/THUMBNAIL/Subwire/qortal_avatar?async=true',
        message: SUBSCRIPTION_ARTICLE_NOTIFICATION_MESSAGE,
        filters: {
          ...baseFilters,
          identifier: prefix,
          names: primaryNamesGroup,
        },
      });
    });
    groupEpisodeSearchPrefixes.forEach((prefix, index) => {
      const groupId = groupIds[index];
      notifications.push({
        notificationId: `subwire-subscription-episodes-${groupId}`,
        link: `qortal://app/${appName}/publication/{name}/{identifier}`,
        image: '/arbitrary/THUMBNAIL/Subwire/qortal_avatar?async=true',
        message: SUBSCRIPTION_EPISODE_NOTIFICATION_MESSAGE,
        filters: {
          ...baseFilters,
          identifier: prefix,
          names: primaryNamesGroup,
        },
      });
    });
    qortalRequest({
      action: 'NOTIFICATION_REMOVE',
    })
      .then(() => {
        qortalRequest({
          action: 'NOTIFICATION_ADD',
          notifications,
        }).catch((err) => {
          console.error('Failed to add subscription notifications:', err);
        });
      })
      .catch((err) => {
        console.error('Failed to add subscription notifications:', err);
      });
  }, [
    notificationPermission,
    memberGroups,
    primaryNamesGroup,
    groupArticleSearchPrefixes,
    groupEpisodeSearchPrefixes,
  ]);
}
