import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Avatar,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  // Bookmark,
  // BookmarkBorder,
  ArrowBack,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  usePublish,
  useGlobal,
  showError,
  showSuccess,
  showLoading,
  dismissToast,
  VideoPlayer,
  Service,
} from 'qapp-core';
import {
  restoreImagesForDisplay,
  deleteArticle,
  ArticleMedia,
  likeArticle,
  unlikeArticle,
} from '../utils/articleQdn';
import { formatDistanceToNow } from 'date-fns';
import { marked } from 'marked';
import { SERVICE_DOCUMENT, useTestIdentifiers } from '../constants/qdn';
import { processLinks } from '../utils/processLinks';
import { useVideoMetadata } from '../hooks/useVideoMetadata';
import { useAudioMetadata } from '../hooks/useAudioMetadata';
import { AudioPlayerDisplay } from '../components/AudioPlayerDisplay';
import { useHasLiked } from '../hooks/useHasLiked';
import { useLikeCount } from '../hooks/useLikeCount';
import { copyToClipboard } from '../utils/clipboard';
import { useDecryptArticle } from '../hooks/useDecryptArticle';
import { useAtomValue } from 'jotai';
import { notificationPermissionAtom } from '../state/global/system';
import { ensureImageDataUrl } from '../utils/imageDataUrl';
import { formatBytes } from '../utils/videoUtils';

declare const qortalRequest: (params: {
  action: string;
  qortalLink?: string;
  groupId?: number;
  notificationIds?: Array<{ notificationId: string; identifier: string }>;
}) => Promise<unknown>;

// Minimal header with just a back button
const MinimalHeader = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: theme.spacing(2),
  left: theme.spacing(2),
  zIndex: 100,
}));

const BackButton = styled(IconButton)(({ theme }) => ({
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
}));

const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '4rem',
  minHeight: '400px',
});

const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(8, 4),
  gap: theme.spacing(2),
  minHeight: '400px',
}));

const ErrorIcon = styled(Box)(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '64px',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))'
      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.03))',
  border: `2px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(239, 68, 68, 0.2)'
      : 'rgba(239, 68, 68, 0.15)'
  }`,
}));

// Hero section with article info
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: 400,
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
}));

const HeroContent = styled(Box)({
  position: 'relative',
  zIndex: 1,
  maxWidth: 800,
  margin: '0 auto',
  padding: '0 24px',
});

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
}));

const ArticleTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(3),
  fontSize: '2.5rem',
  lineHeight: 1.3,
  color: 'white',
  textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  [theme.breakpoints.down('md')]: {
    fontSize: '2rem',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.75rem',
  },
}));

const ArticleSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: theme.spacing(4),
  lineHeight: 1.6,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.1rem',
  },
}));

const AuthorSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(4),
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

const AuthorInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  cursor: 'pointer',
  transition: 'opacity 0.2s ease',
  '&:hover': {
    opacity: 0.7,
  },
});

const StyledAvatar = styled(Avatar)(() => ({
  width: 56,
  height: 56,
  border: '3px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
}));

const ArticleContent = styled(Box)(({ theme }) => ({
  width: '100%',
  minWidth: 0, // allow shrinking in flex so content can wrap
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
  overflow: 'hidden',
  fontSize: '1.125rem',
  lineHeight: 1.8,
  color: theme.palette.text.primary,
  '& *': {
    maxWidth: '100%',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  '& p': {
    marginBottom: theme.spacing(3),
  },
  '& h2': {
    fontWeight: 700,
    fontSize: '1.75rem',
    marginTop: theme.spacing(5),
    marginBottom: theme.spacing(2),
  },
  '& h3': {
    fontWeight: 600,
    fontSize: '1.4rem',
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    paddingLeft: theme.spacing(3),
    marginLeft: 0,
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
  },
  '& code': {
    backgroundColor: theme.palette.mode === 'light' ? '#f5f5f5' : '#2a2a2a',
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
  '& pre': {
    backgroundColor: theme.palette.mode === 'light' ? '#f5f5f5' : '#2a2a2a',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    margin: theme.spacing(3, 0),
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  '& pre code': {
    padding: 0,
    backgroundColor: 'transparent',
    fontSize: 'inherit',
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    display: 'block',
    margin: theme.spacing(3, 0),
    borderRadius: theme.spacing(1),
  },
  '& a': {
    color: theme.palette.mode === 'light' ? '#0f7ae5' : '#5eaeff',
    textDecoration: 'none',
    borderBottom: `1px solid ${theme.palette.mode === 'light' ? 'rgba(15, 122, 229, 0.4)' : 'rgba(94, 174, 255, 0.4)'}`,
    transition: 'color 0.2s ease, border-color 0.2s ease',
    '&:hover': {
      color: theme.palette.mode === 'light' ? '#0a5cb8' : '#91c8ff',
      borderBottomColor: theme.palette.mode === 'light' ? '#0a5cb8' : '#91c8ff',
    },
  },
}));

const ActionBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3, 0),
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(6),
  marginBottom: theme.spacing(4),
}));

// const CommentSection = styled(Box)(({ theme }) => ({
//   maxWidth: 680,
//   margin: '0 auto',
//   marginTop: theme.spacing(6),
// }));

const VideoPlayerContainer = styled(Box)(() => ({
  width: '100%',
  maxWidth: 900,
  height: 'auto',
  aspectRatio: '16/9',
  margin: '0 auto',
  marginTop: '-32px', // Overlap slightly with hero section for prominence
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  position: 'relative',
  zIndex: 3,
}));

// Encrypted content placeholder (paywall)
const EncryptedContentContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(8, 4),
  gap: theme.spacing(2),
  minHeight: '400px',
  backgroundColor:
    theme.palette.mode === 'light'
      ? 'rgba(103, 126, 234, 0.05)'
      : 'rgba(103, 126, 234, 0.1)',
  borderRadius: theme.spacing(2),
  border: `2px dashed ${
    theme.palette.mode === 'light'
      ? 'rgba(103, 126, 234, 0.2)'
      : 'rgba(103, 126, 234, 0.3)'
  }`,
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const EncryptedIconWrapper = styled(Box)(({ theme }) => ({
  width: 100,
  height: 100,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(103, 126, 234, 0.2), rgba(118, 75, 162, 0.1))'
      : 'linear-gradient(135deg, rgba(103, 126, 234, 0.15), rgba(118, 75, 162, 0.08))',
  border: `3px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(103, 126, 234, 0.3)'
      : 'rgba(103, 126, 234, 0.25)'
  }`,
  marginBottom: theme.spacing(2),
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
  images?: Array<{
    name: string;
    src: string;
  }>;
  media?: Array<
    ArticleMedia & {
      metadata?: {
        videoImage?: string;
        filename?: string;
        title?: string;
        [key: string]: any;
      };
    }
  >;
  type?: 'essay' | 'episode';
  groupId?: number; // For encrypted articles
  encryptedContent?: string; // Encrypted article data
}

export const ArticlePage = () => {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { from?: string };
    key: string;
    pathname: string;
    search: string;
    hash: string;
  };
  const { name, identifier } = useParams<{
    name: string;
    identifier: string;
  }>();
  const { auth, lists, identifierOperations } = useGlobal();
  // const [comment, setComment] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const videoRef = useRef<any>(null);

  // Fetch the article using usePublish
  const { resource, isLoading, hasResource } = usePublish(2, 'JSON', {
    service: SERVICE_DOCUMENT,
    name: name || '',
    identifier: identifier || '',
  });

  // Use the like hooks
  const { hasLiked, isLoading: isLikeLoading } = useHasLiked(
    identifier || '',
    !!identifier
  );
  const likeCount = useLikeCount(identifier || '', !!identifier);

  const articleData = resource?.data as ArticleData | undefined;
  const qortalMetadata = resource?.qortalMetadata;
  const notificationPermission = useAtomValue(notificationPermissionAtom);

  // Mark subscription notification as seen when visiting the article/episode
  useEffect(() => {
    if (
      !notificationPermission ||
      !articleData?.groupId ||
      !identifier
    ) {
      return;
    }
    const kind =
      articleData.type === 'episode' ? 'episodes' : 'articles';
    const notificationId = `subwire-subscription-${kind}-${articleData.groupId}`;
    qortalRequest({
      action: 'NOTIFICATION_MARK_SEEN',
      notificationIds: [{ notificationId, identifier }],
    }).catch((err) => {
      console.error('Failed to mark notification seen:', err);
    });
  }, [
    notificationPermission,
    articleData?.groupId,
    articleData?.type,
    identifier,
  ]);

  // Decrypt encrypted article content if needed
  const { decryptedContent, isDecrypting, decryptionFailed, decryptionError } =
    useDecryptArticle(articleData || null);

  // Use decrypted content if available, otherwise use original article data
  const displayArticleData = useMemo(() => {
    if (!articleData) return undefined;

    // If article is encrypted and we have decrypted content, merge it
    if (articleData.encryptedContent && decryptedContent) {
      return {
        ...articleData,
        content: decryptedContent.content || articleData.content,
        images: decryptedContent.images || articleData.images,
        media: decryptedContent.media || articleData.media,
        tags: decryptedContent.tags || articleData.tags,
        // For partial encryption, title/subtitle/coverImage might be public
        title: decryptedContent.title || articleData.title,
        subtitle: decryptedContent.subtitle || articleData.subtitle,
        coverImage: decryptedContent.coverImage || articleData.coverImage,
      };
    }

    return articleData;
  }, [articleData, decryptedContent]);

  // Separate video and audio files based on mimeType
  const videoFiles = useMemo(() => {
    return displayArticleData?.media?.filter(
      (v) => v.mimeType && v.mimeType.startsWith('video/')
    );
  }, [displayArticleData?.media]);
  const audioFiles = useMemo(() => {
    return displayArticleData?.media?.filter(
      (v) => v.mimeType && v.mimeType.startsWith('audio/')
    );
  }, [displayArticleData?.media]);

  // Fetch video metadata for episodes
  const { videosWithMetadata, isLoading: isLoadingVideoMetadata } =
    useVideoMetadata(videoFiles, articleData?.groupId);
  // Fetch audio metadata for episodes
  const { audiosWithMetadata, isLoading: isLoadingAudioMetadata } =
    useAudioMetadata(audioFiles, articleData?.groupId);

  // Check if current user is the author
  const isAuthor = auth?.name === name;

  // Disable like button if user is not logged in or is the article author (can't like your own article)
  const cannotLike = !auth?.name || auth?.name === name;

  // Process content to restore images from subwire-image:// references and convert Markdown to HTML
  const processedContent = useMemo(() => {
    if (!displayArticleData?.content) return '';

    // First, restore images if they exist
    let content = displayArticleData.content;
    if (displayArticleData?.images && displayArticleData.images.length > 0) {
      content = restoreImagesForDisplay(content, displayArticleData.images);
    }

    // Normalize smart quotes used as code delimiters (e.g. 'word' or 'word') to backticks so they render as inline code
    const BACKTICK = '\u0060';
    const LEFT_SINGLE = '\u2018';
    const RIGHT_SINGLE = '\u2019';
    content = content.replace(
      new RegExp(
        `([${LEFT_SINGLE}${RIGHT_SINGLE}])([^\\s${LEFT_SINGLE}${RIGHT_SINGLE}]+)\\1`,
        'g'
      ),
      `${BACKTICK}$2${BACKTICK}`
    );

    // Then, convert Markdown to HTML and process bare URLs
    const html = marked.parse(content, {
      breaks: true, // Support line breaks
      gfm: true, // GitHub Flavored Markdown
    });
    return processLinks(html as string);
  }, [displayArticleData?.content, displayArticleData?.images]);

  const handleLike = useCallback(async () => {
    if (!auth?.name) {
      showError('You must be logged in to like an article');
      return;
    }

    if (cannotLike) {
      showError("You can't like your own article");
      return;
    }

    if (!identifier) {
      showError('Article identifier not found');
      return;
    }

    let loadId: string | undefined;

    try {
      if (hasLiked) {
        // Unlike the article
        loadId = showLoading('Unliking article...');
        await unlikeArticle(
          identifier,
          identifierOperations,
          auth.name,
          lists.deleteResource
        );
        showSuccess('Article unliked');
      } else {
        // Like the article
        loadId = showLoading('Liking article...');
        await likeArticle(
          identifier,
          identifierOperations,
          auth.name,
          lists.addNewResources
        );
        showSuccess('Article liked');
      }
    } catch (error) {
      console.error('Error liking/unliking article:', error);
      showError(
        error instanceof Error
          ? error.message
          : 'Failed to like/unlike article. Please try again.'
      );
    } finally {
      if (loadId) {
        dismissToast(loadId);
      }
    }
  }, [
    auth,
    identifier,
    hasLiked,
    cannotLike,
    identifierOperations,
    lists.deleteResource,
    lists.addNewResources,
  ]);

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(`/author/${name}`);
    }
  };

  const handleShare = useCallback(async () => {
    try {
      if (!identifier) {
        showError('Failed to copy link. Please try again. Missing article ID.');
        return;
      }
      if (!name) {
        showError(
          'Failed to copy link. Please try again. Missing author name.'
        );
        return;
      }
      const articleUrl = `qortal://APP/${useTestIdentifiers ? 'a-test-2' : 'Subwire'}/article/${encodeURIComponent(name)}/${encodeURIComponent(identifier)}`;
      await copyToClipboard(articleUrl);
      showSuccess('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError('Failed to copy link. Please try again.');
    }
  }, [identifier, name]);

  const handleDelete = async () => {
    if (!qortalMetadata || !articleData) return;

    let loadingId: string | undefined;

    try {
      setDeleteDialogOpen(false);
      loadingId = showLoading('Deleting article...');

      await deleteArticle(
        qortalMetadata,
        articleData as any,
        lists.deleteResource
      );

      showSuccess('Article deleted successfully!');

      // Navigate back to home or profile
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error deleting article:', error);
      if (loadingId) {
        dismissToast(loadingId);
      }
      showError(
        error instanceof Error
          ? error.message
          : 'Failed to delete article. Please try again.'
      );
    } finally {
      if (loadingId) {
        dismissToast(loadingId);
      }
    }
  };

  // Get avatar URL
  const avatarUrl = name
    ? `/arbitrary/THUMBNAIL/${name}/qortal_avatar?apiVersion=2`
    : undefined;

  // Get cover image URL from data
  const coverImageUrl =
    displayArticleData?.coverImage?.src &&
    typeof displayArticleData.coverImage.src === 'string'
      ? displayArticleData.coverImage.src.startsWith('data:')
        ? displayArticleData.coverImage.src
        : `data:image/webp;base64,${displayArticleData.coverImage.src}`
      : undefined;

  // Format the timestamp
  const timeAgo = qortalMetadata?.created
    ? formatDistanceToNow(qortalMetadata.created, { addSuffix: true })
    : '';

  if (isLoading) {
    return (
      <>
        <MinimalHeader>
          <BackButton onClick={handleBack} size="large">
            <ArrowBack />
          </BackButton>
        </MinimalHeader>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </>
    );
  }

  if (!resource || hasResource === false) {
    return (
      <>
        <MinimalHeader>
          <BackButton onClick={handleBack} size="large">
            <ArrowBack />
          </BackButton>
        </MinimalHeader>
        <ErrorContainer>
          <ErrorIcon>🔍</ErrorIcon>
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              Article Not Found
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              This article may have been deleted or the link you followed is
              incorrect.
            </Typography>
            <Button variant="contained" onClick={handleBack} sx={{ mt: 3 }}>
              Go Back
            </Button>
          </Box>
        </ErrorContainer>
      </>
    );
  }

  if (!articleData) {
    return (
      <>
        <MinimalHeader>
          <BackButton onClick={handleBack} size="large">
            <ArrowBack />
          </BackButton>
        </MinimalHeader>
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              Couldn't Load Article
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              We're having trouble loading this article. Please try again later.
            </Typography>
            <Button variant="contained" onClick={handleBack} sx={{ mt: 3 }}>
              Go Back
            </Button>
          </Box>
        </ErrorContainer>
      </>
    );
  }

  // Show decryption loading state
  if (articleData.encryptedContent && isDecrypting) {
    return (
      <>
        <MinimalHeader>
          <BackButton onClick={handleBack} size="large">
            <ArrowBack />
          </BackButton>
        </MinimalHeader>
        <LoadingContainer>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={50} sx={{ mb: 2 }} />
            <Typography variant="h6">Decrypting content...</Typography>
          </Box>
        </LoadingContainer>
      </>
    );
  }

  // Safety check: ensure displayArticleData is available
  if (!displayArticleData) {
    return (
      <>
        <MinimalHeader>
          <BackButton onClick={handleBack} size="large">
            <ArrowBack />
          </BackButton>
        </MinimalHeader>
        <LoadingContainer>
          <CircularProgress size={50} />
        </LoadingContainer>
      </>
    );
  }

  return (
    <>
      {/* Minimal header with back button */}
      <MinimalHeader>
        <BackButton onClick={handleBack} size="large">
          <ArrowBack />
        </BackButton>
      </MinimalHeader>

      {/* Hero section with article header info */}
      <HeroSection
        sx={{
          backgroundImage: coverImageUrl
            ? `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${coverImageUrl})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <HeroContent>
          {/* Title */}
          <ArticleTitle variant="h1">{displayArticleData.title}</ArticleTitle>

          {/* Subtitle */}
          {displayArticleData.subtitle && (
            <ArticleSubtitle>{displayArticleData.subtitle}</ArticleSubtitle>
          )}

          {/* Author and Actions */}
          <AuthorSection>
            <AuthorInfo onClick={() => navigate(`/author/${name}`)}>
              <StyledAvatar src={avatarUrl}>
                {name?.[0]?.toUpperCase()}
              </StyledAvatar>
              <Box>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ color: 'white' }}
                >
                  {name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    {timeAgo}
                  </Typography>
                </Box>
              </Box>
            </AuthorInfo>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {isAuthor && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/edit/${name}/${identifier}`)}
                    sx={{
                      textTransform: 'none',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      textTransform: 'none',
                      bgcolor: 'rgba(239, 68, 68, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 0.3)',
                      },
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
              <IconButton
                onClick={handleLike}
                disabled={cannotLike || isLikeLoading}
                sx={{
                  color: hasLiked ? '#f91880' : 'white',
                  bgcolor: hasLiked
                    ? 'rgba(249, 24, 128, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    bgcolor: hasLiked
                      ? 'rgba(249, 24, 128, 0.3)'
                      : 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  },
                }}
              >
                {isLikeLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : hasLiked ? (
                  <Favorite />
                ) : (
                  <FavoriteBorder />
                )}
              </IconButton>
              <IconButton
                onClick={handleShare}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
                }}
              >
                <Share />
              </IconButton>
            </Box>
          </AuthorSection>
        </HeroContent>
      </HeroSection>

      {/* Content section */}
      <ContentSection>
        <ContentContainer maxWidth="lg">
          {/* Video Player - PROMINENT for episodes with videos */}
          {isLoadingVideoMetadata && videoFiles && videoFiles.length > 0 && (
            <VideoPlayerContainer>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={500}
                sx={{ borderRadius: 2 }}
              />
            </VideoPlayerContainer>
          )}
          {!isLoadingVideoMetadata &&
            videosWithMetadata &&
            videosWithMetadata.length > 0 && (
              <VideoPlayerContainer>
                <VideoPlayer
                  videoRef={videoRef}
                  poster={
                    videosWithMetadata[0].metadata.videoImage
                      ? ensureImageDataUrl(
                          videosWithMetadata[0].metadata.videoImage
                        )
                      : undefined
                  }
                  qortalVideoResource={{
                    name: videosWithMetadata[0].metadata.videoReference.name,
                    service: videosWithMetadata[0].metadata.videoReference
                      .service as Service,
                    identifier:
                      videosWithMetadata[0].metadata.videoReference.identifier,
                  }}
                  autoPlay={false}
                  filename={videosWithMetadata[0].metadata.filename}
                  styling={{
                    progressSlider: {
                      thumbColor: 'white',
                      railColor: '',
                      trackColor: '#4285f4',
                    },
                  }}
                  {...(videosWithMetadata[0].key &&
                    videosWithMetadata[0].iv && {
                      encryption: {
                        encryptionType: 'streamed-v1',
                        iv: videosWithMetadata[0].iv,
                        key: videosWithMetadata[0].key,
                        mimeType: videosWithMetadata[0].mimeType || 'video/mp4',
                      },
                    })}
                />
              </VideoPlayerContainer>
            )}
          {videosWithMetadata[0]?.metadata?.fileSize && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '18px' }}
              >
                File size:{' '}
                {formatBytes(videosWithMetadata[0].metadata.fileSize)}
              </Typography>
            </Box>
          )}
          {/* Audio Player - PROMINENT for episodes with audio */}
          {isLoadingAudioMetadata && audioFiles && audioFiles.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={120}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          )}
          {!isLoadingAudioMetadata &&
            audiosWithMetadata &&
            audiosWithMetadata.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <AudioPlayerDisplay
                  articleTitle={displayArticleData.title}
                  audioMetadata={audiosWithMetadata[0].metadata}
                  encryptionKey={audiosWithMetadata[0].key}
                  encryptionIv={audiosWithMetadata[0].iv}
                  mimeType={audiosWithMetadata[0].mimeType}
                />
              </Box>
            )}
          {audiosWithMetadata[0]?.metadata?.fileSize && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '18px' }}
              >
                File size:{' '}
                {formatBytes(audiosWithMetadata[0].metadata.fileSize)}
              </Typography>
            </Box>
          )}

          {/* Article Content */}
          <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Show paywall if content is encrypted and decryption failed */}
            {articleData.encryptedContent && decryptionFailed ? (
              <EncryptedContentContainer>
                <EncryptedIconWrapper>
                  <LockIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                </EncryptedIconWrapper>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}
                >
                  Subscription Content
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ textAlign: 'center', maxWidth: '500px', mb: 2 }}
                >
                  {decryptionError ||
                    'This content is exclusive to subscribers. Join the subscription group to access this article.'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', fontStyle: 'italic' }}
                >
                  If you are a member, please wait for the group keys to sync.
                </Typography>
                {articleData.groupId != null && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => {
                      qortalRequest({
                        action: 'OPEN_NEW_TAB',
                        qortalLink: useTestIdentifiers
                          ? `qortal://APP/a-test/subscription/test-subscription-${articleData.groupId}`
                          : `qortal://APP/Subscriptions/subscription/subscription-${articleData.groupId}`,
                      });
                    }}
                    sx={{
                      mt: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    Subscribe
                  </Button>
                )}
              </EncryptedContentContainer>
            ) : (
              <ArticleContent
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const link = target.closest('a');
                  if (!link) return;

                  const qortalHref = link.getAttribute('data-qortal-href');
                  if (qortalHref) {
                    e.preventDefault();

                    // Handle qortal://use-group/action-join/groupid-NNN
                    if (qortalHref.startsWith('qortal://use-')) {
                      const withoutScheme = qortalHref.replace(
                        /^qortal:\/\//,
                        ''
                      );
                      const parts = withoutScheme.split('/');
                      // parts[0] = "use-group", parts[1] = "action-join", parts[2] = "groupid-NNN"
                      const actionPart = parts[1]; // e.g. "action-join"
                      const idPart = parts[2]; // e.g. "groupid-820"
                      const action = actionPart?.split('-')[1]; // "join"
                      const groupId = idPart
                        ? parseInt(idPart.split('-')[1], 10)
                        : NaN;

                      if (action === 'join' && !isNaN(groupId)) {
                        qortalRequest({ action: 'JOIN_GROUP', groupId }).catch(
                          console.error
                        );
                        return;
                      }
                    }

                    // All other qortal:// links — open in new tab
                    qortalRequest({
                      action: 'OPEN_NEW_TAB',
                      qortalLink: qortalHref,
                    }).catch(console.error);
                    return;
                  }

                  // Regular external links — copy to clipboard on click
                  const href = link.getAttribute('href');
                  if (
                    href &&
                    (href.startsWith('http://') || href.startsWith('https://'))
                  ) {
                    e.preventDefault();
                    copyToClipboard(href)
                      .then(() => showSuccess('Link copied to clipboard!'))
                      .catch(console.error);
                  }
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: processedContent }} />
              </ArticleContent>
            )}

            {/* Action Bar */}
            <ActionBar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  onClick={handleLike}
                  disabled={cannotLike || isLikeLoading}
                  size="large"
                  sx={
                    hasLiked
                      ? { color: '#f91880' }
                      : cannotLike || isLikeLoading
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : {}
                  }
                >
                  {isLikeLoading ? (
                    <CircularProgress size={24} />
                  ) : hasLiked ? (
                    <Favorite color="error" />
                  ) : (
                    <FavoriteBorder />
                  )}
                </IconButton>
                <Typography
                  variant="body2"
                  color={hasLiked ? '#f91880' : 'text.secondary'}
                >
                  {likeCount}
                </Typography>
              </Box>
            </ActionBar>

            {/* Comments Section */}
            {/* <CommentSection>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Comments (0)
              </Typography>

              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Share your thoughts..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained">Post Comment</Button>
              </Box>
            </CommentSection> */}
          </Container>
        </ContentContainer>
      </ContentSection>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this article?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this article? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
