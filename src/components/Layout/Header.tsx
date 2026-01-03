import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  Avatar,
  InputBase,
  Tooltip,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Check as CheckIcon,
  Star as StarIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';
import { useGlobal, showError, showSuccess, useAuth } from 'qapp-core';
import { useAtom, useSetAtom } from 'jotai';
import { preferredNamesMapAtom } from '../../state/global/profile';
import {
  userNamesAtom,
  isLoadingUserNamesAtom,
} from '../../state/global/userNames';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 1px 3px rgba(0, 0, 0, 0.05)'
      : '0 1px 3px rgba(0, 0, 0, 0.3)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backdropFilter: 'blur(10px)',
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 3),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(1, 2),
  },
}));

const Logo = styled(Link)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1.5rem',
  color: theme.palette.primary.main,
  textDecoration: 'none',
  cursor: 'pointer',
  letterSpacing: '-0.5px',
  whiteSpace: 'nowrap',
  wordBreak: 'normal',
  overflowWrap: 'normal',
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.25rem',
  },
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.mode === 'light' ? '#F3F4F6' : '#262626',
  borderRadius: 10,
  padding: theme.spacing(0.75, 2),
  width: '100%',
  maxWidth: 400,
  transition: 'all 0.2s ease',
  border: `1px solid ${theme.palette.divider}`,
  '&:focus-within': {
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${theme.palette.mode === 'light' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(129, 140, 248, 0.15)'}`,
  },
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  flex: 1,
  color: theme.palette.text.primary,
}));

const NavButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
  },
}));

const WriteButton = styled(Button)(({ theme }) => ({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1, 3),
  boxShadow: 'none',
  '&:hover': {
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 4px 12px rgba(99, 102, 241, 0.25)'
        : '0 4px 12px rgba(129, 140, 248, 0.3)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.75, 1.5),
    minWidth: 'auto',
    '& .MuiButton-startIcon': {
      margin: 0,
    },
  },
}));

const SignInButton = styled(Button)(({ theme }) => ({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 500,
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.75, 1.5),
    fontSize: '0.875rem',
  },
}));

const ProfileButton = styled(Button)(({ theme }) => ({
  borderRadius: 10,
  textTransform: 'none',
  padding: theme.spacing(0.5, 1.5),
  minWidth: 'auto',
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  gap: theme.spacing(1),
}));

const PrimaryBadge = styled(Chip)(({ theme }) => ({
  height: '20px',
  fontSize: '11px',
  fontWeight: 600,
  borderRadius: '10px',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 193, 7, 0.2)'
      : 'rgba(255, 193, 7, 0.15)',
  color: theme.palette.mode === 'dark' ? '#ffc107' : '#f57c00',
  '& .MuiChip-icon': {
    fontSize: '14px',
    marginLeft: '4px',
    color: 'inherit',
  },
}));

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useGlobal();
  const { switchName } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showNameList, setShowNameList] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const [preferredNamesMap, setPreferredNamesMap] = useAtom(
    preferredNamesMapAtom
  );
  const [names] = useAtom(userNamesAtom);
  const [isLoadingNames] = useAtom(isLoadingUserNamesAtom);
  const setUserNames = useSetAtom(userNamesAtom);
  const setIsLoadingUserNames = useSetAtom(isLoadingUserNamesAtom);

  // Fetch names when component mounts or address changes
  useEffect(() => {
    const fetchNames = async () => {
      if (!auth?.address) {
        setUserNames([]);
        setIsLoadingUserNames(false);
        return;
      }

      setIsLoadingUserNames(true);
      try {
        const response = await fetch(`/names/address/${auth.address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch names');
        }
        const data = await response.json();
        const fetchedNames = data?.map((item: any) => item?.name) || [];
        setUserNames(fetchedNames);
      } catch (error) {
        console.error('Error fetching names:', error);
        setUserNames([]);
      } finally {
        setIsLoadingUserNames(false);
      }
    };

    fetchNames();
  }, [auth?.address, setUserNames, setIsLoadingUserNames]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setShowNameList(false);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setShowNameList(false);
  };

  const handleShowNameList = () => {
    setShowNameList(true);
  };

  const handleBackToMenu = () => {
    setShowNameList(false);
  };

  const handleNameSwitch = async (name: string) => {
    if (!switchName || name === auth?.name) {
      handleMenuClose();
      return;
    }

    setIsSwitching(true);
    try {
      await switchName(name);
      // Save the preferred name for this address
      if (auth?.address) {
        setPreferredNamesMap({
          ...preferredNamesMap,
          [auth.address]: name,
        });
      }

      showSuccess(`Switched to ${name}`);
      handleMenuClose();

      // Navigate to the author's profile page
      setTimeout(() => {
        navigate(`/author/${name}`);
      }, 100);
    } catch (error) {
      console.error('Error switching name:', error);
      showError('Failed to switch name');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!auth) return;

    setIsAuthenticating(true);
    try {
      await auth.authenticateUser();
      showSuccess('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
      showError('Failed to authenticate');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleWriteClick = () => {
    if (!auth?.name) {
      // Show a helpful message or just navigate - they'll see the warning on WritePage
      navigate('/write');
    } else {
      navigate('/write');
    }
  };

  // Check if we're on the discover page
  const isOnDiscoverPage = location.pathname === '/discover';

  return (
    <StyledAppBar position="sticky">
      <StyledToolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Logo to="/">Perennial</Logo>
        </Box>

        <NavButtons>
          {!auth?.address ? (
            <>
              {/* Show authenticate button when not authenticated at all */}
              {!isOnDiscoverPage && (
                <Button
                  variant="outlined"
                  startIcon={<ExploreIcon />}
                  onClick={() => navigate('/discover')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    padding: { xs: '6px 12px', sm: '8px 16px' },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: 0, sm: 1 },
                    },
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Explore
                  </Box>
                </Button>
              )}
              <SignInButton
                onClick={handleAuthenticate}
                disabled={isAuthenticating || auth?.isLoadingUser}
                startIcon={
                  isAuthenticating || auth?.isLoadingUser ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
              >
                {isAuthenticating || auth?.isLoadingUser
                  ? 'Authenticating...'
                  : 'Authenticate'}
              </SignInButton>
              <Tooltip
                title={!auth?.name ? 'You need a Qortal name to publish' : ''}
                arrow
              >
                <span>
                  <WriteButton
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleWriteClick}
                    disabled={!auth?.name}
                  >
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      Start Writing
                    </Box>
                  </WriteButton>
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              {/* User is authenticated - show write button and profile */}
              {!isOnDiscoverPage && (
                <Button
                  variant="outlined"
                  startIcon={<ExploreIcon />}
                  onClick={() => navigate('/discover')}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    padding: { xs: '6px 12px', sm: '8px 16px' },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: 0, sm: 1 },
                    },
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Explore
                  </Box>
                </Button>
              )}
              <Tooltip
                title={!auth?.name ? 'You need a Qortal name to publish' : ''}
                arrow
              >
                <span>
                  <WriteButton
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleWriteClick}
                    disabled={!auth?.name}
                  >
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      Write
                    </Box>
                  </WriteButton>
                </span>
              </Tooltip>
              <ProfileButton onClick={handleMenuOpen}>
                <Avatar
                  src={
                    auth?.name
                      ? `/arbitrary/THUMBNAIL/${auth.name}/qortal_avatar?async=true`
                      : undefined
                  }
                  alt={auth?.name ? `${auth.name} avatar` : undefined}
                  sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}
                >
                  {auth?.name ? auth.name[0].toUpperCase() : <PersonIcon />}
                </Avatar>
                <ArrowDownIcon sx={{ fontSize: 20 }} />
              </ProfileButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    minWidth: 240,
                  },
                }}
              >
                {showNameList ? (
                  <>
                    {/* Name list view */}
                    <MenuItem onClick={handleBackToMenu}>
                      <ArrowDownIcon
                        sx={{ fontSize: 16, mr: 1, transform: 'rotate(90deg)' }}
                      />
                      <Typography variant="body2">Back</Typography>
                    </MenuItem>
                    <Divider />
                    {isLoadingNames ? (
                      <MenuItem>
                        <CircularProgress size={20} />
                      </MenuItem>
                    ) : names.length === 0 ? (
                      <MenuItem disabled>
                        <Typography variant="body2" color="text.secondary">
                          No names found
                        </Typography>
                      </MenuItem>
                    ) : (
                      names.map((name) => {
                        const isPrimary = name === auth?.primaryName;
                        const isCurrent = name === auth?.name;

                        return (
                          <MenuItem
                            key={name}
                            onClick={() => handleNameSwitch(name)}
                            disabled={isSwitching}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flex: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={isCurrent ? 700 : 400}
                              >
                                @{name}
                              </Typography>
                              {isPrimary && (
                                <PrimaryBadge
                                  icon={<StarIcon />}
                                  label="Primary"
                                  size="small"
                                />
                              )}
                            </Box>
                            {isCurrent && (
                              <CheckIcon
                                sx={{ fontSize: 18, color: 'primary.main' }}
                              />
                            )}
                          </MenuItem>
                        );
                      })
                    )}
                  </>
                ) : (
                  <>
                    {/* Main menu view */}
                    {auth?.name && (
                      <MenuItem onClick={handleShowNameList}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {auth.name}
                          </Typography>
                          <ArrowDownIcon sx={{ fontSize: 16 }} />
                        </Box>
                      </MenuItem>
                    )}
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        handleMenuClose();
                        navigate(`/author/${auth.name}`);
                      }}
                    >
                      Profile
                    </MenuItem>
                    {/* <MenuItem
                      onClick={() => {
                        handleMenuClose();
                        navigate('/my-publications');
                      }}
                    >
                      My Publications
                    </MenuItem> */}
                  </>
                )}
              </Menu>
            </>
          )}
        </NavButtons>
      </StyledToolbar>
    </StyledAppBar>
  );
};
