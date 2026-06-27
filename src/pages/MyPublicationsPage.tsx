import { useState, useEffect, useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobal, showError, showSuccess, usePublish } from 'qapp-core';
import { ENTITY_ARTICLE, ENTITY_ROOT } from '../utils/articleQdn';
import { formatDistanceToNow } from 'date-fns';
import { SERVICE_DOCUMENT } from '../constants/qdn';

const PageHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(4, 0),
  marginBottom: theme.spacing(4),
}));

const ArticleCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 8px 16px rgba(0, 0, 0, 0.1)'
        : '0 8px 16px rgba(0, 0, 0, 0.5)',
    borderColor: theme.palette.primary.main,
  },
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(8, 2),
  color: theme.palette.text.secondary,
}));

const EmptyStateIcon = styled(Box)(({ theme }) => ({
  fontSize: '4rem',
  marginBottom: theme.spacing(2),
  opacity: 0.5,
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
}

export const MyPublicationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, identifierOperations, lists } = useGlobal();
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track previous values to prevent infinite re-renders
  const prevAuthNameRef = useRef<string>('');
  const prevIdentifierOperationsRef = useRef<string>('');
  const prevListsRef = useRef<string>('');

  // Fetch user's articles using lists.fetchResourcesResultsOnly (like example app)
  const fetchArticles = useCallback(async () => {
    if (!auth?.name || !identifierOperations || !lists) {
      setResources([]);
      return;
    }

    try {
      setIsLoading(true);

      // Get the article identifier prefix
      const articlePrefix = await identifierOperations.buildSearchPrefix(
        ENTITY_ARTICLE,
        ENTITY_ROOT
      );

      if (!articlePrefix) {
        throw new Error('Failed to create article prefix');
      }

      // Fetch all articles by this user
      const articleResources = await lists.fetchResourcesResultsOnly({
        identifier: articlePrefix,
        service: SERVICE_DOCUMENT,
        name: auth.name,
        limit: 0, // Get all articles
        prefix: true,
      });

      setResources(articleResources || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      showError('Failed to load articles');
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [auth?.name, identifierOperations, lists]);

  // Fetch articles on mount and when user changes
  useEffect(() => {
    const currentAuthName = auth?.name || '';
    const currentIdentifierOperations = identifierOperations ? 'present' : '';
    const currentLists = lists ? 'present' : '';

    if (
      currentAuthName === prevAuthNameRef.current &&
      currentIdentifierOperations === prevIdentifierOperationsRef.current &&
      currentLists === prevListsRef.current
    ) {
      return;
    }

    prevAuthNameRef.current = currentAuthName;
    prevIdentifierOperationsRef.current = currentIdentifierOperations;
    prevListsRef.current = currentLists;

    fetchArticles();
  }, [auth?.name, identifierOperations, lists, fetchArticles]);

  const handleDeleteConfirm = async () => {
    if (!selectedArticle || !lists) return;

    try {
      setDeletingId(selectedArticle.identifier);

      // Use deleteResource from lists (like example app)
      await lists.deleteResource([
        {
          service: SERVICE_DOCUMENT,
          name: auth?.name || '',
          identifier: selectedArticle.identifier,
        },
      ]);

      showSuccess('Article deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedArticle(null);

      // Refetch articles
      await fetchArticles();
    } catch (error: any) {
      console.error('Error deleting article:', error);
      showError(error.message || 'Failed to delete article');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedArticle(null);
  };

  const handleCardClick = (article: any) => {
    navigate(`/article/${auth?.name}/${article.identifier}`, {
      state: { from: location.pathname },
    });
  };

  if (!auth?.name) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please authenticate with a Qortal name to view your publications.
        </Alert>
      </Container>
    );
  }

  // Fetch article data for display
  const ArticleCardWithData = ({ article }: { article: any }) => {
    const [localAnchorEl, setLocalAnchorEl] = useState<HTMLElement | null>(
      null
    );

    const { resource } = usePublish(2, 'JSON', {
      service: SERVICE_DOCUMENT,
      name: auth?.name || '',
      identifier: article.identifier,
    });

    const articleData = resource?.data as ArticleData | undefined;
    const coverImageUrl = articleData?.coverImage?.src
      ? typeof articleData.coverImage.src === 'string'
        ? articleData.coverImage.src.startsWith('data:')
          ? articleData.coverImage.src
          : `data:image/webp;base64,${articleData.coverImage.src}`
        : undefined
      : undefined;

    const timeAgo =
      article.updated || article.created
        ? formatDistanceToNow(article.updated || article.created, {
            addSuffix: true,
          })
        : '';

    const handleLocalMenuOpen = (
      event: React.MouseEvent<HTMLButtonElement>
    ) => {
      event.stopPropagation();
      event.preventDefault();
      setLocalAnchorEl(event.currentTarget);
    };

    const handleLocalMenuClose = () => {
      setLocalAnchorEl(null);
    };

    const handleLocalEdit = () => {
      navigate(`/edit/${auth?.name}/${article.identifier}`);
      handleLocalMenuClose();
    };

    const handleLocalDelete = () => {
      setSelectedArticle(article);
      setDeleteDialogOpen(true);
      handleLocalMenuClose();
    };

    return (
      <ArticleCard>
        {coverImageUrl && (
          <CardMedia
            component="img"
            height="200"
            image={coverImageUrl}
            alt={articleData?.title || 'Article cover'}
            sx={{ cursor: 'pointer' }}
            onClick={() => handleCardClick(article)}
          />
        )}
        <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
          >
            <IconButton size="small" onClick={handleLocalMenuOpen}>
              <MoreVertIcon />
            </IconButton>

            {/* Menu inside the card */}
            <Menu
              anchorEl={localAnchorEl}
              open={Boolean(localAnchorEl)}
              onClose={handleLocalMenuClose}
            >
              <MenuItem onClick={handleLocalEdit}>
                <EditIcon sx={{ mr: 1 }} fontSize="small" />
                Edit
              </MenuItem>
              <MenuItem
                onClick={handleLocalDelete}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                Delete
              </MenuItem>
            </Menu>
          </Box>

          <Box
            sx={{ cursor: 'pointer' }}
            onClick={() => handleCardClick(article)}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              gutterBottom
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {articleData?.title || 'Untitled'}
            </Typography>

            {articleData?.subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {articleData.subtitle}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary">
              {timeAgo}
            </Typography>
          </Box>

          {articleData?.tags && articleData.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
              {articleData.tags.slice(0, 3).map((tag, index) => (
                <Chip key={index} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </CardContent>
      </ArticleCard>
    );
  };

  return (
    <>
      <PageHeader>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                My Publications
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your articles and episodes
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/write')}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              New Article
            </Button>
          </Box>
        </Container>
      </PageHeader>

      <Container maxWidth="lg" sx={{ pb: 8 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : resources.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>📝</EmptyStateIcon>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              No Publications Yet
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Start writing your first article or episode
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/write')}
              sx={{ textTransform: 'none' }}
            >
              Create Your First Article
            </Button>
          </EmptyState>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {resources.map((article) => (
              <Box key={article.identifier}>
                <ArticleCardWithData article={article} />
              </Box>
            ))}
          </Box>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Article?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedArticle?.data?.title}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={!!deletingId}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={!!deletingId}
            startIcon={
              deletingId ? <CircularProgress size={16} /> : <DeleteIcon />
            }
          >
            {deletingId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
