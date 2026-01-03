import { useState, useRef, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Tooltip,
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
  Save as SaveIcon,
  Undo,
  Redo,
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Videocam as VideocamIcon,
  AudioFile as AudioFileIcon,
  Lock as LockIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  useGlobal,
  showError,
  showSuccess,
  showLoading,
  dismissToast,
  usePublish,
} from 'qapp-core';
import {
  publishArticle,
  VideoMetadata,
  MediaAttachment,
} from '../utils/articleQdn';
import { VideoMetadataDialog } from '../components/VideoMetadataDialog';
import {
  saveDraft,
  deleteDraft,
  generateDraftId,
  getDraft,
} from '../utils/draftStorage';
import { fileToBase64, base64ToFile } from '../utils/mapHelpers';
import { useAtomValue } from 'jotai';
import {
  profileDataAtom,
  encryptionPreferenceAtom,
  encryptMetadataPreferenceAtom,
} from '../state/global/profile';
import { useGroupDetails } from '../hooks/useGroupDetails';
import { useAtom } from 'jotai';
import { useMediaInfo } from '../hooks/useMediaInfo';

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

const MediaUploadZone = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: 16,
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0, 0, 0.2, 1)',
  backgroundColor: theme.palette.background.default,
  marginBottom: theme.spacing(3),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
    transform: 'translateY(-2px)',
  },
}));

const MediaPreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
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
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(2, 0),
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

const ToolbarDivider = styled(Box)(({ theme }) => ({
  width: 1,
  height: 24,
  backgroundColor: theme.palette.divider,
  margin: theme.spacing(0, 1),
}));

// Helper function to get file extension
const getFileExtension = (file: File): string => {
  const fileName = file.name;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot + 1).toLowerCase();
};

export const WritePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type } = useParams<{ type: 'essay' | 'episode' }>();
  const { isHEVC } = useMediaInfo();
  const { auth, identifierOperations, lists } = useGlobal();
  const { publishMultipleResources } = usePublish();
  const [currentTab, setCurrentTab] = useState(0);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<{
    file: File;
    name: string;
    type: 'audio' | 'video';
  } | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(
    null
  );
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<Map<string, string>>(
    new Map()
  );
  const [uploadedImageFiles, setUploadedImageFiles] = useState<
    Map<string, File>
  >(new Map());
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  // Get profile data to check for attached group
  const profileData = useAtomValue(profileDataAtom);
  const hasSubscriptionGroup = !!profileData?.groupId;

  // Fetch group details if user has a group attached
  const { groupDetails } = useGroupDetails(profileData?.groupId);

  // Persistent encryption preference
  const [encryptionPreferences, setEncryptionPreferences] = useAtom(
    encryptionPreferenceAtom
  );
  const userEncryptionKey = auth?.address || 'default';
  const [isEncrypted, setIsEncrypted] = useState(false);

  // Persistent metadata encryption preference
  const [encryptMetadataPreferences, setEncryptMetadataPreferences] = useAtom(
    encryptMetadataPreferenceAtom
  );
  const [encryptMetadata, setEncryptMetadata] = useState(false);

  // Load saved preference when component mounts or preferences/user changes
  useEffect(() => {
    if (hasSubscriptionGroup && userEncryptionKey) {
      const savedPref = encryptionPreferences[userEncryptionKey];
      // Load saved preference or default to false
      console.log(
        'Loading encryption preference:',
        savedPref,
        'for key:',
        userEncryptionKey
      );
      setIsEncrypted(savedPref === true);
    } else {
      // Reset to false if no subscription group
      console.log('No subscription group, setting isEncrypted to false');
      setIsEncrypted(false);
    }
    // Only run when dependencies change, not when isEncrypted changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubscriptionGroup, userEncryptionKey, encryptionPreferences]);

  // Load saved metadata encryption preference
  useEffect(() => {
    if (hasSubscriptionGroup && userEncryptionKey && isEncrypted) {
      const savedMetadataPref = encryptMetadataPreferences[userEncryptionKey];
      // Load saved preference or default to false (keep metadata public)
      setEncryptMetadata(savedMetadataPref === true);
    } else {
      // Reset to false if no subscription or not encrypted
      setEncryptMetadata(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSubscriptionGroup,
    userEncryptionKey,
    isEncrypted,
    encryptMetadataPreferences,
  ]);

  // Save preference to storage when toggle changes (but only if user made the change)
  const handleEncryptionToggle = (checked: boolean) => {
    console.log('Encryption toggle changed to:', checked);
    setIsEncrypted(checked);
    if (hasSubscriptionGroup && userEncryptionKey) {
      setEncryptionPreferences((prev) => ({
        ...prev,
        [userEncryptionKey]: checked,
      }));
    }
    // Reset metadata encryption when turning off encryption
    if (!checked) {
      setEncryptMetadata(false);
    }

    // Handle video metadata based on encryption mode
    if (mediaFile?.type === 'video') {
      if (checked) {
        // Switching TO encrypted mode - auto-generate minimal metadata
        console.log(
          'Switching to encrypted mode - auto-generating minimal metadata'
        );
        const nameWithoutExt = mediaFile.file.name.replace(/\.[^/.]+$/, '');
        setVideoMetadata({
          title: nameWithoutExt,
          description: '',
          category: 1, // Default category
          duration: undefined,
          videoImage: undefined,
          extracts: [],
          subcategory: undefined,
        });
      } else {
        // Switching TO public mode - prompt for video metadata if not already set
        if (!videoMetadata) {
          console.log(
            'Switching to public mode - prompting for video metadata'
          );
          setShowMetadataDialog(true);
        }
      }
    }
  };

  // Save metadata encryption preference
  const handleMetadataEncryptionToggle = (checked: boolean) => {
    setEncryptMetadata(checked);
    if (hasSubscriptionGroup && userEncryptionKey && isEncrypted) {
      setEncryptMetadataPreferences((prev) => ({
        ...prev,
        [userEncryptionKey]: checked,
      }));
    }
  };

  // Load draft on mount if draftId is provided in URL state
  useEffect(() => {
    const loadDraftData = async () => {
      const state = location.state as { draftId?: string };
      if (state?.draftId && auth?.name) {
        const draft = await getDraft(auth.name, state.draftId);
        if (draft) {
          setDraftId(draft.id);
          setTitle(draft.title);
          setSubtitle(draft.subtitle);
          setContent(draft.content);

          // Restore cover image from base64
          if (draft.coverImagePreview) {
            setCoverImagePreview(draft.coverImagePreview);
          }
          if (
            draft.coverImageData &&
            draft.coverImageFilename &&
            draft.coverImageMimeType
          ) {
            const file = base64ToFile(
              draft.coverImageData,
              draft.coverImageFilename,
              draft.coverImageMimeType
            );
            setCoverImage(file);
          }

          // Restore uploaded images from base64
          if (draft.uploadedImages) {
            const imageMap = new Map<string, string>();
            const fileMap = new Map<string, File>();
            Object.entries(draft.uploadedImages).forEach(([name, imgData]) => {
              const file = base64ToFile(
                imgData.data,
                imgData.filename,
                imgData.mimeType
              );
              const url = URL.createObjectURL(file);
              imageMap.set(name, url);
              fileMap.set(name, file);
            });
            setUploadedImages(imageMap);
            setUploadedImageFiles(fileMap);
          }

          // Note: Video/audio files are NOT restored from drafts
          // User will need to re-select their media file if any
        }
      } else if (auth?.name && type) {
        // Generate new draft ID
        setDraftId(generateDraftId(type));
      }
    };
    loadDraftData();
  }, [location.state, auth?.name, type]);

  // Manual save draft function
  const handleSaveDraft = async () => {
    if (!auth?.name || !draftId || !type) {
      showError('Please log in to save drafts');
      return;
    }

    setIsSavingDraft(true);
    try {
      // Convert cover image to base64 if present
      let coverImageData: string | undefined;
      let coverImageFilename: string | undefined;
      let coverImageMimeType: string | undefined;

      if (coverImage) {
        coverImageData = await fileToBase64(coverImage);
        coverImageFilename = coverImage.name;
        coverImageMimeType = coverImage.type;
      }

      // Convert uploaded images to base64
      const uploadedImagesData: Record<
        string,
        { data: string; filename: string; mimeType: string }
      > = {};
      for (const [name, file] of uploadedImageFiles.entries()) {
        const data = await fileToBase64(file);
        uploadedImagesData[name] = {
          data,
          filename: file.name,
          mimeType: file.type,
        };
      }

      await saveDraft(auth.name, {
        id: draftId,
        userName: auth.name,
        type: type as 'essay' | 'episode',
        title,
        subtitle,
        content,
        coverImagePreview,
        coverImageData,
        coverImageFilename,
        coverImageMimeType,
        uploadedImages: uploadedImagesData,
        createdAt: lastSavedTime || Date.now(),
      });
      setLastSavedTime(Date.now());
      showSuccess('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      showError('Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showError('Please enter a title for your article');
      return;
    }

    if (!content.trim()) {
      showError('Please add content to your article');
      return;
    }

    if (!coverImage) {
      showError('Please upload a cover image');
      return;
    }

    if (type === 'episode' && !mediaFile) {
      showError('Please upload an audio or video file for your episode');
      return;
    }

    // Video metadata is only required for PUBLIC videos, not encrypted ones
    console.log(
      'Publish validation - isEncrypted:',
      isEncrypted,
      'mediaFile type:',
      mediaFile?.type,
      'videoMetadata:',
      videoMetadata
    );
    if (
      type === 'episode' &&
      mediaFile?.type === 'video' &&
      !isEncrypted &&
      !videoMetadata
    ) {
      showError('Please add metadata for your video');
      return;
    }

    if (!auth?.name) {
      showError('Please authenticate with a Qortal name to publish');
      return;
    }

    if (!auth?.name || !identifierOperations) {
      showError('Authentication required');
      return;
    }

    let loadingId: string | undefined;

    try {
      setIsPublishing(true);
      loadingId = showLoading('Publishing to Qortal blockchain...');

      // Prepare media attachments for episodes
      let media: MediaAttachment[] | undefined;
      if (type === 'episode' && mediaFile) {
        console.log('=== PREPARING MEDIA FOR PUBLISH ===');
        console.log('mediaFile.type:', mediaFile.type);
        console.log('isEncrypted:', isEncrypted);
        console.log('videoMetadata:', videoMetadata);
        console.log('===================================');

        media = [
          {
            type: mediaFile.type,
            file: mediaFile.file,
            // Include videoMetadata for ALL videos (encrypted and public)
            // Encrypted videos use auto-generated minimal metadata
            videoMetadata:
              mediaFile.type === 'video'
                ? videoMetadata || undefined
                : undefined,
          },
        ];

        console.log('Prepared media:', media);
      }

      const identifier = await publishArticle({
        title,
        subtitle,
        content,
        coverImage,
        media,
        identifierOperations,
        userName: auth.name,
        uploadedImages,
        type: (type as 'essay' | 'episode') || 'essay',
        publishMultipleResources,
        addNewResources: lists.addNewResources,
        updateNewResources: lists.updateNewResources,
        groupId: isEncrypted ? profileData?.groupId : undefined,
        encryptMetadata: isEncrypted ? encryptMetadata : false,
      });

      // Delete draft after successful publish
      // Don't let draft deletion errors prevent showing success
      if (draftId && auth.name) {
        try {
          await deleteDraft(auth.name, draftId);
        } catch (error) {
          console.error(
            'Error deleting draft (article was published successfully):',
            error
          );
          // Don't show error to user - article was published successfully
        }
      }

      dismissToast(loadingId);

      showSuccess('Article published successfully!');
      // Navigate to the published article
      setTimeout(() => {
        navigate(`/publication/${auth.name}/${identifier}`);
      }, 1000);
    } catch (error: any) {
      console.error('Error publishing article:', error);
      if (loadingId) {
        dismissToast(loadingId);
      }
      showError(error.message || 'Failed to publish article');
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

    // Set cursor position after formatting
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
  const handleQuote = () => applyFormatting('\n> ', '');
  const handleCode = () => applyFormatting('`', '`');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Create a temporary URL for the image
      const imageUrl = URL.createObjectURL(file);
      const imageName = file.name;

      // Store both the URL mapping and the File object
      setUploadedImages((prev) => new Map(prev).set(imageName, imageUrl));
      setUploadedImageFiles((prev) => new Map(prev).set(imageName, file));

      // Insert markdown with the temporary URL
      applyFormatting(`![${imageName}](${imageUrl})`, '');

      // Reset the input
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
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setCoverImage(null);
    setCoverImagePreview('');
  };

  const handleMediaFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    console.log('Media file selected:', file);
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      console.log(
        'File type:',
        file.type,
        'isVideo:',
        isVideo,
        'isAudio:',
        isAudio
      );

      if (isVideo || isAudio) {
        // Validate video file for unsupported formats (HEVC codec and MKV container)
        if (isVideo) {
          const notSupportedCodec = await isHEVC(file);
          const isMKV = getFileExtension(file) === 'mkv';
          const isUnsupportedFile = notSupportedCodec || isMKV;

          if (isUnsupportedFile) {
            if (notSupportedCodec) {
              showError(`${file.name} uses the unsupported encoding: HEVC`);
            }
            if (isMKV) {
              showError(
                `${file.name} uses the unsupported file container: MKV`
              );
            }

            // Reset the input
            event.target.value = '';
            return;
          }
        }

        console.log('=== VIDEO UPLOAD DEBUG ===');
        console.log('isEncrypted state:', isEncrypted);
        console.log('hasSubscriptionGroup:', hasSubscriptionGroup);
        console.log('Current videoMetadata:', videoMetadata);
        console.log('========================');

        setMediaFile({
          file,
          name: file.name,
          type: isVideo ? 'video' : 'audio',
        });
        event.target.value = '';

        // Open metadata dialog for all video files (encrypted and non-encrypted)
        if (isVideo) {
          console.log('Opening video metadata dialog');
          setShowMetadataDialog(true);
        }
      }
    }
  };

  const handleRemoveMediaFile = () => {
    setMediaFile(null);
    setVideoMetadata(null);
  };

  const handleSaveMetadata = (metadata: VideoMetadata) => {
    console.log('Metadata saved:', metadata);
    setVideoMetadata(metadata);
  };

  const handleCloseMetadataDialog = (saved: boolean) => {
    // If cancelled (not saved), remove the video file
    if (!saved && mediaFile?.type === 'video') {
      console.log('Metadata dialog cancelled - removing video');
      setMediaFile(null);
    }
    setShowMetadataDialog(false);
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const updateContent = (newContent: string) => {
    setContent(newContent);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to save to history after 500ms of no typing
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <EditorContainer>
      {/* Authentication Warning */}
      {!auth?.name && (
        <Alert severity="warning" sx={{ m: 2 }}>
          You need to authenticate with a Qortal name to publish articles.
          Please log in to continue.
        </Alert>
      )}

      {/* Editor Header */}
      <EditorHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            New {type === 'episode' ? 'Episode' : 'Essay'}
          </Typography>
        </Box>
      </EditorHeader>

      {/* Tabs */}
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 64,
          zIndex: 10,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow:
            theme.palette.mode === 'light'
              ? '0 1px 3px rgba(0, 0, 0, 0.05)'
              : '0 1px 3px rgba(0, 0, 0, 0.3)',
        })}
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
                label="Write"
                sx={{ textTransform: 'none', fontSize: '1rem' }}
              />
              <Tab
                label="Preview"
                sx={{ textTransform: 'none', fontSize: '1rem' }}
              />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <PublishButton
                variant="outlined"
                startIcon={
                  isSavingDraft ? <CircularProgress size={20} /> : <SaveIcon />
                }
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !auth?.name}
                sx={{ my: 1 }}
              >
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </PublishButton>
              <PublishButton
                variant="contained"
                startIcon={
                  isPublishing ? <CircularProgress size={20} /> : <Publish />
                }
                onClick={handlePublish}
                disabled={isPublishing || !auth?.name}
                sx={{ my: 1 }}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </PublishButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Editor Content */}
      {currentTab === 0 && (
        <Container maxWidth="lg" sx={{ py: 4, pb: 12 }}>
          <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Toolbar */}
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

            {hasSubscriptionGroup && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(29, 155, 240, 0.1)'
                      : 'rgba(29, 155, 240, 0.05)',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={600}>
                      Subscription Content
                    </Typography>
                    <Tooltip title="Publish this article encrypted for your subscription group members only">
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isEncrypted}
                        onChange={(e) =>
                          handleEncryptionToggle(e.target.checked)
                        }
                        color="primary"
                      />
                    }
                    label={isEncrypted ? 'Encrypted' : 'Public'}
                  />
                </Box>

                {/* Metadata Encryption Toggle - Only shown when content is encrypted */}
                {isEncrypted && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      p: 2,
                      backgroundColor: 'background.paper',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      mt: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          Also encrypt title, subtitle & cover image
                        </Typography>
                        <Tooltip title="By default, title, subtitle and cover image remain public for discovery. Enable this to encrypt everything.">
                          <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={encryptMetadata}
                            onChange={(e) =>
                              handleMetadataEncryptionToggle(e.target.checked)
                            }
                            color="primary"
                            size="small"
                          />
                        }
                        label=""
                        sx={{ m: 0 }}
                      />
                    </Box>
                    <Alert
                      severity={encryptMetadata ? 'warning' : 'info'}
                      sx={{ py: 0.5 }}
                    >
                      <Typography variant="caption">
                        {encryptMetadata
                          ? 'Article will be completely encrypted.'
                          : 'Title, subtitle and cover will be visible to everyone for discovery. Only content will be encrypted.'}
                      </Typography>
                    </Alert>
                  </Box>
                )}

                {isEncrypted && groupDetails && (
                  <Box sx={{ mt: 1.5 }}>
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        Only members of{' '}
                        <strong>{groupDetails.groupName}</strong> (
                        {groupDetails.memberCount || 0} subscribers) will be
                        able to read this article
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </Box>
            )}

            {/* Media File Upload - Required for episodes */}
            {type === 'episode' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Audio/Video File *
                </Typography>
                {mediaFile ? (
                  <MediaPreview>
                    <Box
                      sx={{
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
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
                        <Typography variant="h6" fontWeight={600}>
                          {mediaFile.type === 'video'
                            ? 'Video File'
                            : 'Audio File'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {mediaFile.name}
                        </Typography>
                        {mediaFile.type === 'video' &&
                          !isEncrypted &&
                          !videoMetadata && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setShowMetadataDialog(true)}
                              sx={{ mt: 1 }}
                            >
                              Add Metadata
                            </Button>
                          )}
                        {mediaFile.type === 'video' && isEncrypted && (
                          <Chip
                            label="Encrypted Video"
                            color="primary"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                        {videoMetadata && !isEncrypted && (
                          <Chip
                            label="Metadata Added"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                      <RemoveCoverButton
                        onClick={handleRemoveMediaFile}
                        size="small"
                      >
                        <CloseIcon />
                      </RemoveCoverButton>
                    </Box>
                  </MediaPreview>
                ) : (
                  <MediaUploadZone
                    elevation={0}
                    onClick={() => mediaInputRef.current?.click()}
                  >
                    <input
                      ref={mediaInputRef}
                      type="file"
                      accept="video/*,audio/*"
                      hidden
                      onChange={handleMediaFileUpload}
                    />
                    <UploadIcon
                      sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                    />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Upload Audio or Video
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click to browse or drag and drop your file here
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      Supported formats: MP3, WAV, MP4, MOV, AVI
                    </Typography>
                  </MediaUploadZone>
                )}
              </Box>
            )}

            {/* Cover Image Upload - Required for all types */}
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
                  onClick={() => coverImageInputRef.current?.click()}
                >
                  <input
                    id="cover-image-upload"
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleCoverImageUpload}
                  />
                  <UploadIcon
                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                  />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upload Cover Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click to browse or drag and drop your image here
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Recommended: 1920x1080px or 16:9 aspect ratio
                  </Typography>
                </CoverImageContainer>
              )}
            </Box>

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
                // Save to history on space or punctuation
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

                // Handle undo/redo
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

      {/* Preview */}
      {currentTab === 1 && (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <PreviewContainer>
            {title && <h1>{title}</h1>}
            {subtitle && <h2>{subtitle}</h2>}

            {/* Show video preview for new video uploads */}
            {mediaFile?.type === 'video' && mediaFile.file && (
              <VideoPreviewStyled controls>
                <source
                  src={URL.createObjectURL(mediaFile.file)}
                  type={mediaFile.file.type}
                />
              </VideoPreviewStyled>
            )}

            {content && (
              <div
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
                    .replace(/^- (.*$)/gim, '<li>$1</li>')
                    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
                    .replace(
                      /!\[(.*?)\]\((.*?)\)/g,
                      '<img src="$2" alt="$1" />'
                    )
                    .replace(/\n/g, '<br />'),
                }}
              />
            )}

            {!title && !subtitle && !content && (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="h6">Nothing to preview yet</Typography>
                <Typography variant="body2">
                  Start writing to see a preview of your post
                </Typography>
              </Box>
            )}
          </PreviewContainer>
        </Container>
      )}

      {/* Video Metadata Dialog */}
      <VideoMetadataDialog
        open={showMetadataDialog}
        onClose={handleCloseMetadataDialog}
        onSave={handleSaveMetadata}
        videoFile={mediaFile?.file || null}
        isEncrypted={isEncrypted}
      />
    </EditorContainer>
  );
};
