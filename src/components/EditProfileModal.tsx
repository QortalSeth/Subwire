import { useState, useRef, useEffect, useMemo } from 'react';
import { styled } from '@mui/system';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/CloudUpload';
import GroupIcon from '@mui/icons-material/Group';
import LockIcon from '@mui/icons-material/Lock';
import { useAtom, useAtomValue } from 'jotai';
import {
  useGlobal,
  objectToBase64,
  usePublish,
  type Service,
  showError,
  showSuccess,
  useQortBalance,
} from 'qapp-core';
import {
  hasProfileAtom,
  profileDataAtom,
  profileNameAtom,
  ownedGroupsAtom,
  isLoadingOwnedGroupsAtom,
} from '../state/global/profile';
import { saveProfileToCache } from '../utils/profileCache';
import { compressCoverImage } from '../utils/videoUtils';

interface Profile {
  bio: string;
  coverImage?: string;
  groupId?: number;
  [key: string]: any; // Allow other profile fields to be preserved
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    maxWidth: '600px',
    width: '100%',
    margin: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(2),
      maxWidth: 'calc(100vw - 32px)',
      width: 'calc(100vw - 32px)',
      borderRadius: theme.spacing(1.5),
    },
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const CoverImageContainer = styled(Paper)(({ theme }) => ({
  cursor: 'pointer',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  backgroundColor:
    theme.palette.mode === 'light'
      ? 'rgba(0, 0, 0, 0.02)'
      : 'rgba(255, 255, 255, 0.02)',
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'light'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.05)',
    borderColor: theme.palette.primary.main,
  },
}));

const CoverImagePreview = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '200px',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
}));

const RemoveCoverButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
}));

const GroupCard = styled(Card)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: selected
      ? `2px solid ${theme.palette.primary.main}`
      : `1px solid ${theme.palette.divider}`,
    backgroundColor: selected
      ? theme.palette.mode === 'dark'
        ? 'rgba(29, 155, 240, 0.15)'
        : 'rgba(29, 155, 240, 0.08)'
      : 'transparent',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow:
        theme.palette.mode === 'dark'
          ? '0 4px 12px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
      borderColor: theme.palette.primary.main,
    },
  })
);

const GroupCardContent = styled(CardContent)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  '&:last-child': {
    paddingBottom: theme.spacing(2),
  },
}));

const GroupIconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(29, 155, 240, 0.2)'
      : 'rgba(29, 155, 240, 0.1)',
  color: theme.palette.primary.main,
}));

const GroupInfo = styled('div')({
  flex: 1,
  minWidth: 0,
});

const InfoCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  background:
    theme.palette.mode === 'dark'
      ? 'rgba(29, 155, 240, 0.1)'
      : 'rgba(29, 155, 240, 0.05)',
  border: `1px solid ${theme.palette.primary.main}20`,
}));

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentProfile?: Profile | null;
}

export function EditProfileModal({
  open,
  onClose,
  currentProfile,
}: EditProfileModalProps) {
  const { auth, identifierOperations } = useGlobal();
  const { updatePublish, publishMultipleResources } = usePublish();
  const { value: balance } = useQortBalance();
  const [, setHasProfile] = useAtom(hasProfileAtom);
  const [profileData, setProfileData] = useAtom(profileDataAtom);
  const [, setProfileName] = useAtom(profileNameAtom);
  const groups = useAtomValue(ownedGroupsAtom);
  const isLoadingGroups = useAtomValue(isLoadingOwnedGroupsAtom);

  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [bioError, setBioError] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(
    currentProfile?.coverImage || null
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    currentProfile?.groupId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Filter to only show private groups
  const privateGroups = useMemo(() => {
    return groups.filter((group) => !group.isOpen);
  }, [groups]);

  // Reset form when modal opens with new profile data
  useEffect(() => {
    if (open) {
      setBio(currentProfile?.bio || '');
      setCoverImage(currentProfile?.coverImage || null);
      setSelectedGroupId(currentProfile?.groupId || null);
      setBioError('');
    }
  }, [open, currentProfile]);

  const handleBioChange = (value: string) => {
    // Enforce 200 character limit
    if (value.length <= 200) {
      setBio(value);
    }
    // Clear error when user starts typing
    if (bioError) {
      setBioError('');
    }
  };

  const handleCoverImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      showError('Image file size must be less than 10MB');
      return;
    }

    try {
      setIsCompressing(true);
      // Compress the cover image
      const compressedBase64 = await compressCoverImage(file);
      setCoverImage(compressedBase64);
    } catch (error) {
      console.error('Error compressing cover image:', error);
      showError('Failed to process cover image. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImage(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    if (!bio.trim()) {
      setBioError('Bio is required');
      return false;
    }

    if (bio.length > 200) {
      setBioError('Bio must be 200 characters or less');
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    // Check balance before publishing
    if (!balance || balance < 0.01) {
      showError(
        'Insufficient balance. You need at least 0.01 QORT to publish a profile.'
      );
      return;
    }

    if (!auth.name) {
      showError('Cannot save profile without a Qortal name');
      return;
    }

    setIsLoading(true);

    try {
      // Create profile object, preserving ALL existing data except bio, coverImage, and groupId
      const newProfileData: Profile = {
        ...profileData, // Preserve all existing profile data
        bio, // Update bio
        coverImage: coverImage || undefined, // Update cover image (or remove if null)
        groupId: selectedGroupId || undefined, // Update group (or remove if null)
      };

      // Publish profile to blockchain
      await saveProfile(newProfileData);

      // Save to cache for immediate display
      await saveProfileToCache(auth.name, newProfileData);

      // Update global state
      setProfileData(newProfileData);
      setHasProfile(true);
      setProfileName(auth.name);

      showSuccess('Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      showError(
        error instanceof Error
          ? `Failed to save profile: ${error.message}`
          : 'Failed to save profile. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (profileData: Profile) => {
    if (!auth.name) {
      throw new Error('Cannot save profile without a Qortal name');
    }

    const id = await identifierOperations.createSingleIdentifier('profile');
    if (!id) throw new Error('Failed to create identifier');

    const profileBase64 = await objectToBase64(profileData);

    const resourcesToPublish: {
      service: Service;
      identifier: string;
      name: string;
      base64: string;
    }[] = [];

    resourcesToPublish.push({
      service: 'METADATA',
      identifier: id,
      name: auth.name,
      base64: profileBase64,
    });

    await publishMultipleResources(resourcesToPublish);

    updatePublish(
      {
        name: auth.name,
        service: 'DOCUMENT',
        identifier: id,
      },
      profileData
    );
  };

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <StyledDialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {currentProfile ? 'Edit Profile' : 'Create Profile'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </StyledDialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add a bio, cover image, and optional subscription group to personalize
          your profile
        </Typography>

        {/* Cover Image Upload */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Cover Image
          </Typography>
          {coverImage ? (
            <CoverImagePreview>
              <img src={coverImage} alt="Cover" />
              <RemoveCoverButton
                onClick={handleRemoveCoverImage}
                size="small"
                disabled={isLoading}
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
                disabled={isLoading || isCompressing}
              />
              {isCompressing ? (
                <>
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Compressing image...
                  </Typography>
                </>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="body1" fontWeight={600} gutterBottom>
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
                    Recommended: 1920x500px or wide aspect ratio
                  </Typography>
                </>
              )}
            </CoverImageContainer>
          )}
        </Box>

        {/* Bio Section */}
        <StyledTextField
          fullWidth
          label="Bio"
          variant="outlined"
          multiline
          rows={4}
          value={bio}
          onChange={(e) => handleBioChange(e.target.value)}
          error={!!bioError}
          helperText={
            <span
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span>{bioError || ''}</span>
              <Typography
                component="span"
                variant="caption"
                color={bio.length > 200 ? 'error' : 'text.secondary'}
                sx={{ ml: 'auto' }}
              >
                {bio.length}/200
              </Typography>
            </span>
          }
          placeholder="Tell us about yourself..."
          required
          inputProps={{ maxLength: 200 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* Subscription Group Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Subscription Group (Optional)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Attach a private group you own to enable subscription content
          </Typography>

          {/* Info Card about subscriptions */}
          <InfoCard sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight={600}>
                  How Subscriptions Work
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                When you attach a private group to your profile, you can create
                encrypted articles that only members of that group can read. This
                allows you to share exclusive content with your subscribers.
              </Typography>
            </CardContent>
          </InfoCard>

          {isLoadingGroups ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 3,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : privateGroups.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'light'
                    ? 'rgba(0, 0, 0, 0.02)'
                    : 'rgba(255, 255, 255, 0.02)',
                border: (theme) => `1px dashed ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                You don't own any private groups yet. Create a private group first
                to enable subscription content.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Option to clear selection */}
              <GroupCard
                selected={selectedGroupId === null}
                onClick={() => setSelectedGroupId(null)}
              >
                <GroupCardContent>
                  <GroupIconContainer>
                    <CloseIcon />
                  </GroupIconContainer>
                  <GroupInfo>
                    <Typography variant="body2" fontWeight={600}>
                      No Subscription Group
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Don't attach any group (public content only)
                    </Typography>
                  </GroupInfo>
                  {selectedGroupId === null && (
                    <Chip
                      label="Selected"
                      size="small"
                      color="primary"
                      sx={{ height: '20px', fontSize: '11px' }}
                    />
                  )}
                </GroupCardContent>
              </GroupCard>

              {/* List of owned groups */}
              {privateGroups.map((group) => (
                <GroupCard
                  key={group.groupId}
                  selected={selectedGroupId === group.groupId}
                  onClick={() => setSelectedGroupId(group.groupId)}
                >
                  <GroupCardContent>
                    <GroupIconContainer>
                      <GroupIcon />
                    </GroupIconContainer>
                    <GroupInfo>
                      <Typography variant="body2" fontWeight={600}>
                        {group.groupName || `Group ${group.groupId}`}
                      </Typography>
                      {group.description && (
                        <Typography variant="caption" color="text.secondary">
                          {group.description}
                        </Typography>
                      )}
                    </GroupInfo>
                    {selectedGroupId === group.groupId && (
                      <Chip
                        label="Selected"
                        size="small"
                        color="primary"
                        sx={{ height: '20px', fontSize: '11px' }}
                      />
                    )}
                  </GroupCardContent>
                </GroupCard>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} disabled={isLoading || isCompressing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSaveProfile}
          disabled={isLoading || isCompressing}
          startIcon={
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : undefined
          }
        >
          {isLoading ? 'Saving...' : 'Save Profile'}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}

