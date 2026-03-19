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
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { notificationPermissionAtom } from '../state/global/system';

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

  const executeNotificationPermission = async () => {
    try {
      const result = await qortalRequest({
        action: 'NOTIFICATION_PERMISSION',
      });

      if (result) {
        setNotificationPermission(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (auth?.address) {
      executeNotificationPermission();
    }
  }, [auth?.address]);

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
