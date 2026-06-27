import { styled } from '@mui/material/styles';
import { Box, Typography, Card, Avatar } from '@mui/material';
import {
  PlayCircleOutline as VideoIcon,
  AudiotrackOutlined as AudioIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { QortalMetadata, useGlobal } from 'qapp-core';
import { formatDistanceToNow } from 'date-fns';
import { useAtomValue } from 'jotai';
import { LazyImage } from './LazyImage';
import { useDecryptArticle } from '../hooks/useDecryptArticle';
import { useVideoMetadata } from '../hooks/useVideoMetadata';
import { useAudioMetadata } from '../hooks/useAudioMetadata';
import { LoaderItem } from './LoaderState';
import { formatBytes } from '../utils/videoUtils';
import { ownedGroupsMapAtom } from '../state/global/profile';

const StyledCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row', // Horizontal layout for desktop
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  maxWidth: '100%',
  height: 200,
  minHeight: 200,
  maxHeight: 200,
  boxSizing: 'border-box',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 8px 16px rgba(0, 0, 0, 0.1)'
        : '0 8px 16px rgba(0, 0, 0, 0.5)',
    borderColor: theme.palette.primary.main,
  },
  // Mobile: vertical layout (only on true mobile < 600px)
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    height: 'auto',
    minHeight: 'unset',
    maxHeight: 'unset',
    width: '100%',
    maxWidth: '100%',
  },
}));

const CoverImageContainer = styled(Box)(({ theme }) => ({
  width: 160, // Smaller width to give more space to content
  minWidth: 160,
  maxWidth: '100%',
  height: 200,
  maxHeight: 200,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: 'rgba(0, 0, 0, 0.05)',
  flexShrink: 0,
  // Mobile: full width (only on true mobile < 600px)
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    minWidth: 'unset',
    height: 240,
    maxHeight: 240,
  },
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0, // Allow text truncation
  justifyContent: 'space-between',
  maxWidth: '100%',
  boxSizing: 'border-box',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const AuthorSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginTop: 'auto',
}));

interface ArticleData {
  title: string;
  subtitle?: string;
  content: string;
  tags?: string[];
  category?: number;
  coverImage?: {
    src: string;
  };
  type?: 'essay' | 'episode';
  media?: Array<{
    identifier: string;
    service: string;
    mimeType?: string;
  }>;
  groupId?: number; // For encrypted articles
  encryptedContent?: string; // Encrypted article data
}

interface ArticleCardProps {
  qortalMetadata: QortalMetadata;
  data: ArticleData;
}

export const ArticleCard = ({ qortalMetadata, data }: ArticleCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useGlobal();
  const ownedGroupsMap = useAtomValue(ownedGroupsMapAtom);

  // ALL hooks must be called before any early returns (React Rules of Hooks)
  // Decrypt encrypted content inside the component (like example-app does)
  const { decryptedContent, isDecrypting } = useDecryptArticle(data);

  // Check if this is an encrypted article
  const isEncrypted = !!(data?.encryptedContent && data?.groupId);

  // Check if this publication belongs to the user
  // For encrypted/subscription articles: check if groupId is in ownedGroupsMap
  // For public articles: check if author name matches current user's name
  const isOwnedPublication = isEncrypted
    ? ownedGroupsMap && data?.groupId
      ? ownedGroupsMap.has(data.groupId)
      : false
    : auth?.name && qortalMetadata?.name
      ? auth.name === qortalMetadata.name
      : false;

  // For fully encrypted articles, show skeleton while decrypting
  const hasPublicMetadata = isEncrypted && !!data?.title; // Partial encryption
  const isFullyEncrypted = isEncrypted && !hasPublicMetadata;

  // Merge decrypted content with original data (for partial encryption)
  const displayData =
    isEncrypted && decryptedContent
      ? {
          ...data,
          title: decryptedContent.title || data?.title,
          subtitle: decryptedContent.subtitle || data?.subtitle,
          coverImage: decryptedContent.coverImage || data?.coverImage,
          tags: decryptedContent.tags || data?.tags,
          media: decryptedContent.media || data?.media,
        }
      : data;

  // Determine if there's video or audio content (only for non-encrypted or partial encrypted)
  const hasVideo =
    displayData?.media && displayData.media.length > 0;
  const hasAudio =
    hasVideo &&
    displayData?.media &&
    displayData.media.some((v: any) => v.mimeType?.startsWith('audio/'));

  // Fetch metadata for video/audio to get file size
  // Only fetch for public content (non-encrypted) since that's when we show the icon
  const videoMedia = hasVideo && !isEncrypted && displayData?.media
    ? displayData.media.filter((v: any) => !v.mimeType?.startsWith('audio/')).slice(0, 1)
    : [];
  const audioMedia = hasAudio && !isEncrypted && displayData?.media
    ? displayData.media.filter((v: any) => v.mimeType?.startsWith('audio/')).slice(0, 1)
    : [];

  // Hooks must be called unconditionally - pass empty arrays as fallback
  const { videosWithMetadata } = useVideoMetadata(
    videoMedia,
    displayData?.groupId
  );
  const { audiosWithMetadata } = useAudioMetadata(
    audioMedia,
    displayData?.groupId
  );

  // Safety check: if no data, show a minimal card with author info
  if (!data) {
    console.warn(
      'ArticleCard: No data provided for',
      qortalMetadata.identifier
    );
    return (
      <StyledCard
        onClick={() =>
          navigate(
            `/publication/${qortalMetadata.name}/${qortalMetadata.identifier}`,
            { state: { from: location.pathname } }
          )
        }
        elevation={0}
      >
        <CoverImageContainer>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <Typography
              variant="h3"
              sx={{ color: 'white', fontWeight: 700, opacity: 0.3 }}
            >
              ?
            </Typography>
          </Box>
        </CoverImageContainer>
        <ContentContainer>
          <Typography variant="h6" fontWeight={700}>
            Loading...
          </Typography>
          <AuthorSection
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/author/${qortalMetadata.name}`);
            }}
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 }, mt: 'auto' }}
          >
            <Avatar
              src={`/arbitrary/THUMBNAIL/${qortalMetadata.name}/qortal_avatar?apiVersion=2`}
              alt={qortalMetadata.name}
              sx={{ width: 32, height: 32 }}
            >
              {qortalMetadata.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                {qortalMetadata.name}
              </Typography>
            </Box>
          </AuthorSection>
        </ContentContainer>
      </StyledCard>
    );
  }

  // Show skeleton loader while decrypting ANY encrypted articles (full or partial)
  if (isEncrypted && isDecrypting) {
    return <LoaderItem />;
  }

  // Now safe to use displayData after all hooks and early returns
  const handleClick = () => {
    navigate(
      `/publication/${qortalMetadata.name}/${qortalMetadata.identifier}`,
      { state: { from: location.pathname } }
    );
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/author/${qortalMetadata.name}`);
  };

  // Use fallback values for encrypted content
  const displayTitle =
    displayData.title || (isEncrypted ? 'Subscription Content' : 'Untitled');
  const displaySubtitle = displayData.subtitle;

  // Format the timestamp - add safety check
  const timeAgo =
    qortalMetadata.created && !isNaN(qortalMetadata.created)
      ? formatDistanceToNow(qortalMetadata.created, { addSuffix: true })
      : 'recently';

  // Get cover image URL from data - add data URL prefix if it's base64
  const coverImageUrl =
    displayData.coverImage?.src &&
    typeof displayData.coverImage.src === 'string'
      ? displayData.coverImage.src.startsWith('data:')
        ? displayData.coverImage.src
        : `data:image/webp;base64,${displayData.coverImage.src}`
      : undefined;

  // Get avatar URL
  const avatarUrl = `/arbitrary/THUMBNAIL/${qortalMetadata.name}/qortal_avatar?apiVersion=2`;

  // Get file size from metadata (use first video/audio if multiple)
  const videoFileSize = videosWithMetadata.length > 0 ? videosWithMetadata[0].metadata.fileSize : undefined;
  const audioFileSize = audiosWithMetadata.length > 0 ? audiosWithMetadata[0].metadata.fileSize : undefined;

  return (
    <StyledCard onClick={handleClick} elevation={0}>
      {/* Media/Subscription indicator badges - positioned on card */}
      {(isEncrypted || isOwnedPublication) && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            backgroundColor: isOwnedPublication ? '#29B6F6' : 'rgba(255, 193, 7, 0.9)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: isOwnedPublication ? 'white' : 'rgba(0, 0, 0, 0.87)',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 2,
          }}
        >
          {isOwnedPublication ? (
            <>
              {isEncrypted ? (
                <>
                  <LockIcon sx={{ fontSize: 16 }} />
                  <span>My Private Publication</span>
                </>
              ) : (
                <>
                  <LockOpenIcon sx={{ fontSize: 16 }} />
                  <span>My Public Publication</span>
                </>
              )}
            </>
          ) : (
            <>
              <LockIcon sx={{ fontSize: 16 }} />
              <span>Subscribers Only</span>
            </>
          )}
        </Box>
      )}

      {(hasVideo || hasAudio) && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 2,
          }}
        >
          {hasAudio ? (
            <>
              <AudioIcon sx={{ fontSize: 16 }} />
              <Box sx={{ marginLeft: '5px' }}>Audio</Box>
              {audioFileSize && <span>{formatBytes(audioFileSize)}</span>}
            </>
          ) : (
            <>
              <VideoIcon sx={{ fontSize: 16 }} />
              <span>Video</span>
              {videoFileSize && (
                <Box sx={{ marginLeft: '5px' }}>
                  {formatBytes(videoFileSize)}
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Cover Image */}
      <CoverImageContainer>
        {coverImageUrl ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              '& img': {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              },
              '&:hover img': {
                transform: 'scale(1.05)',
              },
            }}
          >
            <LazyImage src={coverImageUrl} alt={data.title} minHeight="100%" />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                color: 'white',
                fontWeight: 700,
                opacity: 0.3,
              }}
            >
              {data.title.charAt(0).toUpperCase()}
            </Typography>
          </Box>
        )}
      </CoverImageContainer>

      <ContentContainer>
        {/* Title */}
        <Typography
          variant="h6"
          component="h2"
          fontWeight={700}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 0.5,
            lineHeight: 1.3,
            fontSize: '1.15rem',
          }}
        >
          {displayTitle}
        </Typography>

        {/* Subtitle */}
        {displaySubtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 1,
              lineHeight: 1.4,
              fontSize: '0.9rem',
            }}
          >
            {displaySubtitle}
          </Typography>
        )}

        {/* Show message for fully encrypted content */}
        {isFullyEncrypted && !decryptedContent && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontStyle: 'italic',
              mb: 1,
              fontSize: '0.9rem',
            }}
          >
            🔒 This content is only visible to subscribers
          </Typography>
        )}

        {/* Author Info */}
        <AuthorSection
          onClick={handleAuthorClick}
          sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
        >
          <Avatar
            src={avatarUrl}
            alt={qortalMetadata.name}
            sx={{
              width: 32,
              height: 32,
              border: (theme) =>
                `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {qortalMetadata.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.875rem',
              }}
            >
              {qortalMetadata.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                fontSize: '0.75rem',
              }}
            >
              {timeAgo}
            </Typography>
          </Box>
        </AuthorSection>
      </ContentContainer>
    </StyledCard>
  );
};
