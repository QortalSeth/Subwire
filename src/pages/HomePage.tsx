import { styled } from '@mui/material/styles';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  Tooltip,
} from '@mui/material';
import {
  ArrowForward,
  TrendingUp,
  MenuBook,
  People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from 'qapp-core';

declare const qortalRequest: (params: any) => Promise<any>;

const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  padding: theme.spacing(12, 0, 10),
  textAlign: 'center',
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(8, 0, 6),
  },
}));

const HeroTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(2),
  fontSize: '3.5rem',
  lineHeight: 1.2,
  [theme.breakpoints.down('md')]: {
    fontSize: '2.5rem',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  },
}));

const HeroSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  opacity: 0.95,
  maxWidth: 600,
  margin: '0 auto',
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
  },
}));

const CTAButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  fontSize: '1.1rem',
  fontWeight: 600,
  borderRadius: 12,
  textTransform: 'none',
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 4px 14px rgba(0, 0, 0, 0.1)'
      : '0 4px 14px rgba(0, 0, 0, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 6px 20px rgba(99, 102, 241, 0.3)'
        : '0 6px 20px rgba(129, 140, 248, 0.4)',
  },
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(5),
  height: '100%',
  width: '100%',
  textAlign: 'center',
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    transform: 'scaleX(0)',
    transformOrigin: 'left',
    transition: 'transform 0.3s ease',
  },
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow:
      theme.palette.mode === 'light'
        ? '0 12px 24px rgba(99, 102, 241, 0.12)'
        : '0 12px 24px rgba(129, 140, 248, 0.2)',
    transform: 'translateY(-8px)',
    '&::before': {
      transform: 'scaleX(1)',
    },
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '20px',
  background:
    theme.palette.mode === 'light'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(129, 140, 248, 0.12)',
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  '.MuiCard-root:hover &': {
    transform: 'scale(1.1)',
    background:
      theme.palette.mode === 'light'
        ? 'rgba(99, 102, 241, 0.12)'
        : 'rgba(129, 140, 248, 0.18)',
  },
}));

const features = [
  {
    icon: <MenuBook sx={{ fontSize: 40 }} />,
    title: 'Write & Publish',
    description:
      'Create beautiful articles with our intuitive editor. No technical skills required.',
  },
  {
    icon: <People sx={{ fontSize: 40 }} />,
    title: 'Build Your Audience',
    description:
      'Grow your subscriber list and connect with readers who love your work.',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: 'Monetize Your Work',
    description:
      'Earn from subscriptions, tips, and exclusive content for your supporters.',
  },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const { auth } = useGlobal();

  return (
    <>
      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="md">
          <HeroTitle variant="h1">
            Start writing. Build your audience.
          </HeroTitle>
          <HeroSubtitle variant="h5">
            Join other writers sharing their stories, building communities, and
            earning from their passion.
          </HeroSubtitle>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Tooltip
              title={!auth?.name ? 'You need a Qortal name to publish' : ''}
              arrow
            >
              <span>
                <CTAButton
                  variant="contained"
                  color="inherit"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/write')}
                  disabled={!auth?.name}
                >
                  Start Writing
                </CTAButton>
              </span>
            </Tooltip>
            <CTAButton
              variant="outlined"
              size="large"
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
              onClick={() => navigate('/discover')}
            >
              Explore Publications
            </CTAButton>
          </Box>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Box
        sx={{
          bgcolor: 'background.default',
          py: 10,
          position: 'relative',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h3"
              fontWeight={700}
              gutterBottom
              sx={{
                background: (theme) =>
                  theme.palette.mode === 'light'
                    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                    : `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Everything You Need
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Powerful tools to help you succeed as a writer
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              justifyContent: 'center',
              '@media (max-width: 900px)': {
                flexDirection: 'column',
              },
            }}
          >
            {features.map((feature, index) => (
              <Box
                key={index}
                sx={{
                  flex: '1 1 300px',
                  maxWidth: '400px',
                  minWidth: '280px',
                }}
              >
                <FeatureCard elevation={0}>
                  <IconWrapper>{feature.icon}</IconWrapper>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    gutterBottom
                    sx={{ mb: 2 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ lineHeight: 1.7 }}
                  >
                    {feature.description}
                  </Typography>
                </FeatureCard>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Ready to share your story?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Start your publication today.
        </Typography>
        <CTAButton
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/write')}
        >
          Get Started
        </CTAButton>
      </Container>
    </>
  );
};
