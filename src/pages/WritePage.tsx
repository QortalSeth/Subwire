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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
import { useDropzone } from 'react-dropzone';
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
import {
  buildQuitterArticleShareText,
  publishQuitterPost,
} from '../utils/quitterQdn';
import quitterLogo from '../assets/quitter.webp';
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
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5, 2),
  },
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
  flexWrap: 'nowrap',
  borderRadius: 10,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  zIndex: 1000,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 4px 20px rgba(0, 0, 0, 0.15)'
      : '0 4px 20px rgba(0, 0, 0, 0.6)',
  maxWidth: 'calc(100vw - 32px)',
  [theme.breakpoints.down('sm')]: {
    bottom: theme.spacing(2),
    padding: theme.spacing(0.75, 1),
    gap: theme.spacing(0.25),
    maxWidth: 'calc(100vw - 16px)',
    overflowX: 'auto',
    overflowY: 'hidden',
    '&::-webkit-scrollbar': {
      height: 4,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: 2,
    },
  },
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
  [theme.breakpoints.down('sm')]: {
    '& .MuiInputBase-root': {
      fontSize: '1.75rem',
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
  [theme.breakpoints.down('sm')]: {
    '& .MuiInputBase-root': {
      fontSize: '1.1rem',
    },
  },
}));

const ContentField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    fontSize: '1.125rem',
    lineHeight: 1.8,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  [theme.breakpoints.down('sm')]: {
    '& .MuiInputBase-root': {
      fontSize: '1rem',
    },
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
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
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
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4),
    marginBottom: theme.spacing(2),
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
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 0),
    '& h1': {
      fontSize: '1.75rem',
    },
    '& h2': {
      fontSize: '1.1rem',
    },
    '& p': {
      fontSize: '1rem',
    },
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
  [theme.breakpoints.down('sm')]: {
    margin: theme.spacing(0, 0.5),
    height: 20,
  },
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

  // Quitter share dialog (post-publish)
  const [quitterDialogOpen, setQuitterDialogOpen] = useState(false);
  const [quitterPostText, setQuitterPostText] = useState('');
  const [isPostingToQuitter, setIsPostingToQuitter] = useState(false);
  const [publishedLocation, setPublishedLocation] = useState<{
    authorName: string;
    identifier: string;
  } | null>(null);

  // Publish options dialog (shown before publishing when user has a subscription group)
  const [publishOptionsOpen, setPublishOptionsOpen] = useState(false);

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

  // Track previous values to prevent infinite re-renders
  const prevEncryptionPreferencesRef = useRef<string>('');
  const prevEncryptMetadataPreferencesRef = useRef<string>('');

  // Load saved preference when component mounts or preferences/user changes
  useEffect(() => {
    const currentPreferencesString = JSON.stringify(encryptionPreferences);
    if (currentPreferencesString === prevEncryptionPreferencesRef.current) {
      return;
    }
    prevEncryptionPreferencesRef.current = currentPreferencesString;

    if (hasSubscriptionGroup && userEncryptionKey) {
      const savedPref = encryptionPreferences[userEncryptionKey];
      // Load saved preference or default to false

      setIsEncrypted(savedPref === true);
    } else {
      // Reset to false if no subscription group
      setIsEncrypted(false);
    }
  }, [hasSubscriptionGroup, userEncryptionKey, encryptionPreferences]);

  // Load saved metadata encryption preference
  useEffect(() => {
    const currentMetadataPreferencesString = JSON.stringify(encryptMetadataPreferences);
    if (currentMetadataPreferencesString === prevEncryptMetadataPreferencesRef.current) {
      return;
    }
    prevEncryptMetadataPreferencesRef.current = currentMetadataPreferencesString;

    if (hasSubscriptionGroup && userEncryptionKey && isEncrypted) {
      const savedMetadataPref = encryptMetadataPreferences[userEncryptionKey];
      // Load saved preference or default to false (keep metadata public)
      setEncryptMetadata(savedMetadataPref === true);
    } else {
      // Reset to false if no subscription or not encrypted
      setEncryptMetadata(false);
    }
  }, [
    hasSubscriptionGroup,
    userEncryptionKey,
    isEncrypted,
    encryptMetadataPreferences,
  ]);

  // Save preference to storage when toggle changes (but only if user made the change)
  const handleEncryptionToggle = (checked: boolean) => {
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

  const validatePublish = (): boolean => {
    if (!title.trim()) {
      showError('Please enter a title for your article');
      return false;
    }

    if (!content.trim()) {
      showError('Please add content to your article');
      return false;
    }

    if (!coverImage) {
      showError('Please upload a cover image');
      return false;
    }

    if (type === 'episode' && !mediaFile) {
      showError('Please upload an audio or video file for your episode');
      return false;
    }

    // Video metadata is only required for PUBLIC videos, not encrypted ones
    if (
      type === 'episode' &&
      mediaFile?.type === 'video' &&
      !isEncrypted &&
      !videoMetadata
    ) {
      showError('Please add metadata for your video');
      return false;
    }

    if (!auth?.name) {
      showError('Please authenticate with a Qortal name to publish');
      return false;
    }

    if (!identifierOperations) {
      showError('Authentication required');
      return false;
    }

    return true;
  };

  const handlePublish = () => {
    if (!validatePublish()) return;

    if (hasSubscriptionGroup) {
      setPublishOptionsOpen(true);
    } else {
      handleConfirmPublish();
    }
  };

  const handleConfirmPublish = async () => {
    setPublishOptionsOpen(false);

    if (!auth?.name || !identifierOperations) return;

    let loadingId: string | undefined;

    try {
      setIsPublishing(true);
      loadingId = showLoading('Publishing to Qortal blockchain...');

      // Prepare media attachments for episodes
      let media: MediaAttachment[] | undefined;
      if (type === 'episode' && mediaFile) {
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
        }
      }

      dismissToast(loadingId);

      showSuccess('Article published successfully!');
      const authorName = auth.name!;

      // Open Quitter share dialog with a pre-filled post (user can edit).
      setPublishedLocation({ authorName, identifier });
      setQuitterPostText(
        buildQuitterArticleShareText({
          title,
          authorName,
          identifier,
        })
      );
      setQuitterDialogOpen(true);
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

  const navigateToPublishedArticle = () => {
    if (!publishedLocation) return;
    navigate(
      `/publication/${publishedLocation.authorName}/${publishedLocation.identifier}`
    );
  };

  const handleViewPublishedArticle = () => {
    setQuitterDialogOpen(false);
    navigateToPublishedArticle();
  };

  const handlePostToQuitter = async () => {
    if (!auth?.name) {
      showError('Please authenticate with a Qortal name to post to Quitter');
      return;
    }
    if (!identifierOperations) {
      showError('Authentication required');
      return;
    }

    let loadId: string | undefined;
    try {
      setIsPostingToQuitter(true);
      loadId = showLoading('Posting to Quitter...');
      await publishQuitterPost({
        text: quitterPostText,
        coverImage: coverImage || undefined,
        identifierOperations,
        userName: auth.name,
        publishMultipleResources,
      });
      showSuccess('Posted to Quitter!');
      setQuitterDialogOpen(false);
      navigateToPublishedArticle();
    } catch (error) {
      console.error('Error posting to Quitter:', error);
      showError(
        error instanceof Error
          ? error.message
          : 'Failed to post to Quitter. Please try again.'
      );
    } finally {
      if (loadId) dismissToast(loadId);
      setIsPostingToQuitter(false);
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
        : selectedText.split('\n').map((line) => '> ' + line).join('\n');
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

  const handleCoverImageDrop = (files: File[]) => {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(file);
      const imageUrl = URL.createObjectURL(file);
      setCoverImagePreview(imageUrl);
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

    if (file) {
      await processMediaFile(file);
      event.target.value = '';
    }
  };

  const processMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

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
          return;
        }
      }

      setMediaFile({
        file,
        name: file.name,
        type: isVideo ? 'video' : 'audio',
      });

      // Open metadata dialog for all video files (encrypted and non-encrypted)
      if (isVideo) {
        setShowMetadataDialog(true);
      }
    }
  };

  const handleMediaFileDrop = async (files: File[]) => {
    const file = files[0];
    if (file) {
      await processMediaFile(file);
    }
  };

  const handleRemoveMediaFile = () => {
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

  // Dropzone for cover image
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

  // Dropzone for media files
  const {
    getRootProps: getMediaRootProps,
    getInputProps: getMediaInputProps,
    isDragActive: isMediaDragActive,
  } = useDropzone({
    onDrop: handleMediaFileDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
    },
    multiple: false,
    noClick: false,
  });

  return (
    <EditorContainer>
      {/* Authentication Warning */}
      {!auth?.name && (
        <Alert
          severity="warning"
          sx={{
            m: { xs: 1.5, sm: 2 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
          }}
        >
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
          position: { xs: 'relative', sm: 'sticky' },
          top: { xs: 0, sm: 64 },
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
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 0 },
              py: { xs: 1, sm: 0 },
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
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                width: { xs: '100%', sm: 'auto' },
                px: { xs: 2, sm: 0 },
              }}
            >
              <PublishButton
                variant="outlined"
                startIcon={
                  isSavingDraft ? <CircularProgress size={20} /> : <SaveIcon />
                }
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !auth?.name}
                sx={{
                  my: 1,
                  flex: { xs: 1, sm: 'none' },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  px: { xs: 1.5, sm: 3 },
                }}
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
                sx={{
                  my: 1,
                  flex: { xs: 1, sm: 'none' },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  px: { xs: 1.5, sm: 3 },
                }}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </PublishButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Editor Content */}
      {currentTab === 0 && (
        <Container
          maxWidth="lg"
          sx={{
            py: { xs: 2, sm: 4 },
            pb: { xs: 10, sm: 12 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Toolbar */}
            <EditorToolbar elevation={0}>
              <IconButton
                size="small"
                title="Undo (Ctrl+Z)"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <Undo sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <IconButton
                size="small"
                title="Redo (Ctrl+Y)"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <Redo sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Bold"
                onClick={handleBold}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatBold sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <IconButton
                size="small"
                title="Italic"
                onClick={handleItalic}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatItalic sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <IconButton
                size="small"
                title="Underline"
                onClick={handleUnderline}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatUnderlined sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Bullet List"
                onClick={handleBulletList}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatListBulleted sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <IconButton
                size="small"
                title="Numbered List"
                onClick={handleNumberedList}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatListNumbered sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Quote"
                onClick={handleQuote}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <FormatQuote sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <IconButton
                size="small"
                title="Code"
                onClick={handleCode}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <Code sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>

              <ToolbarDivider />

              <IconButton
                size="small"
                title="Insert Image"
                onClick={handleImageClick}
                sx={{ p: { xs: 0.25, sm: 1 } }}
              >
                <ImageIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
            </EditorToolbar>


            {/* Media File Upload - Required for episodes */}
            {type === 'episode' && (
              <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  fontWeight={600}
                  sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
                >
                  Audio/Video File *
                </Typography>
                {mediaFile ? (
                  <MediaPreview>
                    <Box
                      sx={{
                        p: { xs: 2, sm: 3 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {mediaFile.type === 'video' ? (
                        <VideocamIcon
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'primary.main',
                          }}
                        />
                      ) : (
                        <AudioFileIcon
                          sx={{
                            fontSize: { xs: 32, sm: 40 },
                            color: 'primary.main',
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          fontWeight={600}
                          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                        >
                          {mediaFile.type === 'video'
                            ? 'Video File'
                            : 'Audio File'}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            wordBreak: 'break-word',
                          }}
                        >
                          {mediaFile.name}
                        </Typography>
                        {mediaFile.type === 'video' &&
                          !isEncrypted &&
                          !videoMetadata && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setShowMetadataDialog(true)}
                              sx={{
                                mt: 1,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              }}
                            >
                              Add Metadata
                            </Button>
                          )}
                        {mediaFile.type === 'video' && isEncrypted && (
                          <Chip
                            label="Encrypted Video"
                            color="primary"
                            size="small"
                            sx={{
                              mt: 1,
                              fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            }}
                          />
                        )}
                        {videoMetadata && !isEncrypted && (
                          <Chip
                            label="Metadata Added"
                            color="success"
                            size="small"
                            sx={{
                              mt: 1,
                              fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            }}
                          />
                        )}
                      </Box>
                      <RemoveCoverButton
                        onClick={handleRemoveMediaFile}
                        size="small"
                      >
                        <CloseIcon fontSize="small" />
                      </RemoveCoverButton>
                    </Box>
                  </MediaPreview>
                ) : (
                  <MediaUploadZone
                    elevation={0}
                    {...getMediaRootProps()}
                    sx={{
                      borderColor: isMediaDragActive
                        ? 'primary.main'
                        : undefined,
                      backgroundColor: isMediaDragActive
                        ? 'action.hover'
                        : undefined,
                    }}
                  >
                    <input
                      ref={mediaInputRef}
                      {...getMediaInputProps()}
                      onChange={handleMediaFileUpload}
                    />
                    <UploadIcon
                      sx={{
                        fontSize: { xs: 40, sm: 48 },
                        color: 'primary.main',
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      gutterBottom
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      Upload Audio or Video
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      {isMediaDragActive
                        ? 'Drop your file here...'
                        : 'Click to browse or drag and drop your file here'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        display: 'block',
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      }}
                    >
                      Supported formats: MP3, WAV, MP4, MOV, AVI
                    </Typography>
                  </MediaUploadZone>
                )}
              </Box>
            )}

            {/* Cover Image Upload - Required for all types */}
            <Box sx={{ mb: { xs: 2, sm: 3 } }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                fontWeight={600}
                sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}
              >
                Cover Image *
              </Typography>
              {coverImagePreview ? (
                <CoverImagePreview>
                  <img src={coverImagePreview} alt="Cover" />
                  <RemoveCoverButton
                    onClick={handleRemoveCoverImage}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
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
                    id="cover-image-upload"
                    ref={coverImageInputRef}
                    {...getCoverImageInputProps()}
                    onChange={handleCoverImageUpload}
                  />
                  <UploadIcon
                    sx={{
                      fontSize: { xs: 40, sm: 48 },
                      color: 'primary.main',
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    gutterBottom
                    sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                  >
                    Upload Cover Image
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    {isCoverImageDragActive
                      ? 'Drop your image here...'
                      : 'Click to browse or drag and drop your image here'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      display: 'block',
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    }}
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
                        __html: marked.parse(content, {
                          breaks: true,
                          gfm: true,
                        }),
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
                        Start writing to see a preview of your post
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
        videoFile={mediaFile?.file || null}
        isEncrypted={isEncrypted}
      />

      {/* Publish options dialog - shown before publishing when user has a subscription group */}
      <Dialog
        open={publishOptionsOpen}
        onClose={() => setPublishOptionsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <LockIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Publishing Options
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Choose how you'd like to publish this article.
          </DialogContentText>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Public / Encrypted toggle */}
            <Box
              sx={{
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
                      onChange={(e) => handleEncryptionToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={isEncrypted ? 'Encrypted' : 'Public'}
                />
              </Box>

              {/* Metadata encryption sub-toggle */}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                  <Alert severity={encryptMetadata ? 'warning' : 'info'} sx={{ py: 0.5 }}>
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
                      {groupDetails.memberCount || 0} subscribers) will be able
                      to read this article
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPublishOptionsOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            startIcon={<Publish />}
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quitter share dialog (after successful publish) */}
      <Dialog
        open={quitterDialogOpen}
        onClose={handleViewPublishedArticle}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              component="img"
              src={quitterLogo}
              alt="Quitter"
              sx={{ width: 28, height: 28, borderRadius: 0.75 }}
            />
            <Typography variant="h6" fontWeight={700}>
              Share on Quitter?
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Want to announce your new publication on Quitter? You can edit the
            text before posting.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={quitterPostText}
            onChange={(e) => setQuitterPostText(e.target.value)}
            placeholder="Write your Quitter post..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleViewPublishedArticle}>View article</Button>
          <Button
            onClick={handlePostToQuitter}
            variant="contained"
            disabled={isPostingToQuitter}
          >
            {isPostingToQuitter ? 'Posting...' : 'Post to Quitter'}
          </Button>
        </DialogActions>
      </Dialog>
    </EditorContainer>
  );
};
