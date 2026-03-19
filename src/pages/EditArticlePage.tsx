import { useState, useRef, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Image as ImageIcon,
  Publish,
  Undo,
  Redo,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  ArrowBack,
  Videocam as VideocamIcon,
  AudioFile as AudioFileIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGlobal,
  showError,
  showSuccess,
  showLoading,
  dismissToast,
  usePublish,
  VideoPlayer,
  Service,
} from 'qapp-core';
import {
  publishArticle,
  restoreImagesForDisplay,
  MediaAttachment,
  ArticleMedia,
  VideoMetadata,
} from '../utils/articleQdn';
import { VideoMetadataDialog } from '../components/VideoMetadataDialog';
import { AudioPlayerDisplay } from '../components/AudioPlayerDisplay';
import { useAudioMetadata } from '../hooks/useAudioMetadata';
import { useVideoMetadata } from '../hooks/useVideoMetadata';
import { useDecryptArticle } from '../hooks/useDecryptArticle';
import { SERVICE_DOCUMENT } from '../constants/qdn';
import { deleteDraft, generateDraftId } from '../utils/draftStorage';
import { marked } from 'marked';

const EditorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const EditorHeader = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2, 3),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const EditorToolbar = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  left: '50%',
  transform: 'translateX(-50%)',
  padding: theme.spacing(1, 2),
  display: 'flex',
  gap: theme.spacing(0.5),
  alignItems: 'center',
  flexWrap: 'wrap',
  borderRadius: 10,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  zIndex: 1000,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 4px 20px rgba(0, 0, 0, 0.15)'
      : '0 4px 20px rgba(0, 0, 0, 0.6)',
  maxWidth: 'calc(100vw - 32px)',
}));

const TitleField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    fontSize: '2.5rem',
    fontWeight: 700,
    border: 'none',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  [theme.breakpoints.down('md')]: {
    '& .MuiInputBase-root': {
      fontSize: '2rem',
    },
  },
}));

const SubtitleField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    fontSize: '1.25rem',
    color: theme.palette.text.secondary,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
}));

const ContentField = styled(TextField)(() => ({
  '& .MuiInputBase-root': {
    fontSize: '1.125rem',
    lineHeight: 1.8,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
}));

const PublishButton = styled(Button)(() => ({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 600,
  padding: '8px 24px',
}));

const CoverImageContainer = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: 16,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: theme.palette.background.default,
  marginBottom: theme.spacing(3),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
    transform: 'translateY(-2px)',
  },
}));

const CoverImagePreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  '& img': {
    width: '100%',
    height: 'auto',
    maxHeight: 400,
    objectFit: 'cover',
    display: 'block',
  },
}));

const RemoveCoverButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.error.main,
    color: 'white',
  },
}));

const PreviewContainer = styled(Box)(({ theme }) => ({
  maxWidth: 680,
  margin: '0 auto',
  padding: theme.spacing(4, 0),
  '& h1': {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(2),
  },
  '& h2': {
    fontSize: '1.25rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(4),
  },
  '& p': {
    fontSize: '1.125rem',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    paddingLeft: theme.spacing(3),
    marginLeft: 0,
    marginBottom: theme.spacing(3),
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(2, 0),
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
}));

const VideoPreviewStyled = styled('video')(({ theme }) => ({
  width: '100%',
  maxHeight: '500px',
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
}));

const VideoPlayerContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '500px',
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
}));

const ToolbarDivider = styled(Box)(({ theme }) => ({
  width: 1,
  height: 24,
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(0, 1),
}));

const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '4rem',
  minHeight: '400px',
});

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
  media?: ArticleMedia[];
  type?: 'essay' | 'episode';
  groupId?: number; // For encrypted articles
  encryptedContent?: string; // Encrypted article payload (private group)
}

export const EditArticlePage = () => {
  const navigate = useNavigate();
  const { name, identifier } = useParams<{
    name: string;
    identifier: string;
  }>();
  const { auth, identifierOperations, lists } = useGlobal();
  const { publishMultipleResources } = usePublish();
  const [currentTab, setCurrentTab] = useState(0);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [existingCoverImage, setExistingCoverImage] = useState<string>('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploadedImages, setUploadedImages] = useState<Map<string, string>>(
    new Map()
  );
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [articleType, setArticleType] = useState<'essay' | 'episode'>('essay');

  // Video/audio state for episodes (same shape as WritePage)
  const [existingMedia, setExistingMedia] = useState<ArticleMedia[]>([]);
  const [mediaFile, setMediaFile] = useState<{
    file: File;
    name: string;
    type: 'audio' | 'video';
  } | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(
    null
  );
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);

  // Draft state - only used for cleanup after successful update
  const [draftId, setDraftId] = useState<string>('');

  // Fetch the article using usePublish
  const { resource, isLoading, hasResource } = usePublish(2, 'JSON', {
    service: SERVICE_DOCUMENT,
    name: name || '',
    identifier: identifier || '',
  });

  const articleData = resource?.data as ArticleData | undefined;

  // Decrypt encrypted article content (for private group articles)
  const { decryptedContent } = useDecryptArticle(articleData || null);
  const isEncryptedArticle =
    !!articleData?.groupId && !!articleData?.encryptedContent;
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    hasInitializedRef.current = false;
  }, [identifier, name]);

  // Filter video and audio files from existing videos
  const videoFiles = useMemo(() => {
    return existingMedia?.filter(
      (v) => v.mimeType && v.mimeType.startsWith('video/')
    );
  }, [existingMedia]);

  const audioFiles = useMemo(() => {
    return existingMedia?.filter(
      (v) => v.mimeType && v.mimeType.startsWith('audio/')
    );
  }, [existingMedia]);

  // Fetch metadata for preview
  const { videosWithMetadata } = useVideoMetadata(
    videoFiles,
    articleData?.groupId
  );
  const { audiosWithMetadata } = useAudioMetadata(
    audioFiles,
    articleData?.groupId
  );

  // Check if user is the author
  const isAuthor = auth?.name === name;

  // Handler functions that need to be defined before hooks that use them
  const handleCoverImageDrop = (files: File[]) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(file);
      const imageUrl = URL.createObjectURL(file);
      setCoverImagePreview(imageUrl);
    }
  };

  // Dropzone for cover image - MUST be before any conditional returns
  const {
    getRootProps: getCoverImageRootProps,
    getInputProps: getCoverImageInputProps,
    isDragActive: isCoverImageDragActive,
  } = useDropzone({
    onDrop: handleCoverImageDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: false,
    noClick: false,
  });

  // Process media file (same pattern as WritePage) - used by drop and could be used by file input
  const processMediaFile = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (isVideo || isAudio) {
      setMediaFile({
        file,
        name: file.name,
        type: isVideo ? 'video' : 'audio',
      });

      // Open metadata dialog for video files only
      if (isVideo) {
        setShowMetadataDialog(true);
      }
    }
  };

  const handleMediaDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processMediaFile(file);
    }
  };

  const {
    getRootProps: getMediaRootProps,
    getInputProps: getMediaInputProps,
    isDragActive: isMediaDragActive,
  } = useDropzone({
    onDrop: handleMediaDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
    },
    multiple: false,
    noClick: false,
  });

  // Populate form with existing article data
  useEffect(() => {
    if (!articleData) return;
    if (hasInitializedRef.current) return;
    if (isEncryptedArticle && !decryptedContent) return;

    // Use decrypted values when present (encrypted articles), otherwise fall back to public fields
    const effectiveTitle =
      (articleData.title || '').trim() ||
      (decryptedContent?.title || '').trim() ||
      '';
    const effectiveSubtitle =
      (articleData.subtitle || '').trim() ||
      (decryptedContent?.subtitle || '').trim() ||
      '';
    const effectiveContent =
      decryptedContent?.content ?? articleData.content ?? '';

    setTitle(effectiveTitle);
    setSubtitle(effectiveSubtitle);
    setArticleType(articleData.type || 'essay');

    // Keep content with subwire-image:// references for editing
    setContent(effectiveContent);
    setHistory([effectiveContent]);
    lastSavedContentRef.current = effectiveContent;

    // Cover image: prefer public cover (partial encryption), otherwise use decrypted cover (full encryption)
    const coverSrc =
      articleData.coverImage?.src ?? decryptedContent?.coverImage?.src;
    if (coverSrc) {
      const coverUrl =
        typeof coverSrc === 'string'
          ? coverSrc.startsWith('data:')
            ? coverSrc
            : `data:image/webp;base64,${coverSrc}`
          : '';
      setExistingCoverImage(coverUrl);
      setCoverImagePreview(coverUrl);
    }

    // Existing media: for encrypted articles, media may only exist inside decryptedContent
    const effectiveMedia =
      articleData.media && articleData.media.length > 0
        ? articleData.media
        : (decryptedContent?.media as any[] | undefined);
    if (effectiveMedia && effectiveMedia.length > 0) {
      setExistingMedia(effectiveMedia as any);
    }

    // Generate draft ID for cleanup after update
    if (auth?.name && identifier) {
      setDraftId(
        generateDraftId(articleData.type || 'essay', true, identifier)
      );
    }

    hasInitializedRef.current = true;
  }, [
    articleData,
    decryptedContent,
    isEncryptedArticle,
    auth?.name,
    identifier,
    name,
  ]);

  const handleUpdate = async () => {
    if (!isAuthor) {
      showError('You can only edit your own articles');
      return;
    }

    if (!title.trim()) {
      showError('Please enter a title for your article');
      return;
    }

    if (!content.trim()) {
      showError('Please add content to your article');
      return;
    }

    if (!coverImagePreview) {
      showError('Please upload a cover image');
      return;
    }

    if (!auth?.name || !identifierOperations) {
      showError('Authentication required');
      return;
    }

    let loadingId: string | undefined;

    try {
      setIsPublishing(true);
      loadingId = showLoading('Updating article on Qortal blockchain...');

      // Prepare media attachments for episodes (same logic as WritePage)
      let media: MediaAttachment[] = [];
      if (articleType === 'episode' && mediaFile) {
        const isReplacingEncryptedMedia =
          !!articleData?.groupId && existingMedia.length > 0;
        media = [
          {
            type: mediaFile.type,
            file: mediaFile.file,
            videoMetadata:
              mediaFile.type === 'video'
                ? videoMetadata || undefined
                : undefined,
            ...(isReplacingEncryptedMedia && {
              existingMedia: existingMedia[0],
              replaceWithNewFile: true,
            }),
          },
        ];
      }

      // Update article
      const shouldEncryptMetadata =
        !!articleData?.groupId &&
        !!articleData?.encryptedContent &&
        !articleData?.title;

      const resultIdentifier = await publishArticle({
        title,
        subtitle,
        content,
        coverImage: coverImage || undefined,
        media: media.length > 0 ? media : undefined,
        identifierOperations,
        userName: auth.name,
        uploadedImages,
        type: articleType,
        publishMultipleResources,
        addNewResources: lists.addNewResources,
        updateNewResources: lists.updateNewResources,
        existingIdentifier: identifier, // Pass the identifier to update existing article
        existingImages:
          (articleData?.images as any) || (decryptedContent?.images as any),
        existingCoverImage:
          !coverImage && existingCoverImage ? existingCoverImage : undefined,
        existingMedia: articleType === 'episode' ? existingMedia : undefined,
        groupId: articleData?.groupId,
        encryptMetadata: shouldEncryptMetadata,
        decryptedContent:
          isEncryptedArticle && decryptedContent?.content
            ? {
                content: decryptedContent.content,
                images: decryptedContent.images as any,
                media: decryptedContent.media as any,
              }
            : undefined,
      });

      // Delete draft after successful update
      // Don't let draft deletion errors prevent showing success
      if (draftId && auth.name) {
        try {
          await deleteDraft(auth.name, draftId);
        } catch (error) {
          console.error(
            'Error deleting draft (article was updated successfully):',
            error
          );
          // Don't show error to user - article was updated successfully
        }
      }

      dismissToast(loadingId);
      showSuccess('Article updated successfully!');

      setTimeout(() => {
        navigate(`/article/${auth.name}/${resultIdentifier}`);
      }, 1000);
    } catch (error: any) {
      console.error('Error updating article:', error);
      if (loadingId) {
        dismissToast(loadingId);
      }
      showError(error.message || 'Failed to update article');
    } finally {
      setIsPublishing(false);
    }
  };

  const applyFormatting = (before: string, after: string = '') => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    const newText = beforeText + before + selectedText + after + afterText;
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos =
        start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => applyFormatting('**', '**');
  const handleItalic = () => applyFormatting('*', '*');
  const handleUnderline = () => applyFormatting('<u>', '</u>');
  const handleBulletList = () => applyFormatting('\n- ', '');
  const handleNumberedList = () => applyFormatting('\n1. ', '');
  const handleQuote = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    const needNewlineBefore = start > 0 && !beforeText.endsWith('\n');
    const quoted =
      selectedText.indexOf('\n') === -1
        ? '> ' + selectedText
        : selectedText
            .split('\n')
            .map((line) => '> ' + line)
            .join('\n');
    const newText =
      beforeText + (needNewlineBefore ? '\n' : '') + quoted + afterText;
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const newEnd = start + (needNewlineBefore ? 1 : 0) + quoted.length;
      textarea.setSelectionRange(newEnd, newEnd);
    }, 0);
  };
  const handleCode = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    const fence = '\n```\n';
    const newText = beforeText + fence + selectedText + fence + afterText;
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const cursorInside = start + fence.length;
      const cursorEnd = cursorInside + selectedText.length + fence.length;
      textarea.setSelectionRange(
        selectedText.length > 0 ? cursorEnd : cursorInside,
        selectedText.length > 0 ? cursorEnd : cursorInside
      );
    }, 0);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      const imageName = file.name;

      setUploadedImages((prev) => new Map(prev).set(imageName, imageUrl));
      applyFormatting(`![${imageName}](${imageUrl})`, '');
      event.target.value = '';
    }
  };

  const handleCoverImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(file);
      const imageUrl = URL.createObjectURL(file);
      setCoverImagePreview(imageUrl);
      event.target.value = '';
    }
  };

  const handleRemoveCoverImage = () => {
    if (coverImagePreview && coverImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImage(null);
    setCoverImagePreview('');
    setExistingCoverImage('');
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setVideoMetadata(null);
  };

  const handleSaveMetadata = (metadata: VideoMetadata) => {
    setVideoMetadata(metadata);
  };

  const handleCloseMetadataDialog = (saved: boolean) => {
    // If cancelled (not saved), remove the video file
    if (!saved && mediaFile?.type === 'video') {
      setMediaFile(null);
    }
    setShowMetadataDialog(false);
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const updateContent = (newContent: string) => {
    setContent(newContent);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (newContent !== lastSavedContentRef.current) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        lastSavedContentRef.current = newContent;
      }
    }, 500);
  };

  const saveToHistory = () => {
    if (content !== lastSavedContentRef.current) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(content);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      lastSavedContentRef.current = content;
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
      lastSavedContentRef.current = history[historyIndex + 1];
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <EditorContainer>
        <EditorHeader>
          <Typography variant="h6" fontWeight={600}>
            Loading Article...
          </Typography>
        </EditorHeader>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </EditorContainer>
    );
  }

  if (!resource || hasResource === false || !articleData) {
    return (
      <EditorContainer>
        <EditorHeader>
          <Typography variant="h6" fontWeight={600}>
            Article Not Found
          </Typography>
        </EditorHeader>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">
            Unable to load article. It may not exist or has been deleted.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            Go Home
          </Button>
        </Container>
      </EditorContainer>
    );
  }

  if (!isAuthor) {
    return (
      <EditorContainer>
        <EditorHeader>
          <Typography variant="h6" fontWeight={600}>
            Unauthorized
          </Typography>
        </EditorHeader>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            You can only edit your own articles. This article belongs to {name}.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate(`/article/${name}/${identifier}`)}
            sx={{ mt: 2 }}
          >
            View Article
          </Button>
        </Container>
      </EditorContainer>
    );
  }

  return (
    <EditorContainer>
      <EditorHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Edit {articleType === 'episode' ? 'Episode' : 'Article'}
          </Typography>
        </Box>
      </EditorHeader>

      <Box
        sx={{
          position: 'sticky',
          top: 64,
          zIndex: 10,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 1px 3px rgba(0, 0, 0, 0.05)'
              : '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Tabs
              value={currentTab}
              onChange={(_, newValue) => setCurrentTab(newValue)}
            >
              <Tab
                label="Edit"
                sx={{ textTransform: 'none', fontSize: '1rem' }}
              />
              <Tab
                label="Preview"
                sx={{ textTransform: 'none', fontSize: '1rem' }}
              />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <PublishButton
                variant="contained"
                startIcon={
                  isPublishing ? <CircularProgress size={20} /> : <Publish />
                }
                onClick={handleUpdate}
                disabled={isPublishing}
                sx={{ my: 1 }}
              >
                {isPublishing ? 'Updating...' : 'Update Article'}
              </PublishButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {currentTab === 0 && (
        <Container maxWidth="lg" sx={{ py: 4, pb: 12 }}>
          <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
            <EditorToolbar elevation={0}>
              <IconButton
                size="small"
                title="Undo (Ctrl+Z)"
                onClick={handleUndo}
                disabled={historyIndex === 0}
              >
                <Undo />
              </IconButton>
              <IconButton
                size="small"
                title="Redo (Ctrl+Y)"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
              >
                <Redo />
              </IconButton>

              <ToolbarDivider />

              <IconButton size="small" title="Bold" onClick={handleBold}>
                <FormatBold />
              </IconButton>
              <IconButton size="small" title="Italic" onClick={handleItalic}>
                <FormatItalic />
              </IconButton>
              <IconButton
                size="small"
                title="Underline"
                onClick={handleUnderline}
              >
                <FormatUnderlined />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Bullet List"
                onClick={handleBulletList}
              >
                <FormatListBulleted />
              </IconButton>
              <IconButton
                size="small"
                title="Numbered List"
                onClick={handleNumberedList}
              >
                <FormatListNumbered />
              </IconButton>

              <ToolbarDivider />

              <IconButton size="small" title="Quote" onClick={handleQuote}>
                <FormatQuote />
              </IconButton>
              <IconButton size="small" title="Code" onClick={handleCode}>
                <Code />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Insert Image"
                onClick={handleImageClick}
              >
                <ImageIcon />
              </IconButton>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
            </EditorToolbar>

            {/* Cover Image */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Cover Image *
              </Typography>
              {coverImagePreview ? (
                <CoverImagePreview>
                  <img src={coverImagePreview} alt="Cover" />
                  <RemoveCoverButton
                    onClick={handleRemoveCoverImage}
                    size="small"
                  >
                    <CloseIcon />
                  </RemoveCoverButton>
                </CoverImagePreview>
              ) : (
                <CoverImageContainer
                  elevation={0}
                  {...getCoverImageRootProps()}
                  sx={{
                    borderColor: isCoverImageDragActive
                      ? 'primary.main'
                      : undefined,
                    backgroundColor: isCoverImageDragActive
                      ? 'action.hover'
                      : undefined,
                  }}
                >
                  <input
                    ref={coverImageInputRef}
                    {...getCoverImageInputProps()}
                    onChange={handleCoverImageUpload}
                  />
                  <UploadIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                  />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upload Cover Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isCoverImageDragActive
                      ? 'Drop your image here...'
                      : 'Click to browse or drag and drop your image here'}
                  </Typography>
                </CoverImageContainer>
              )}
            </Box>

            {/* Video/Audio for Episodes */}
            {articleType === 'episode' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Media{' '}
                  {existingMedia.length > 0 ? '' : '(optional - keep existing)'}
                </Typography>

                {/* Show existing video */}
                {existingMedia.length > 0 && !mediaFile && (
                  <Paper
                    sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {existingMedia[0].mimeType?.startsWith('audio/') ? (
                        <AudioFileIcon
                          sx={{ fontSize: 40, color: 'primary.main' }}
                        />
                      ) : (
                        <VideocamIcon
                          sx={{ fontSize: 40, color: 'primary.main' }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          Existing Media File
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {existingMedia[0].identifier}
                        </Typography>
                      </Box>
                      <Chip label="Saved" color="success" size="small" />
                    </Box>
                  </Paper>
                )}

                {/* Show new media file */}
                {mediaFile && (
                  <Paper
                    sx={{ p: 2, mb: 2, border: 1, borderColor: 'primary.main' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {mediaFile.type === 'video' ? (
                        <VideocamIcon
                          sx={{ fontSize: 40, color: 'primary.main' }}
                        />
                      ) : (
                        <AudioFileIcon
                          sx={{ fontSize: 40, color: 'primary.main' }}
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          New {mediaFile.type === 'video' ? 'Video' : 'Audio'}{' '}
                          File
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {mediaFile.file.name}
                        </Typography>
                        {mediaFile.type === 'video' && !videoMetadata && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShowMetadataDialog(true)}
                            sx={{ mt: 1 }}
                          >
                            Add Metadata
                          </Button>
                        )}
                        {videoMetadata && (
                          <Chip
                            label="Metadata Added"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                      <IconButton
                        onClick={handleRemoveMedia}
                        size="small"
                        color="error"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                )}

                {/* Upload button with drag and drop */}
                <Box
                  {...getMediaRootProps()}
                  sx={{
                    mb: 2,
                    p: 3,
                    border: 2,
                    borderStyle: 'dashed',
                    borderRadius: 2,
                    borderColor: isMediaDragActive ? 'primary.main' : 'divider',
                    backgroundColor: isMediaDragActive
                      ? 'action.hover'
                      : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <input {...getMediaInputProps()} />
                  <UploadIcon
                    sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}
                  />
                  <Typography variant="body1" fontWeight={600}>
                    {isMediaDragActive
                      ? 'Drop media file here'
                      : mediaFile
                        ? 'Replace Media File'
                        : existingMedia.length > 0
                          ? 'Replace Media File'
                          : 'Upload Media File'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {isMediaDragActive
                      ? ''
                      : 'Click to browse or drag and drop your video/audio file here'}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Title */}
            <TitleField
              fullWidth
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />

            {/* Subtitle */}
            <SubtitleField
              fullWidth
              placeholder="Subtitle (optional)"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              variant="outlined"
              sx={{ mb: 3 }}
            />

            {/* Content */}
            <ContentField
              fullWidth
              multiline
              placeholder="Tell your story..."
              value={content}
              onChange={(e) => updateContent(e.target.value)}
              variant="outlined"
              minRows={20}
              inputRef={contentRef}
              onKeyDown={(e) => {
                if (
                  e.key === ' ' ||
                  e.key === '.' ||
                  e.key === ',' ||
                  e.key === '!' ||
                  e.key === '?' ||
                  e.key === 'Enter'
                ) {
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  saveToHistory();
                }

                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    handleUndo();
                  } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    handleRedo();
                  }
                }
              }}
            />
          </Box>
        </Container>
      )}

      {currentTab === 1 && (
        <Box>
          {/* Full-width hero (title + subtitle only) */}
          <Box
            sx={{
              minHeight: { xs: 220, sm: 280 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: coverImagePreview
                ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${coverImagePreview})`
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
              overflow: 'hidden',
              pt: { xs: 6, sm: 8 },
              pb: { xs: 6, sm: 8 },
            }}
          >
            <Box sx={{ width: '100%', maxWidth: 800, px: 3 }}>
              {title && (
                <Typography
                  variant="h3"
                  sx={{
                    color: 'white',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    textShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    mb: subtitle ? 2 : 0,
                  }}
                >
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255,255,255,0.92)',
                    lineHeight: 1.6,
                    textShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Content card (similar to ArticlePage content container) */}
          <Container
            maxWidth="lg"
            sx={{ mt: { xs: -4, sm: -6 }, position: 'relative', zIndex: 2 }}
          >
            <Box
              sx={(theme) => ({
                backgroundColor: theme.palette.background.paper,
                borderRadius: '24px 24px 0 0',
                minHeight: '50vh',
                pt: 4,
                pb: 8,
                boxShadow:
                  theme.palette.mode === 'light'
                    ? '0 -4px 24px rgba(0, 0, 0, 0.08)'
                    : '0 -4px 24px rgba(0, 0, 0, 0.4)',
              })}
            >
              <Container maxWidth="md" sx={{ py: 4 }}>
                <PreviewContainer>
                  {/* Show video preview for new video uploads */}
                  {mediaFile && mediaFile.type === 'video' && (
                    <VideoPreviewStyled controls>
                      <source
                        src={URL.createObjectURL(mediaFile.file)}
                        type={mediaFile.file.type}
                      />
                    </VideoPreviewStyled>
                  )}

                  {/* Show audio preview for new audio uploads */}
                  {mediaFile && mediaFile.type === 'audio' && (
                    <Box sx={{ mb: 3 }}>
                      <audio controls style={{ width: '100%' }}>
                        <source
                          src={URL.createObjectURL(mediaFile.file)}
                          type={mediaFile.file.type}
                        />
                      </audio>
                    </Box>
                  )}

                  {/* Show existing video with VideoPlayer (only for video mimeType) */}
                  {!mediaFile &&
                    videosWithMetadata &&
                    videosWithMetadata.length > 0 && (
                      <VideoPlayerContainer>
                        <VideoPlayer
                          videoRef={videoRef}
                          poster={
                            videosWithMetadata[0].metadata.videoImage
                              ? `data:image/webp;base64,${videosWithMetadata[0].metadata.videoImage}`
                              : undefined
                          }
                          qortalVideoResource={{
                            name: videosWithMetadata[0].metadata.videoReference
                              .name,
                            service: videosWithMetadata[0].metadata
                              .videoReference.service as Service,
                            identifier:
                              videosWithMetadata[0].metadata.videoReference
                                .identifier,
                          }}
                          autoPlay={false}
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
                                mimeType:
                                  videosWithMetadata[0].mimeType || 'video/mp4',
                              },
                            })}
                        />
                      </VideoPlayerContainer>
                    )}

                  {/* Show existing audio with AudioPlayerDisplay (only for audio mimeType) */}
                  {!mediaFile &&
                    audiosWithMetadata &&
                    audiosWithMetadata.length > 0 &&
                    audiosWithMetadata[0].metadata?.audioReference && (
                      <Box sx={{ mb: 3 }}>
                        <AudioPlayerDisplay
                          articleTitle={title}
                          audioMetadata={audiosWithMetadata[0].metadata}
                          encryptionKey={audiosWithMetadata[0].key}
                          encryptionIv={audiosWithMetadata[0].iv}
                          mimeType={audiosWithMetadata[0].mimeType}
                        />
                      </Box>
                    )}

                  {content && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          // First restore subwire-image:// references with actual base64 data for preview
                          let previewContent = content;
                          const previewImages =
                            (articleData?.images as any[]) ||
                            (decryptedContent?.images as any[]) ||
                            [];
                          if (previewImages.length > 0) {
                            previewContent = restoreImagesForDisplay(
                              content,
                              previewImages
                            );
                          }

                          // Then render markdown like ArticlePage
                          return marked.parse(previewContent, {
                            breaks: true,
                            gfm: true,
                          });
                        })(),
                      }}
                    />
                  )}

                  {!title && !subtitle && !content && (
                    <Box
                      sx={{
                        textAlign: 'center',
                        py: 8,
                        color: 'text.secondary',
                      }}
                    >
                      <Typography variant="h6">
                        Nothing to preview yet
                      </Typography>
                      <Typography variant="body2">
                        Start editing to see a preview
                      </Typography>
                    </Box>
                  )}
                </PreviewContainer>
              </Container>
            </Box>
          </Container>
        </Box>
      )}

      {/* Video Metadata Dialog */}
      <VideoMetadataDialog
        open={showMetadataDialog}
        onClose={handleCloseMetadataDialog}
        onSave={handleSaveMetadata}
        videoFile={mediaFile?.file ?? null}
        isEncrypted={!!articleData?.groupId}
      />
    </EditorContainer>
  );
};
