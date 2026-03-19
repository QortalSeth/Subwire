import { Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { styled } from '@mui/system';
import { useIframe } from '../hooks/useIframeListener';
import { useInitializePreferredName } from '../hooks/useInitializePreferredName';
import { useInitializeProfile } from '../hooks/useInitializeProfile';
import { useInitializeOwnedGroups } from '../hooks/useInitializeOwnedGroups';
import { useGroupOwnerNames } from '../hooks/useGroupOwnerNames';
import { useSubscriptionNotificationRegistration } from '../hooks/useSubscriptionNotificationRegistration';
import { useGlobal } from 'qapp-core';
import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  hubSupportsNotificationPermissionAtom,
  notificationPermissionAtom,
  notificationPermissionDeclinedByAddressAtom,
} from '../state/global/system';
import { fetchHubSupportsNotificationPermission } from '../utils/hubNotificationCapability';
import {
  applyHubNotificationPermissionOutcome,
  requestHubNotificationPermissionOutcome,
} from '../utils/hubNotificationPermissionRequest';

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const Layout = () => {
  useIframe();
  const { auth } = useGlobal();

  // Check for preferred name and auto-switch before loading the app
  const { isCheckingName } = useInitializePreferredName();

  // Initialize user profile from cache or QDN
  useInitializeProfile();

  // Initialize owned groups for subscription feature
  useInitializeOwnedGroups();

  // Initialize member groups and group owner names for subscription content
  useGroupOwnerNames();

  // When notification permission is granted, register subscription NOTIFICATION_ADD globally
  useSubscriptionNotificationRegistration();

  const setNotificationPermission = useSetAtom(notificationPermissionAtom);
  const setHubSupportsNotificationPermission = useSetAtom(
    hubSupportsNotificationPermissionAtom
  );
  const hubSupportsNotificationPermission = useAtomValue(
    hubSupportsNotificationPermissionAtom
  );

  const [declinedByAddress, setDeclinedByAddress] = useAtom(
    notificationPermissionDeclinedByAddressAtom
  );
  const declinedRef = useRef(declinedByAddress);
  declinedRef.current = declinedByAddress;

  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = await fetchHubSupportsNotificationPermission();
      if (!cancelled) {
        setHubSupportsNotificationPermission(supported);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setHubSupportsNotificationPermission]);

  useEffect(() => {
    if (!auth?.address) {
      setNotificationPermission(false);
      previousAddressRef.current = null;
      return;
    }

    const address = auth.address;

    if (previousAddressRef.current !== address) {
      setNotificationPermission(false);
      previousAddressRef.current = address;
    }

    if (hubSupportsNotificationPermission !== true) {
      return;
    }

    // Ref read: map updates (grant/decline) do not re-prompt via this effect
    if (declinedRef.current[address]) {
      return;
    }

    let cancelled = false;

    (async () => {
      const outcome = await requestHubNotificationPermissionOutcome();
      if (cancelled) return;
      applyHubNotificationPermissionOutcome(
        address,
        outcome,
        setDeclinedByAddress,
        setNotificationPermission
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    auth?.address,
    hubSupportsNotificationPermission,
    setDeclinedByAddress,
    setNotificationPermission,
  ]);

  // Show loading indicator while authentication is in progress
  if (auth?.isLoadingUser) {
    return (
      <LoadingContainer>
        <CircularProgress size={48} />
      </LoadingContainer>
    );
  }

  // Show loading indicator while checking for name (only if authenticated)
  if (auth?.name && isCheckingName) {
    return (
      <LoadingContainer>
        <CircularProgress size={48} />
      </LoadingContainer>
    );
  }

  // Allow access to the app regardless of authentication status
  // Users can browse without authentication
  return (
    <>
      {/* Add Header here */}
      <main>
        <Outlet /> {/* This is where page content will be rendered */}
      </main>
      {/* Add Footer here */}
    </>
  );
};

export default Layout;
