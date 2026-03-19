import { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Avatar,
  Button,
  IconButton,
  Tabs,
  Tab,
  Skeleton,
  Chip,
  CircularProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  Home as HomeIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResourceListDisplay,
  LoaderListStatus,
  useGlobal,
  showError,
  showSuccess,
  useCheckSubscriptionStatus,
} from 'qapp-core';
import {
  ENTITY_ARTICLE,
  ENTITY_EPISODE,
  ENTITY_ROOT,
  GROUP_PRIVATE_ARTICLE,
  GROUP_PRIVATE_EPISODE,
} from '../utils/articleQdn';
import { ArticleCard } from '../components/ArticleCard';
import { copyToClipboard } from '../utils/clipboard';
import { useFetchProfile } from '../hooks/useFetchProfile';
import { useGroupDetails } from '../hooks/useGroupDetails';
import { EditProfileModal } from '../components/EditProfileModal';
import { useAtom } from 'jotai';
import { profileDataAtom, profileNameAtom } from '../state/global/profile';
import { useTestIdentifiers } from '../constants/qdn';

// Minimal header with just a home button
const MinimalHeader = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 100,
  [theme.breakpoints.down('sm')]: {
    top: theme.spacing(1.5),
    left: theme.spacing(1.5),
  },
}));

const HomeButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 2px 8px rgba(0, 0, 0, 0.1)'
      : '0 2px 8px rgba(0, 0, 0, 0.4)',
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
    transform: 'scale(1.05)',
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 4px 12px rgba(0, 0, 0, 0.15)'
        : '0 4px 12px rgba(0, 0, 0, 0.6)',
  },
  transition: 'all 0.2s ease',
  [theme.breakpoints.down('sm')]: {
    width: 40,
    height: 40,
    '& .MuiSvgIcon-root': {
      fontSize: 20,
    },
  },
}));

// Hero section with author info
const HeroSection = styled(Box)(({ theme }) => ({
  height: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    theme.palette.mode === 'light'
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #4c5fd7 0%, #5a3a7e 100%)',
  position: 'relative',
  overflow: 'hidden',
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(8),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  [theme.breakpoints.down('sm')]: {
    height: 560,
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(6),
  },
}));

const HeroContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  textAlign: 'center',
  color: 'white',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0, 2),
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  border: '4px solid rgba(255, 255, 255, 0.3)',
  fontSize: '3rem',
  fontWeight: 700,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  [theme.breakpoints.down('sm')]: {
    width: 90,
    height: 90,
    fontSize: '2.25rem',
    marginBottom: theme.spacing(2),
    border: '3px solid rgba(255, 255, 255, 0.3)',
  },
}));

const ContentSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(-6),
  position: 'relative',
  zIndex: 2,
}));

const ContentContainer = styled(Container)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: '24px 24px 0 0',
  minHeight: '60vh',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(8),
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 -4px 24px rgba(0, 0, 0, 0.08)'
      : '0 -4px 24px rgba(0, 0, 0, 0.4)',
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(6),
    paddingLeft: '16px !important',
    paddingRight: '16px !important',
    borderRadius: '16px 16px 0 0',
  },
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(8, 2),
  color: theme.palette.text.secondary,
}));

const SubscriberChip = styled(Chip)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.08)',
  color: theme.palette.text.primary,
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: theme.spacing(0.5, 1),
  height: 'auto',
  '& .MuiChip-icon': {
    color: theme.palette.primary.main,
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.8rem',
    padding: theme.spacing(0.4, 0.8),
  },
}));

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const { auth, identifierOperations } = useGlobal();
  const [currentTab, setCurrentTab] = useState(0);
  const [episodeSearchPrefix, setEpisodeSearchPrefix] = useState<string | null>(
    null
  );
  const [encryptedArticlePrefix, setEncryptedArticlePrefix] = useState<
    string | null
  >(null);
  const [encryptedEpisodePrefix, setEncryptedEpisodePrefix] = useState<
    string | null
  >(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);

  // State to control when to show the list (wait for profile groupId check)
  const [isReadyToShowList, setIsReadyToShowList] = useState(false);

  // Check if this is the logged-in user's profile
  const isOwnProfile = auth?.name === name;

  // Get global profile data for own profile
  const [globalProfileData] = useAtom(profileDataAtom);
  const [profileName] = useAtom(profileNameAtom);

  // Fetch profile data for other users (or own profile if not in global state)
  const { profile: fetchedProfile, refetch } = useFetchProfile(name || '');

  // Use global state for own profile if it matches, otherwise use fetched profile
  const profile =
    isOwnProfile && profileName === name ? globalProfileData : fetchedProfile;

  // Fetch group details if profile has a group attached
  const { groupDetails, isLoading: isLoadingGroup } = useGroupDetails(
    profile?.groupId
  );

  // Check subscription status for profiles that are not our own
  const {
    status,
    isOwner,
    loading: subscriptionLoading,
  } = useCheckSubscriptionStatus({
    address: auth?.address ?? null,
    name: auth?.name ?? null,
    groupId: profile?.groupId ?? null,
    enabled: !isOwnProfile && !!auth?.address && !!profile?.groupId,
  });

  // Get avatar URL
  const avatarUrl = name
    ? `/arbitrary/THUMBNAIL/${name}/qortal_avatar?async=true`
    : undefined;

  // Handle modal close with refetch
  const handleModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    // Refetch profile to get latest data from QDN
    if (!isOwnProfile) {
      refetch();
    }
  }, [isOwnProfile, refetch]);

  // Handle share button
  const handleShare = useCallback(async () => {
    try {
      if (!name) {
        showError('Failed to copy link. Please try again. Missing user name.');
        return;
      }
      const profileUrl = `qortal://APP/${useTestIdentifiers ? 'a-test-2' : 'Subwire'}/author/${encodeURIComponent(name)}`;
      await copyToClipboard(profileUrl);
      showSuccess('Profile link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Failed to copy link. Please try again.');
    }
  }, [name]);

  // Determine subscription button text based on status
  const getSubscriptionButtonText = () => {
    if (subscriptionLoading) {
      return 'Loading...';
    }
    if (status === 'no-subscription') {
      return 'No Subscription Available';
    }
    if (isOwner) {
      return 'Owner';
    }
    if (status === 'subscribed-paid') {
      return 'Subscribed';
    }
    if (status === 'subscribed-unpaid') {
      return 'Payment Required';
    }
    return 'Subscribe';
  };

  // Preload cover image and fade it in once loaded
  useEffect(() => {
    if (!profile?.coverImage) {
      setCoverImageLoaded(false);
      return;
    }
    setCoverImageLoaded(false);
    const img = new window.Image();
    img.src = profile.coverImage;
    img.onload = () => setCoverImageLoaded(true);
  }, [profile?.coverImage]);

  // Wait up to 3 seconds for profile to load before showing the list
  // This ensures encrypted content is included from the start if available
  useEffect(() => {
    // Reset when name changes
    setIsReadyToShowList(false);

    // Set up 3-second timeout
    const timeout = setTimeout(() => {
      setIsReadyToShowList(true);
    }, 3000);

    // If we get a profile (with or without groupId), we can show the list immediately
    const checkProfile = () => {
      const currentProfile =
        isOwnProfile && profileName === name
          ? globalProfileData
          : fetchedProfile;

      if (currentProfile !== null && currentProfile !== undefined) {
        clearTimeout(timeout);
        setIsReadyToShowList(true);
      }
    };

    checkProfile();

    // Cleanup timeout on unmount or name change
    return () => clearTimeout(timeout);
  }, [name, isOwnProfile, profileName, globalProfileData, fetchedProfile]);

  // Build the episode search prefix
  useEffect(() => {
    const buildPrefix = async () => {
      if (!identifierOperations) return;

      try {
        const episodePrefix = await identifierOperations.buildSearchPrefix(
          ENTITY_EPISODE,
          ENTITY_ROOT
        );
        setEpisodeSearchPrefix(episodePrefix);
      } catch (error) {
        console.error('Failed to build episode search prefix:', error);
      }
    };

    buildPrefix();
  }, [identifierOperations]);

  // Build encrypted article/episode search prefixes if a groupId is available
  // This runs independently and doesn't block the main content loading
  useEffect(() => {
    const buildEncryptedPrefixes = async () => {
      if (!identifierOperations || !name) {
        return;
      }

      // Try to get groupId from either source
      // For own profile: use globalProfileData if available (loads faster)
      // For other profiles: use fetchedProfile when it loads
      const groupId = isOwnProfile
        ? globalProfileData?.groupId
        : fetchedProfile?.groupId;

      if (!groupId) {
        // No group attached - clear any existing prefixes
        setEncryptedArticlePrefix(null);
        setEncryptedEpisodePrefix(null);
        return;
      }

      try {
        // Build prefix for encrypted articles
        const encryptedArticlePfx =
          await identifierOperations.buildSearchPrefix(
            groupId.toString(),
            '',
            GROUP_PRIVATE_ARTICLE
          );
        setEncryptedArticlePrefix(encryptedArticlePfx);

        // Build prefix for encrypted episodes
        const encryptedEpisodePfx =
          await identifierOperations.buildSearchPrefix(
            groupId.toString(),
            '',
            GROUP_PRIVATE_EPISODE
          );
        setEncryptedEpisodePrefix(encryptedEpisodePfx);
      } catch (error) {
        console.error('Failed to build encrypted search prefixes:', error);
      }
    };

    buildEncryptedPrefixes();
  }, [
    identifierOperations,
    name,
    isOwnProfile,
    globalProfileData?.groupId,
    fetchedProfile?.groupId,
  ]);

  // Search params for articles
  const articlesSearch = useMemo(() => {
    return {
      service: 'DOCUMENT' as any,
      name: name || '',
      identifier: '',
      limit: 20,
      reverse: true,
    };
  }, [name]);

  // Search params for episodes
  const episodesSearch = useMemo(() => {
    return {
      service: 'DOCUMENT' as any,
      name: name || '',
      identifier: '',
      limit: 20,
      reverse: true,
    };
  }, [name]);

  // Secondary data sources for "All" tab - includes episodes and all encrypted content
  const allTabSecondaryDataSources = useMemo((): any[] | undefined => {
    if (!name) return undefined;

    const sources: any[] = [];

    // Add public episodes
    if (episodeSearchPrefix) {
      sources.push({
        params: {
          service: 'DOCUMENT',
          name: name,
          identifier: episodeSearchPrefix,
          reverse: true,
          prefix: true,
        },
      });
    }

    // Add encrypted articles (if prefix is available, meaning groupId exists)
    if (encryptedArticlePrefix) {
      sources.push({
        params: {
          service: 'DOCUMENT',
          name: name,
          identifier: encryptedArticlePrefix,
          reverse: true,
          prefix: true,
        },
      });
    }

    // Add encrypted episodes (if prefix is available, meaning groupId exists)
    if (encryptedEpisodePrefix) {
      sources.push({
        params: {
          service: 'DOCUMENT',
          name: name,
          identifier: encryptedEpisodePrefix,
          reverse: true,
          prefix: true,
        },
      });
    }

    return sources.length > 0 ? sources : undefined;
  }, [
    episodeSearchPrefix,
    encryptedArticlePrefix,
    encryptedEpisodePrefix,
    name,
  ]);

  // Secondary data sources for "Essays" tab - only encrypted articles
  const essaysTabSecondaryDataSources = useMemo((): any[] | undefined => {
    if (!name || !encryptedArticlePrefix) return undefined;

    return [
      {
        params: {
          service: 'DOCUMENT',
          name: name,
          identifier: encryptedArticlePrefix,
          reverse: true,
          prefix: true,
        },
      },
    ];
  }, [encryptedArticlePrefix, name]);

  // Secondary data sources for "Episodes" tab - only encrypted episodes
  const episodesTabSecondaryDataSources = useMemo((): any[] | undefined => {
    if (!name || !encryptedEpisodePrefix) return undefined;

    return [
      {
        params: {
          service: 'DOCUMENT',
          name: name,
          identifier: encryptedEpisodePrefix,
          reverse: true,
          prefix: true,
        },
      },
    ];
  }, [encryptedEpisodePrefix, name]);

  // Render article card
  const renderArticle = useCallback((article: any) => {
    // Log the article structure to debug
    if (!article.data) {
      console.warn('Article missing data:', {
        identifier: article.qortalMetadata?.identifier,
        name: article.qortalMetadata?.name,
        hasData: !!article.data,
        article: article,
      });
    }

    return (
      <ArticleCard
        key={article.qortalMetadata?.identifier}
        qortalMetadata={article.qortalMetadata}
        data={article.data}
      />
    );
  }, []);

  // Loader item for skeleton
  const loaderItem = useCallback(() => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          width: '100%',
          height: 200,
          minHeight: 200,
          maxHeight: 200,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        {/* Cover image skeleton - left side */}
        <Skeleton
          variant="rectangular"
          width={160}
          height={200}
          sx={{ flexShrink: 0 }}
        />

        {/* Content - right side */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            p: 2.5,
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          {/* Title */}
          <Skeleton variant="text" height={24} width="90%" />

          {/* Subtitle */}
          <Box>
            <Skeleton variant="text" height={16} width="100%" />
            <Skeleton variant="text" height={16} width="80%" />
          </Box>

          {/* Tags */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Skeleton
              variant="rectangular"
              width={60}
              height={22}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width={70}
              height={22}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rectangular"
              width={50}
              height={22}
              sx={{ borderRadius: 1 }}
            />
          </Box>

          {/* Author section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Skeleton variant="text" height={14} width={100} />
              <Skeleton variant="text" height={12} width={80} />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }, []);

  // Loader list for different states
  const loaderList = useCallback(
    (status: LoaderListStatus) => {
      if (status === 'NO_RESULTS') {
        return (
          <EmptyState>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              No articles yet
            </Typography>
            <Typography variant="body1">
              {isOwnProfile
                ? 'Start writing your first article!'
                : `${name} hasn't published any articles yet.`}
            </Typography>
            {isOwnProfile && (
              <Button
                variant="contained"
                onClick={() => navigate('/write')}
                sx={{ mt: 3, textTransform: 'none' }}
              >
                Write Your First Article
              </Button>
            )}
          </EmptyState>
        );
      }

      // Loading state or error state
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {[1, 2, 3].map((i) => (
            <Box key={i}>{loaderItem()}</Box>
          ))}
        </Box>
      );
    },
    [isOwnProfile, name, navigate, loaderItem]
  );

  return (
    <>
      {/* Minimal header with just home button */}
      <MinimalHeader>
        <HomeButton onClick={() => navigate('/')} size="large">
          <HomeIcon />
        </HomeButton>
      </MinimalHeader>

      {/* Hero section with author info */}
      <HeroSection>
        {profile?.coverImage && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${profile.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: coverImageLoaded ? 1 : 0,
              transition: 'opacity 0.9s ease',
              zIndex: 0,
            }}
          />
        )}
        <HeroContent>
          <StyledAvatar src={avatarUrl} alt={name}>
            {name?.charAt(0).toUpperCase()}
          </StyledAvatar>
          <Typography
            variant="h2"
            fontWeight={700}
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            {name}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              opacity: 0.9,
              maxWidth: 600,
              margin: '0 auto',
              px: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              minHeight: '1.5em',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {profile?.bio || ''}
          </Typography>

          {/* Subscriber count */}
          {!isOwnProfile && profile?.groupId && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              {subscriptionLoading ? (
                <Skeleton
                  variant="rectangular"
                  width={180}
                  height={32}
                  sx={{ borderRadius: 2 }}
                />
              ) : status === 'no-subscription' ? (
                <Chip
                  label="No Subscription"
                  sx={{
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}
                />
              ) : groupDetails && groupDetails.memberCount !== undefined ? (
                isLoadingGroup ? (
                  <Skeleton
                    variant="rectangular"
                    width={180}
                    height={32}
                    sx={{ borderRadius: 2 }}
                  />
                ) : (
                  <SubscriberChip
                    icon={<PeopleIcon />}
                    label={`${groupDetails.memberCount} ${groupDetails.memberCount === 1 ? 'Subscriber' : 'Subscribers'}`}
                  />
                )
              ) : null}
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1.5, sm: 2 },
              mt: 3,
              mb: { xs: 3, sm: 0 },
              justifyContent: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              px: { xs: 3, sm: 0 },
              maxWidth: { xs: 320, sm: 'none' },
              mx: 'auto',
            }}
          >
            {isOwnProfile && (
              <>
                <Button
                  variant="contained"
                  onClick={() => navigate('/write')}
                  fullWidth={true}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    borderRadius: 2,
                    px: { xs: 3, sm: 4 },
                    py: { xs: 1.25, sm: 1.5 },
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    textTransform: 'none',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    maxWidth: { xs: '100%', sm: 'none' },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  New Article
                </Button>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    width: { xs: '100%', sm: 'auto' },
                    alignItems: 'center',
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditModalOpen(true)}
                    startIcon={
                      <EditIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    }
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      borderRadius: 2,
                      px: { xs: 2.5, sm: 3 },
                      py: { xs: 1.25, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      textTransform: 'none',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      flex: { xs: 1, sm: 'none' },
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      },
                      '& .MuiButton-startIcon': {
                        marginRight: { xs: 0.5, sm: 1 },
                      },
                    }}
                  >
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      Edit Profile
                    </Box>
                    <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                      Edit
                    </Box>
                  </Button>
                  <IconButton
                    onClick={handleShare}
                    sx={{
                      color: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      width: { xs: 42, sm: 48 },
                      height: { xs: 42, sm: 48 },
                      flexShrink: 0,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  >
                    <ShareIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                  </IconButton>
                </Box>
              </>
            )}
            {!isOwnProfile && (
              <>
                {/* Show Subscribe button skeleton while loading, button if available, or "No Subscription" text */}
                {profile?.groupId && (
                  <>
                    {subscriptionLoading ? (
                      <Skeleton
                        variant="rectangular"
                        width={200}
                        height={48}
                        sx={{ borderRadius: 2 }}
                      />
                    ) : status === 'no-subscription' ? (
                      <Typography
                        variant="body1"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                        }}
                      >
                        No Subscription Available
                      </Typography>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => {
                          qortalRequest({
                            action: 'OPEN_NEW_TAB',
                            qortalLink: useTestIdentifiers
                              ? `qortal://APP/a-test/subscription/test-subscription-${profile?.groupId?.toString()}`
                              : `qortal://APP/Subscriptions/subscription/subscription-${profile?.groupId?.toString()}`,
                          });
                        }}
                        disabled={subscriptionLoading || isOwner}
                        startIcon={
                          subscriptionLoading ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : null
                        }
                        fullWidth={true}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          borderRadius: 2,
                          px: { xs: 3, sm: 4 },
                          py: { xs: 1.25, sm: 1.5 },
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          textTransform: 'none',
                          fontWeight: 600,
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          maxWidth: { xs: '100%', sm: 'none' },
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&:disabled': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.5)',
                          },
                        }}
                      >
                        {status === 'subscribed-unpaid' && (
                          <WarningIcon
                            sx={{
                              fontSize: 20,
                              color: 'warning.main',
                              marginRight: '5px',
                            }}
                          />
                        )}
                        {status === 'subscribed-paid' && (
                          <CheckCircleOutlineIcon
                            sx={{
                              fontSize: 20,
                              color: 'success.main',
                              marginRight: '5px',
                            }}
                          />
                        )}
                        {getSubscriptionButtonText()}
                      </Button>
                    )}
                  </>
                )}
                <IconButton
                  onClick={handleShare}
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    width: { xs: 42, sm: 48 },
                    height: { xs: 42, sm: 48 },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.3)',
                    },
                  }}
                >
                  <ShareIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </IconButton>
              </>
            )}
          </Box>
        </HeroContent>
      </HeroSection>

      {/* Content section */}
      <ContentSection>
        <ContentContainer maxWidth="lg" disableGutters={true}>
          {/* Tabs for different content types */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 600,
                  minWidth: { xs: 'auto', sm: 120 },
                  px: { xs: 2, sm: 3 },
                },
              }}
            >
              <Tab label="All" />
              <Tab label="Essays" />
              <Tab label="Episodes" />
              <Tab label="About" />
            </Tabs>
          </Box>

          {/* All Tab */}
          {currentTab === 0 && (
            <>
              {!episodeSearchPrefix || !isReadyToShowList ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {loaderItem()}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: 900,
                    margin: '0 auto',
                    width: '100%',
                  }}
                >
                  <ResourceListDisplay
                    styles={{
                      gap: 24,
                    }}
                    retryAttempts={3}
                    listName={`user-all-${name}`}
                    direction="VERTICAL"
                    disableVirtualization
                    returnType="JSON"
                    loaderList={loaderList}
                    entityParams={{
                      entityType: ENTITY_ARTICLE,
                      parentId: ENTITY_ROOT,
                    }}
                    search={articlesSearch}
                    listItem={renderArticle}
                    loaderItem={loaderItem}
                    secondaryDataSources={allTabSecondaryDataSources}
                  />
                </Box>
              )}
            </>
          )}

          {/* Essays Tab */}
          {currentTab === 1 && (
            <>
              {!isReadyToShowList ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {loaderItem()}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: 900,
                    margin: '0 auto',
                    width: '100%',
                  }}
                >
                  <ResourceListDisplay
                    styles={{
                      gap: 24,
                    }}
                    retryAttempts={3}
                    listName={`user-essays-${name}`}
                    direction="VERTICAL"
                    disableVirtualization
                    returnType="JSON"
                    loaderList={loaderList}
                    entityParams={{
                      entityType: ENTITY_ARTICLE,
                      parentId: ENTITY_ROOT,
                    }}
                    search={articlesSearch}
                    listItem={renderArticle}
                    loaderItem={loaderItem}
                    secondaryDataSources={essaysTabSecondaryDataSources}
                  />
                </Box>
              )}
            </>
          )}

          {/* Episodes Tab */}
          {currentTab === 2 && (
            <>
              {!isReadyToShowList ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {loaderItem()}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    maxWidth: 900,
                    margin: '0 auto',
                    width: '100%',
                  }}
                >
                  <ResourceListDisplay
                    styles={{
                      gap: 24,
                    }}
                    retryAttempts={3}
                    listName={`user-episodes-${name}`}
                    direction="VERTICAL"
                    disableVirtualization
                    returnType="JSON"
                    loaderList={(status: LoaderListStatus) => {
                      if (status === 'NO_RESULTS') {
                        return (
                          <EmptyState>
                            <Typography
                              variant="h5"
                              fontWeight={600}
                              gutterBottom
                            >
                              No episodes yet
                            </Typography>
                            <Typography variant="body1">
                              {isOwnProfile
                                ? 'Create your first episode!'
                                : `${name} hasn't published any episodes yet.`}
                            </Typography>
                            {isOwnProfile && (
                              <Button
                                variant="contained"
                                onClick={() => navigate('/write/episode')}
                                sx={{ mt: 3, textTransform: 'none' }}
                              >
                                Create Your First Episode
                              </Button>
                            )}
                          </EmptyState>
                        );
                      }
                      // Loading state or error state
                      return (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          {[1, 2, 3].map((i) => (
                            <Box key={i}>{loaderItem()}</Box>
                          ))}
                        </Box>
                      );
                    }}
                    entityParams={{
                      entityType: ENTITY_EPISODE,
                      parentId: ENTITY_ROOT,
                    }}
                    search={episodesSearch}
                    listItem={renderArticle}
                    loaderItem={loaderItem}
                    secondaryDataSources={episodesTabSecondaryDataSources}
                  />
                </Box>
              )}
            </>
          )}

          {/* About Tab */}
          {currentTab === 3 && (
            <Box sx={{ maxWidth: 680, margin: '0 auto', py: 4 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                About {name}
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8, mt: 3 }}>
                {profile?.bio ||
                  `This is ${name}'s personal space on Subwire. Check back for new articles and updates.`}
              </Typography>
            </Box>
          )}
        </ContentContainer>
      </ContentSection>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          open={isEditModalOpen}
          onClose={handleModalClose}
          currentProfile={profile || undefined}
        />
      )}
    </>
  );
};
