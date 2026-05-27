import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import { styled } from '@mui/system';
import { useState, useEffect, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { generateVideoExtracts, compressImage } from '../utils/videoUtils';
import { categories, subCategories } from '../constants/qtubeCategories';
import { VideoMetadata } from '../utils/articleQdn';
import qtubeLogoImg from '../assets/qtube.webp';
import { ensureImageDataUrl } from '../utils/imageDataUrl';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    maxWidth: '600px',
    width: '100%',
    borderRadius: theme.spacing(3),
    margin: theme.spacing(2),
    overflow: 'visible',
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 24px 48px rgba(0, 0, 0, 0.5)'
        : '0 24px 48px rgba(0, 0, 0, 0.15)',
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(2),
      maxWidth: 'calc(100vw - 32px)',
      width: 'calc(100vw - 32px)',
      borderRadius: theme.spacing(2),
    },
  },
  '& .MuiBackdrop-root': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(0, 0, 0, 0.7)'
        : 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2.5, 3),
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontWeight: 700,
  fontSize: '20px',
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(29, 155, 240, 0.1), rgba(120, 86, 255, 0.1))'
      : 'linear-gradient(135deg, rgba(29, 155, 240, 0.05), rgba(120, 86, 255, 0.05))',
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: `${theme.spacing(3)} !important`,
  gap: theme.spacing(2.5),
}));

// const VideoPreviewContainer = styled(Box)(({ theme }) => ({
//   width: '100%',
//   height: '300px',
//   borderRadius: theme.spacing(2),
//   overflow: 'hidden',
//   backgroundColor: theme.palette.background.default,
//   border: `2px solid ${theme.palette.divider}`,
//   boxShadow:
//     theme.palette.mode === 'dark'
//       ? '0 4px 12px rgba(0, 0, 0, 0.3)'
//       : '0 4px 12px rgba(0, 0, 0, 0.08)',
// }));

// const VideoPreview = styled('video')({
//   width: '100%',
//   height: '100%',
//   objectFit: 'contain',
// });

const ActionButton = styled('button')<{ variant?: 'primary' | 'secondary' }>(
  ({ theme, variant = 'secondary' }) => ({
    background:
      variant === 'primary'
        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
        : theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.04)',
    color: variant === 'primary' ? '#fff' : theme.palette.text.primary,
    border: 'none',
    borderRadius: '24px',
    padding: '10px 24px',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    boxShadow:
      variant === 'primary'
        ? theme.palette.mode === 'dark'
          ? '0 4px 12px rgba(29, 155, 240, 0.3)'
          : '0 4px 12px rgba(29, 155, 240, 0.25)'
        : 'none',
    '&:hover': {
      transform: 'translateY(-2px) scale(1.02)',
      boxShadow:
        variant === 'primary'
          ? theme.palette.mode === 'dark'
            ? '0 6px 20px rgba(29, 155, 240, 0.4)'
            : '0 6px 20px rgba(29, 155, 240, 0.35)'
          : theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(255, 255, 255, 0.1)'
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: 'translateY(0) scale(0.98)',
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    },
  })
);

const InfoText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '14px',
  fontStyle: 'italic',
}));

const ThumbnailSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const ThumbnailGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: theme.spacing(1),
}));

const ThumbnailOption = styled(Box)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    position: 'relative',
    paddingBottom: '75%', // 4:3 aspect ratio
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
    cursor: 'pointer',
    border: selected
      ? `3px solid ${theme.palette.primary.main}`
      : `2px solid ${theme.palette.divider}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)',
      borderColor: theme.palette.primary.main,
    },
  })
);

const ThumbnailImage = styled('img')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const CustomThumbnailOption = styled(Box)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    position: 'relative',
    paddingBottom: '75%',
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
    cursor: 'pointer',
    border: selected
      ? `3px solid ${theme.palette.primary.main}`
      : `2px dashed ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)',
      borderColor: theme.palette.primary.main,
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.04)',
    },
  })
);

const CustomThumbnailContent = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
});

const SelectedBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.5),
  right: theme.spacing(0.5),
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 700,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
}));

interface VideoMetadataDialogProps {
  open: boolean;
  onClose: (saved: boolean) => void;
  onSave: (metadata: VideoMetadata) => void;
  videoFile: File | null;
  isEncrypted?: boolean; // If true, only show cover image selection
}

export const VideoMetadataDialog = ({
  open,
  onClose,
  onSave,
  videoFile,
  isEncrypted = false,
}: VideoMetadataDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState<
    number | null
  >(0);
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens with new video
  useEffect(() => {
    if (open && videoFile) {
      // Set default title from filename
      const nameWithoutExt = videoFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
      setDescription('');
      setDuration(undefined);
      setExtractedFrames([]);
      setSelectedThumbnailIndex(0);
      setCustomThumbnail(null);
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setIsExtractingFrames(true);

      // Create video preview URL
      const previewUrl = URL.createObjectURL(videoFile);
      setVideoPreview(previewUrl);

      // Extract frames from video
      generateVideoExtracts(videoFile)
        .then(async (result) => {
          setDuration(Math.floor(result.duration));

          // QTube stores thumbnails as complete data URLs and renders them directly.
          const compressedFrames: string[] = [];
          for (const frame of result.extracts) {
            try {
              const compressed = await compressImage(frame);
              compressedFrames.push(ensureImageDataUrl(compressed) || '');
            } catch (err) {
              console.error('Failed to compress frame:', err);
              compressedFrames.push(ensureImageDataUrl(frame) || '');
            }
          }

          setExtractedFrames(compressedFrames);
          setIsExtractingFrames(false);
        })
        .catch((error) => {
          console.error('Error extracting frames:', error);
          setIsExtractingFrames(false);
        });
    }

    // Cleanup
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [open, videoFile]);

  const handleCustomThumbnailSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const compressed = await compressImage(dataUrl);
        setCustomThumbnail(ensureImageDataUrl(compressed) || null);
        setSelectedThumbnailIndex(-1);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing custom thumbnail:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const categoryId = event.target.value;
    const category = categories.find((cat) => cat.id === +categoryId);
    setSelectedCategory(category || null);
    setSelectedSubCategory(null); // Reset subcategory when category changes
  };

  const handleSubCategoryChange = (event: SelectChangeEvent) => {
    const subcategoryId = event.target.value;
    if (selectedCategory && subCategories[selectedCategory.id]) {
      const subcategory = subCategories[selectedCategory.id].find(
        (subcat) => subcat.id === +subcategoryId
      );
      setSelectedSubCategory(subcategory || null);
    }
  };

  const handleConfirm = () => {
    // For encrypted videos, only videoImage is required
    // For non-encrypted videos, title and category are required
    if (!isEncrypted && (!title.trim() || !selectedCategory)) {
      return;
    }

    // Determine which image to use as videoImage
    let videoImage: string | undefined;
    if (selectedThumbnailIndex === -1 && customThumbnail) {
      videoImage = customThumbnail;
    } else if (
      selectedThumbnailIndex !== null &&
      selectedThumbnailIndex >= 0 &&
      extractedFrames[selectedThumbnailIndex]
    ) {
      videoImage = extractedFrames[selectedThumbnailIndex];
    }

    // For encrypted videos, auto-generate minimal metadata
    if (isEncrypted) {
      const nameWithoutExt = videoFile?.name.replace(/\.[^/.]+$/, '') || '';
      onSave({
        title: nameWithoutExt,
        description: '',
        duration,
        videoImage,
        extracts: extractedFrames,
        category: 1, // Default category
        subcategory: undefined,
      });
    } else {
      // For non-encrypted videos, use full metadata
      onSave({
        title: title.trim(),
        description: description.trim(),
        duration,
        videoImage,
        extracts: extractedFrames,
        category: selectedCategory.id,
        subcategory: selectedSubCategory?.id,
      });
    }

    // Reset form state
    setTitle('');
    setDescription('');
    setDuration(undefined);
    setExtractedFrames([]);
    setSelectedThumbnailIndex(0);
    setCustomThumbnail(null);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview('');
    }

    // Close dialog with saved=true
    onClose(true);
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDuration(undefined);
    setExtractedFrames([]);
    setSelectedThumbnailIndex(0);
    setCustomThumbnail(null);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview('');
    }
    // Close dialog with saved=false (cancelled)
    onClose(false);
  };

  const isFormValid = isEncrypted
    ? true
    : title.trim().length > 0 && selectedCategory !== null;
  const hasAnyThumbnail =
    (!!customThumbnail && customThumbnail.length > 0) ||
    extractedFrames.length > 0;
  const canConfirm = isFormValid && !isExtractingFrames && hasAnyThumbnail;

  // Determine the current poster image for the video preview
  // const videoPoster = (() => {
  //   if (selectedThumbnailIndex === -1 && customThumbnail) {
  //     return `data:image/webp;base64,${customThumbnail}`;
  //   } else if (
  //     selectedThumbnailIndex !== null &&
  //     selectedThumbnailIndex >= 0 &&
  //     extractedFrames[selectedThumbnailIndex]
  //   ) {
  //     return `data:image/webp;base64,${extractedFrames[selectedThumbnailIndex]}`;
  //   }
  //   return undefined;
  // })();

  return (
    <StyledDialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <StyledDialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {!isEncrypted && (
            <Box
              component="img"
              src={qtubeLogoImg}
              alt="Q-Tube"
              sx={{
                height: 32,
                width: 32,
                objectFit: 'contain',
              }}
            />
          )}
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {isEncrypted ? 'Video Cover Image' : 'Q-Tube video data'}
          </Typography>
        </Box>
      </StyledDialogTitle>
      <StyledDialogContent>
        {/* Video preview hidden as per user request */}
        {/* {videoPreview && (
          <VideoPreviewContainer>
            <VideoPreview src={videoPreview} poster={videoPoster} controls />
          </VideoPreviewContainer>
        )} */}

        {/* Only show title, description, and category fields for non-encrypted videos */}
        {!isEncrypted && (
          <>
            <Box>
              <TextField
                label="Video Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                placeholder="Enter a title for your video"
                variant="outlined"
                inputProps={{ maxLength: 100 }}
                helperText={`${title.length}/100 characters`}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <TextField
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder="Describe your video content"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                  },
                }}
              />
            </Box>

            <FormControl fullWidth required>
              <InputLabel id="video-category-label">Category *</InputLabel>
              <Select
                labelId="video-category-label"
                value={selectedCategory?.id?.toString() || ''}
                onChange={handleCategoryChange}
                required
                input={<OutlinedInput label="Category *" />}
                sx={{
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '2px',
                  },
                }}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedCategory && subCategories[selectedCategory.id] && (
              <FormControl fullWidth>
                <InputLabel id="video-subcategory-label">
                  Subcategory
                </InputLabel>
                <Select
                  labelId="video-subcategory-label"
                  value={selectedSubCategory?.id?.toString() || ''}
                  onChange={handleSubCategoryChange}
                  input={<OutlinedInput label="Subcategory" />}
                  sx={{
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                  }}
                >
                  {subCategories[selectedCategory.id].map((subcategory) => (
                    <MenuItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {duration && (
              <InfoText>
                Duration: {Math.floor(duration / 60)}:
                {(duration % 60).toString().padStart(2, '0')}
              </InfoText>
            )}
          </>
        )}

        <ThumbnailSection>
          <Typography variant="subtitle2" fontWeight={600}>
            Select Thumbnail
          </Typography>

          {isExtractingFrames ? (
            <InfoText>Extracting frames from video...</InfoText>
          ) : (
            <ThumbnailGrid>
              {extractedFrames.map((frame, index) => (
                <ThumbnailOption
                  key={index}
                  selected={selectedThumbnailIndex === index}
                  onClick={() => setSelectedThumbnailIndex(index)}
                >
                  <ThumbnailImage
                    src={ensureImageDataUrl(frame)}
                    alt={`Frame ${index + 1}`}
                  />
                  {selectedThumbnailIndex === index && (
                    <SelectedBadge>✓</SelectedBadge>
                  )}
                </ThumbnailOption>
              ))}

              <CustomThumbnailOption
                selected={selectedThumbnailIndex === -1}
                onClick={() => fileInputRef.current?.click()}
              >
                {customThumbnail ? (
                  <>
                    <ThumbnailImage
                      src={ensureImageDataUrl(customThumbnail)}
                      alt="Custom thumbnail"
                    />
                    {selectedThumbnailIndex === -1 && (
                      <SelectedBadge>✓</SelectedBadge>
                    )}
                  </>
                ) : (
                  <CustomThumbnailContent>
                    <AddPhotoAlternateIcon
                      sx={{ fontSize: 32, opacity: 0.5 }}
                    />
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Custom
                    </Typography>
                  </CustomThumbnailContent>
                )}
              </CustomThumbnailOption>
            </ThumbnailGrid>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleCustomThumbnailSelect}
          />
        </ThumbnailSection>
      </StyledDialogContent>

      <DialogActions
        sx={{
          padding: 3,
          paddingTop: 0,
          gap: 2,
          flexWrap: 'wrap',
          '& button': {
            minWidth: 'auto',
            whiteSpace: 'nowrap',
          },
          '@media (max-width: 600px)': {
            padding: 2,
            gap: 1.5,
            '& button': {
              flex: 1,
              minWidth: '100px',
              fontSize: '14px',
              padding: '8px 16px',
            },
          },
        }}
      >
        {isExtractingFrames && (
          <InfoText sx={{ mr: 'auto' }}>Generating thumbnails…</InfoText>
        )}
        <ActionButton variant="secondary" onClick={handleCancel}>
          <CloseIcon fontSize="small" />
          Cancel
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          <CheckIcon fontSize="small" />
          Add Video
        </ActionButton>
      </DialogActions>
    </StyledDialog>
  );
};
