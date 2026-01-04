import { GlobalProvider } from 'qapp-core';
import Layout from './styles/Layout';
import { publicSalt } from './qapp-config';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTestIdentifiers } from './constants/qdn';

export const AppWrapper = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [location.pathname]);
  return (
    <GlobalProvider
      config={{
        appName: useTestIdentifiers ? 'perennial-dev' : 'perennial', // change to your own
        auth: {
          balanceSetting: {
            interval: 180000,
            onlyOnMount: false,
          },
          authenticateOnMount: true,
        },
        publicSalt: publicSalt,
      }}
    >
      <Layout />
    </GlobalProvider>
  );
};
