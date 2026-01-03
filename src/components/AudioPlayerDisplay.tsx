import {
  Box,
  Typography,
  IconButton,
  Slider,
  LinearProgress,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Repeat,
  Headphones,
} from '@mui/icons-material';
import { useCallback, useRef, useState } from 'react';
import {
  AudioPlayerControls,
  AudioPlayerHandle,
  QortalGetMetadata,
  useAudioPlayerHotkeys,
  useResourceStatus,
  Service,
} from 'qapp-core';

const AudioPlayerContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 900,
  margin: '0 auto',
  marginTop: '-32px',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 8px 32px rgba(0, 0, 0, 0.12)'
      : '0 8px 32px rgba(0, 0, 0, 0.5)',
  position: 'relative',
  zIndex: 3,
  backgroundColor: theme.palette.background.paper,
}));

const AudioContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: theme.spacing(3, 4),
  gap: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    padding: theme.spacing(3, 2),
  },
}));

const ControlsSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const PlaybackButtons = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const ProgressSection = styled(Box)({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
});

const TimeDisplay = styled(Typography)(({ theme }) => ({
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: theme.palette.text.secondary,
  minWidth: 45,
  textAlign: 'center',
}));

const VolumeSection = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 140,
});

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(4),
  width: '100%',
}));

const InitialStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(3, 4),
  width: '100%',
  gap: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    padding: theme.spacing(3, 2),
  },
}));

const AudioInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flex: 1,
});

const AudioDetails = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const LoadingText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 500,
  fontSize: '0.875rem',
}));

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

interface AudioPlayerDisplayProps {
  articleTitle: string;
  audioMetadata: {
    title: string;
    description?: string;
    audioReference: {
      name: string;
      identifier: string;
      service: string;
    };
    mimeType: string;
    filename: string;
    duration?: number;
  };
  encryptionKey?: string;
  encryptionIv?: string;
  mimeType?: string;
}

export function AudioPlayerDisplay({
  articleTitle,
  audioMetadata,
  encryptionKey,
  encryptionIv,
  mimeType,
}: AudioPlayerDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [resourceStatus, setResourceStatus] = useState<ReturnType<
    typeof useResourceStatus
  > | null>(null);
  const ref = useRef<AudioPlayerHandle | null>(null);
  const [progress, setProgress] = useState({ current: 0, duration: 0 });
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loopCurrentTrack, setLoopCurrentTrack] = useState(false);

  useAudioPlayerHotkeys(ref, hasStarted);

  const handleFirstPlay = () => {
    if (!hasStarted) {
      setHasStarted(true);
    }
  };

  const onProgress = useCallback((currentTime: number, duration: number) => {
    setProgress({ current: currentTime, duration });
  }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const onResourceStatus = useCallback(
    (resourceStatus: ReturnType<typeof useResourceStatus>) => {
      setResourceStatus(resourceStatus);
    },
    []
  );

  const onEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const onError = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      console.error('Audio playback error:', e);
    },
    []
  );

  const currentTrack: QortalGetMetadata = {
    name: audioMetadata.audioReference.name,
    identifier: audioMetadata.audioReference.identifier,
    service: audioMetadata.audioReference.service as Service,
  };

  return (
    <AudioPlayerContainer>
      {hasStarted && (
        <Box sx={{ display: 'none' }}>
          <AudioPlayerControls
            ref={ref}
            srcs={[currentTrack]}
            currentTrack={currentTrack}
            loopCurrentTrack={loopCurrentTrack}
            onProgress={onProgress}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onEnded}
            onError={onError}
            onResourceStatus={onResourceStatus}
            shuffle={false}
            retryAttempts={3}
            {...(encryptionKey &&
              encryptionIv && {
                encryption: {
                  encryptionType: 'streamed-v1',
                  iv: encryptionIv,
                  key: encryptionKey,
                  mimeType: mimeType || audioMetadata.mimeType || 'audio/mpeg',
                },
              })}
          />
        </Box>
      )}

      {!hasStarted || !resourceStatus?.isReady ? (
        !hasStarted ? (
          <InitialStateContainer>
            <AudioInfo>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: (theme) =>
                    theme.palette.mode === 'light'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, #4c5fd7 0%, #5a3a7e 100%)',
                  color: 'white',
                }}
              >
                <Headphones sx={{ fontSize: 24 }} />
              </Box>
              <AudioDetails>
                <Typography variant="body1" fontWeight={600}>
                  {articleTitle}
                </Typography>
                {audioMetadata.duration && (
                  <Chip
                    label={formatTime(audioMetadata.duration)}
                    size="small"
                    sx={{
                      height: 24,
                      fontWeight: 600,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                          ? 'rgba(102, 126, 234, 0.1)'
                          : 'rgba(76, 95, 215, 0.2)',
                      color: 'primary.main',
                    }}
                  />
                )}
              </AudioDetails>
            </AudioInfo>

            <IconButton
              onClick={handleFirstPlay}
              sx={{
                width: 56,
                height: 56,
                background: (theme) =>
                  theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #4c5fd7 0%, #5a3a7e 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <PlayArrow sx={{ fontSize: 28, ml: 0.5 }} />
            </IconButton>
          </InitialStateContainer>
        ) : (
          <LoadingContainer>
            <LoadingText>
              Loading audio... {resourceStatus?.percentLoaded ?? 0}%
            </LoadingText>
            <LinearProgress
              variant="determinate"
              value={resourceStatus?.percentLoaded ?? 0}
              sx={{
                width: '100%',
                maxWidth: 400,
                height: 6,
                borderRadius: 3,
              }}
            />
          </LoadingContainer>
        )
      ) : (
        <AudioContent>
          <PlaybackButtons>
            <IconButton
              onClick={() => ref.current?.[isPlaying ? 'pause' : 'play']()}
              sx={{
                width: 56,
                height: 56,
                background: (theme) =>
                  theme.palette.mode === 'light'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #4c5fd7 0%, #5a3a7e 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isPlaying ? (
                <Pause sx={{ fontSize: 28 }} />
              ) : (
                <PlayArrow sx={{ fontSize: 28, ml: 0.5 }} />
              )}
            </IconButton>

            <IconButton
              onClick={() => setLoopCurrentTrack((prev) => !prev)}
              size="small"
              sx={{
                color: loopCurrentTrack ? 'primary.main' : 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <Repeat fontSize="small" />
            </IconButton>
          </PlaybackButtons>

          <ControlsSection>
            <ProgressSection>
              <TimeDisplay>{formatTime(progress.current)}</TimeDisplay>
              <Slider
                value={(progress.current / progress.duration) * 100 || 0}
                onChange={(_, value) => {
                  const percent = value as number;
                  ref.current?.seekTo((percent / 100) * progress.duration);
                }}
                sx={{
                  flex: 1,
                  color: 'primary.main',
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(102, 126, 234, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 4,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    height: 4,
                    opacity: 0.3,
                  },
                }}
              />
              <TimeDisplay>{formatTime(progress.duration)}</TimeDisplay>
            </ProgressSection>
          </ControlsSection>

          <VolumeSection>
            <IconButton
              onClick={() => {
                const newMuted = !muted;
                setMuted(newMuted);
                ref.current?.setMuted(newMuted);
              }}
              size="small"
              sx={{
                color: muted ? 'text.secondary' : 'text.primary',
              }}
            >
              {muted ? (
                <VolumeOff fontSize="small" />
              ) : (
                <VolumeUp fontSize="small" />
              )}
            </IconButton>
            <Slider
              value={muted ? 0 : volume * 100}
              onChange={(_, val) => {
                const newVolume = (val as number) / 100;
                setVolume(newVolume);
                ref.current?.setVolume(newVolume);
                if (muted) {
                  setMuted(false);
                  ref.current?.setMuted(false);
                }
              }}
              sx={{
                flex: 1,
                color: 'primary.main',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                },
                '& .MuiSlider-track': {
                  height: 4,
                  border: 'none',
                },
                '& .MuiSlider-rail': {
                  height: 4,
                  opacity: 0.3,
                },
              }}
            />
          </VolumeSection>
        </AudioContent>
      )}
    </AudioPlayerContainer>
  );
}
