import { useState, useCallback, useMemo, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Avatar,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import {
  useGlobal,
  QortalMetadata,
  QortalSearchParams,
  ResourceListDisplay,
  LoaderListStatus,
} from 'qapp-core';
import { useAtom, useAtomValue } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import {
  groupOwnerPrimaryNamesAtom,
  groupArticleSearchPrefixesAtom,
  groupEpisodeSearchPrefixesAtom,
  isLoadingGroupOwnerNamesAtom,
  mySubscriptionGroupsAtom,
} from '../state/global/profile';
import { ArticleCard } from '../components/ArticleCard';
import { LoaderState, LoaderItem } from '../components/LoaderState';
import { useFetchProfile } from '../hooks/useFetchProfile';
import {
  ENTITY_ROOT,
  ENTITY_ARTICLE,
  ENTITY_EPISODE,
} from '../utils/articleQdn';
import { SERVICE_DOCUMENT } from '../constants/qdn';

declare const qortalRequest: (params: any) => Promise<any>;

const PageHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(6, 0, 4),
  borderBottom: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(4, 0, 3),
  },
}));

const SearchField = styled(TextField)(({ theme }) => ({
  maxWidth: 600,
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${theme.palette.mode === 'light' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(129, 140, 248, 0.15)'}`,
    },
  },
}));

const SearchSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 16,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: 12,
    '& > *': {
      width: '100%',
    },
  },
}));

const SearchButton = styled(Button)(({ theme }) => ({
  minWidth: '100px',
  height: '40px',
  borderRadius: '20px',
  textTransform: 'none',
  fontWeight: 600,
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    minWidth: 'unset',
  },
}));

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  '& .MuiToggleButton-root': {
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    padding: theme.spacing(1, 2),
    textTransform: 'none',
    fontWeight: 500,
    gap: theme.spacing(1),
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: '#fff',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
    '&:hover': {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(29, 155, 240, 0.1)'
          : 'rgba(29, 155, 240, 0.08)',
    },
    [theme.breakpoints.down('sm')]: {
      borderRadius: '0 !important',
    },
  },
}));

const UserResultItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.02)',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(29, 155, 240, 0.1)'
        : 'rgba(29, 155, 240, 0.05)',
    borderColor: theme.palette.primary.main,
    transform: 'translateX(4px)',
  },
}));

const UserInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  gap: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

const tabs = ['All', 'Only public', 'Your Subscriptions'];

type SearchType = 'publications' | 'names';

// Persistent atom for selected tab - remembers user's preference
const selectedTabAtom = atomWithStorage<number>(
  'discover_page_selected_tab',
  0 // Default to "All" tab
);

// User Result Card Component
interface UserResultCardProps {
  userName: string;
  currentUserName?: string;
  onClick: () => void;
}

function UserResultCard({
  userName,
  currentUserName,
  onClick,
}: UserResultCardProps) {
  const { profile } = useFetchProfile(userName);

  return (
    <UserResultItem onClick={onClick}>
      <UserInfo>
        <Avatar
          src={
            profile?.avatar
              ? `/arbitrary/THUMBNAIL/${userName}/qortal_avatar?apiVersion=2`
              : undefined
          }
          sx={{ width: 48, height: 48 }}
        >
          {userName[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="body1" fontWeight={700}>
            {userName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            @{userName}
          </Typography>
          {profile?.bio && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {profile.bio}
            </Typography>
          )}
        </Box>
      </UserInfo>
      {currentUserName === userName && (
        <Typography
          variant="caption"
          sx={{
            backgroundColor: (theme) => theme.palette.primary.main,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          You
        </Typography>
      )}
    </UserResultItem>
  );
}

export const DiscoverPage = () => {
  const navigate = useNavigate();
  const { identifierOperations, auth } = useGlobal();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('publications');
  const [searchNames, setSearchNames] = useState<string[] | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<
    Array<{ name: string }>
  >([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedTab, setSelectedTab] = useAtom(selectedTabAtom);
  const [searchPrefix, setSearchPrefix] = useState<string | null>(null);
  const [episodeSearchPrefix, setEpisodeSearchPrefix] = useState<string | null>(
    null
  );
  const groupArticleSearchPrefixes = useAtomValue(
    groupArticleSearchPrefixesAtom
  );
  const groupEpisodeSearchPrefixes = useAtomValue(
    groupEpisodeSearchPrefixesAtom
  );

  // Access group data from atoms
  const isLoadingGroupOwnerNames = useAtomValue(isLoadingGroupOwnerNamesAtom);
  const groupOwnerNames = useAtomValue(groupOwnerPrimaryNamesAtom);
  const memberGroups = useAtomValue(mySubscriptionGroupsAtom);
  const [primaryNamesGroup, setPrimaryNamesGroup] = useState<string[] | null>(
    null
  );

  // Build the search prefix for articles and episodes
  useEffect(() => {
    if (isLoadingGroupOwnerNames) return;

    const buildPrefix = async () => {
      if (!identifierOperations) return;
      if (memberGroups === null) return;

      try {
        const prefix = await identifierOperations.buildSearchPrefix(
          ENTITY_ARTICLE,
          ENTITY_ROOT
        );
        setSearchPrefix(prefix);

        const episodePrefix = await identifierOperations.buildSearchPrefix(
          ENTITY_EPISODE,
          ENTITY_ROOT
        );
        setEpisodeSearchPrefix(episodePrefix);

        setPrimaryNamesGroup(groupOwnerNames);
        // Group article/episode prefixes are built globally in useSubscriptionNotificationRegistration
      } catch (error) {
        console.error('Failed to build search prefix:', error);
      }
    };

    buildPrefix();
  }, [
    identifierOperations,
    isLoadingGroupOwnerNames,
    memberGroups,
    groupOwnerNames,
    selectedTab,
  ]);

  // NOTIFICATION_ADD for subscriptions runs globally in useSubscriptionNotificationRegistration when permission is granted

  const loaderItem = useCallback(() => {
    return <LoaderItem />;
  }, []);

  const loaderList = useCallback((status: LoaderListStatus) => {
    console.log('status', status);
    return (
      <LoaderState
        status={status}
        emptyIcon="📝"
        emptyTitle="No articles yet"
        emptyMessage="Be the first to publish an article!"
      />
    );
  }, []);

  const listItem = useCallback(
    (item: { qortalMetadata: QortalMetadata; data: any }, _index: number) => {
      return (
        <ArticleCard qortalMetadata={item.qortalMetadata} data={item.data} />
      );
    },
    []
  );

  const search = useMemo((): QortalSearchParams => {
    // For "Subscriptions" tab, use a placeholder that won't match public content
    // The actual subscription content comes from secondaryDataSources
    if (selectedTab === 2) {
      return {
        service: SERVICE_DOCUMENT,
        limit: 20,
        reverse: true,
        identifier: 'placeholder-no-public',
      };
    }

    // Base search for public articles
    const baseSearch: QortalSearchParams = {
      service: SERVICE_DOCUMENT,
      limit: 20,
      reverse: true,
      identifier: searchPrefix || '',
      prefix: true,
    };

    // Add query for publication search
    if (searchQuery) {
      baseSearch.query = searchQuery;
    }

    // Add names filter for Qortal name search
    if (searchNames && searchNames.length > 0) {
      baseSearch.names = searchNames;
      baseSearch.exactMatchNames = true;
    }

    return baseSearch;
  }, [searchPrefix, selectedTab, searchQuery, searchNames]);

  const secondaryDataSources = useMemo((): any[] | undefined => {
    if (!episodeSearchPrefix) return undefined;

    // Tab 0: All - includes public episodes + subscription content
    // Tab 1: Only public - only public episodes, no subscription content
    // Tab 2: Subscriptions - only subscription content, no public episodes

    let dataSources: any[] = [];

    // Add public episodes for "All" and "Only public" tabs
    if (selectedTab === 0 || selectedTab === 1) {
      const episodeParams: any = {
        service: 'DOCUMENT',
        identifier: episodeSearchPrefix,
        reverse: true,
        prefix: true,
      };

      // Add query for publication search
      if (searchQuery) {
        episodeParams.query = searchQuery;
      }

      // Add names filter for Qortal name search
      if (searchNames && searchNames.length > 0) {
        episodeParams.names = searchNames;
        episodeParams.exactMatchNames = true;
      }

      dataSources.push({
        params: episodeParams,
      });
    }

    // Add group articles and episodes for "All" and "Subscriptions" tabs
    if (
      (selectedTab === 0 || selectedTab === 2) &&
      primaryNamesGroup &&
      primaryNamesGroup.length > 0 &&
      groupArticleSearchPrefixes &&
      groupArticleSearchPrefixes.length > 0 &&
      groupEpisodeSearchPrefixes &&
      groupEpisodeSearchPrefixes.length > 0
    ) {
      // Filter group owner names if searching by name
      const filteredGroupOwners =
        searchNames && searchNames.length > 0
          ? primaryNamesGroup.filter((name) => searchNames.includes(name))
          : primaryNamesGroup;

      // Only add group sources if we have names to filter by
      if (filteredGroupOwners.length > 0) {
        // Add group articles
        dataSources.push(
          ...groupArticleSearchPrefixes.map((prefix) => {
            const params: any = {
              service: 'DOCUMENT' as const,
              identifier: prefix,
              names: filteredGroupOwners,
              exactMatchNames: true,
              reverse: true,
              prefix: true,
            };

            // Add query for publication search
            if (searchQuery) {
              params.query = searchQuery;
            }

            return { params };
          })
        );
        console.log('groupArticleSearchPrefixes', groupArticleSearchPrefixes);
        // Add group episodes
        dataSources.push(
          ...groupEpisodeSearchPrefixes.map((prefix) => {
            const params: any = {
              service: 'DOCUMENT' as const,
              identifier: prefix,
              names: filteredGroupOwners,
              exactMatchNames: true,
              reverse: true,
              prefix: true,
            };

            // Add query for publication search
            if (searchQuery) {
              params.query = searchQuery;
            }

            return { params };
          })
        );
      }
    }

    return dataSources.length > 0 ? dataSources : undefined;
  }, [
    episodeSearchPrefix,
    primaryNamesGroup,
    groupArticleSearchPrefixes,
    groupEpisodeSearchPrefixes,
    selectedTab,
    searchQuery,
    searchNames,
  ]);
  console.log('secondaryDataSources', secondaryDataSources);
  // Get tab title for display
  const getTabTitle = () => {
    switch (selectedTab) {
      case 0:
        return 'All Publications';
      case 1:
        return 'Public Publications';
      case 2:
        return 'Subscription Publications';
      default:
        return 'Publications';
    }
  };

  // Handle search execution
  const executeSearch = useCallback(() => {
    if (!searchInput.trim()) {
      setSearchQuery('');
      setSearchNames(null);
      setUserSearchResults([]);
      return;
    }

    const trimmedQuery = searchInput.trim();

    if (searchType === 'publications') {
      // For publication search, use the query parameter
      setSearchQuery(trimmedQuery);
      setSearchNames(null);
      setUserSearchResults([]);
    } else {
      // For name search, fetch and display user results
      setIsSearchingUsers(true);
      qortalRequest({
        action: 'SEARCH_NAMES',
        query: trimmedQuery,
        limit: 20,
      })
        .then((response: any) => {
          const users: Array<{ name: string }> = [];
          if (response && Array.isArray(response)) {
            response.forEach((nameData: any) => {
              const name = nameData.name || nameData;
              if (name) {
                users.push({ name });
              }
            });
          }
          setUserSearchResults(users);
          setSearchQuery(''); // Clear publication query when searching names
          setSearchNames(null); // Don't filter articles by names
        })
        .catch((error) => {
          console.error('Error searching names:', error);
          setUserSearchResults([]);
        })
        .finally(() => {
          setIsSearchingUsers(false);
        });
    }
  }, [searchInput, searchType]);

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      executeSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setSearchNames(null);
    setUserSearchResults([]);
  };

  console.log(
    'listname',
    `${tabs[selectedTab].toUpperCase().replace(/\s+/g, '_')}_ARTICLES`
  );

  console.log('search', search);

  console.log(
    'entity Param',
    selectedTab === 2
      ? undefined // Subscriptions tab uses only secondaryDataSources
      : {
          entityType: ENTITY_ARTICLE,
          parentId: ENTITY_ROOT,
        }
  );

  return (
    <>
      {/* Header */}
      <PageHeader>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h3"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}
          >
            {searchType === 'names'
              ? 'Discover Authors'
              : 'Discover Publications'}
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {searchType === 'names'
              ? 'Find writers and creators on Qortal'
              : 'Find publications and writers that inspire you'}
          </Typography>

          <SearchSection>
            <SearchField
              fullWidth
              placeholder={
                searchType === 'publications'
                  ? 'Search publications...'
                  : 'Search by Qortal name...'
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <SearchButton
              variant="contained"
              onClick={executeSearch}
              disabled={!searchInput.trim()}
            >
              Search
            </SearchButton>
            {(searchQuery || userSearchResults.length > 0) && (
              <Button
                variant="outlined"
                onClick={handleClearSearch}
                sx={{
                  minWidth: { xs: 'unset', sm: '100px' },
                  width: { xs: '100%', sm: 'auto' },
                  height: '40px',
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Clear
              </Button>
            )}
          </SearchSection>

          <StyledToggleButtonGroup
            value={searchType}
            exclusive
            onChange={(_, newType) => {
              if (newType) {
                setSearchType(newType);
                handleClearSearch();
              }
            }}
            fullWidth
            sx={{ maxWidth: 600, flexDirection: { xs: 'column', sm: 'row' } }}
          >
            <ToggleButton
              value="publications"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              <ArticleIcon fontSize="small" />
              Publications
            </ToggleButton>
            <ToggleButton
              value="names"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              <PersonIcon fontSize="small" />
              Qortal Names
            </ToggleButton>
          </StyledToggleButtonGroup>
        </Container>
      </PageHeader>

      {/* Tab Navigation - Only show for publications search */}
      {searchType === 'publications' && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => {
                setSelectedTab(newValue);
                setSearchPrefix(null);
                setEpisodeSearchPrefix(null);
              }}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTab-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minWidth: { xs: 'auto', sm: 120 },
                  px: { xs: 2, sm: 3 },
                },
              }}
            >
              {tabs.map((tab) => (
                <Tab
                  key={tab}
                  label={tab}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                />
              ))}
            </Tabs>
          </Container>
        </Box>
      )}

      {/* Content */}
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 3, sm: 6 }, px: { xs: 2, sm: 3 } }}
      >
        {searchType === 'names' ? (
          /* User Search Results */
          <>
            <Typography
              variant="h6"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 4, fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
            >
              {userSearchResults.length > 0
                ? `${userSearchResults.length} ${userSearchResults.length === 1 ? 'User' : 'Users'} Found`
                : 'Search Results'}
            </Typography>

            {isSearchingUsers ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                <CircularProgress />
              </Box>
            ) : !searchInput ? (
              <EmptyState>
                <PersonIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                <Typography variant="h6">Search for users</Typography>
                <Typography variant="body2" color="text.secondary">
                  Find people on Qortal
                </Typography>
              </EmptyState>
            ) : userSearchResults.length === 0 ? (
              <EmptyState>
                <SearchIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                <Typography variant="h6">No users found</Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching for a different name
                </Typography>
              </EmptyState>
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
                {userSearchResults.map((user) => (
                  <UserResultCard
                    key={user.name}
                    userName={user.name}
                    currentUserName={auth?.name || undefined}
                    onClick={() => navigate(`/author/${user.name}`)}
                  />
                ))}
              </Box>
            )}
          </>
        ) : (
          /* Publication Search Results */
          <>
            <Typography
              variant="h6"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 4, fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
            >
              {getTabTitle()}
            </Typography>

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
                  gap: 20,
                }}
                isLoading={
                  !searchPrefix ||
                  !episodeSearchPrefix ||
                  !groupEpisodeSearchPrefixes ||
                  !groupArticleSearchPrefixes
                }
                retryAttempts={3}
                listName={`${tabs[selectedTab].toUpperCase().replace(/\s+/g, '_')}_ARTICLES`}
                direction="VERTICAL"
                disableVirtualization
                disablePagination
                returnType="JSON"
                loaderList={loaderList}
                entityParams={
                  selectedTab === 2
                    ? undefined // Subscriptions tab uses only secondaryDataSources
                    : {
                        entityType: ENTITY_ARTICLE,
                        parentId: ENTITY_ROOT,
                      }
                }
                search={search}
                listItem={listItem}
                loaderItem={loaderItem}
                filterDuplicateIdentifiers={{
                  enabled: true,
                }}
                secondaryDataSources={secondaryDataSources}
              />
            </Box>
          </>
        )}
      </Container>
    </>
  );
};
