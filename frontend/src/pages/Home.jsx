import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
  AppBar,
  Toolbar
} from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const featureCards = [
  {
    title: 'Product Operations',
    description: 'Keep catalogs tidy, inventory visible, and teams aligned with a cleaner product workflow.',
    icon: <Inventory2RoundedIcon color="primary" />
  },
  {
    title: 'Order Processing',
    description: 'Track every order from cart to confirmation with structured status updates and quick visibility.',
    icon: <ReceiptLongRoundedIcon color="primary" />
  },
  {
    title: 'Analytics Overview',
    description: 'Give admins a professional dashboard experience with key metrics front and center.',
    icon: <InsightsRoundedIcon color="primary" />
  }
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'customer':
          navigate('/customer/dashboard');
          break;
        default:
          break;
      }
    }
  }, [user, navigate]);

  return (
    <>
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, rgba(15, 76, 129, 0.95), rgba(10, 51, 87, 0.98))', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
          <Logo variant="default" size="md" showText={true} />
          <Stack direction="row" spacing={2}>
            {user ? (
              <Button
                component={Link}
                to="/products"
                sx={{ color: 'white', textTransform: 'none', fontWeight: 500 }}
              >
                Browse Products
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/login"
                  sx={{ color: 'rgba(255,255,255,0.9)', textTransform: 'none', fontWeight: 500 }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  color="secondary"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Create Account
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="xl">
        <Card
          sx={{
            overflow: 'hidden',
            borderRadius: 6,
            border: '1px solid rgba(15, 76, 129, 0.12)',
            background:
              'linear-gradient(135deg, rgba(10, 51, 87, 0.98), rgba(15, 76, 129, 0.93))'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 6 } }}>
            <div className="container-fluid px-0">
              <div className="row g-4 align-items-center">
                <div className="col-lg-7">
                  <Stack spacing={3}>
                    <Chip
                      label="Bootstrap layout + Material UI components"
                      color="secondary"
                      sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                    />
                    <Typography variant="h2" sx={{ color: 'white', maxWidth: 760 }}>
                      Order management that feels polished, clear, and ready for daily operations.
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.78)', maxWidth: 640, fontSize: '1.05rem' }}>
                      Manage products, customer orders, and team dashboards from one professional interface with
                      better hierarchy, cleaner spacing, and faster navigation.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      {user ? (
                        <Button
                          component={Link}
                          to="/products"
                          variant="contained"
                          color="secondary"
                          size="large"
                          endIcon={<ArrowForwardRoundedIcon />}
                        >
                          Browse Products
                        </Button>
                      ) : (
                        <>
                          <Button component={Link} to="/login" variant="contained" size="large">
                            Sign In
                          </Button>
                          <Button
                            component={Link}
                            to="/register"
                            variant="outlined"
                            size="large"
                            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                          >
                            Create Account
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </div>

                <div className="col-lg-5">
                  <Card sx={{ borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="overline" sx={{ letterSpacing: 1.5, opacity: 0.85 }}>
                        Operations Snapshot
                      </Typography>
                      <Stack spacing={2.5} sx={{ mt: 2 }}>
                        {[
                          ['Unified catalog control', 'Products, stock, and customer checkout aligned in one flow'],
                          ['Role-based workspace', 'Focused dashboards for admins and customers'],
                          ['Order visibility', 'Live status tracking from placement to delivery']
                        ].map(([title, text]) => (
                          <Box
                            key={title}
                            sx={{
                              p: 2.5,
                              borderRadius: 4,
                              bgcolor: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.08)'
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {title}
                            </Typography>
                            <Typography sx={{ mt: 0.75, color: 'rgba(255,255,255,0.74)' }}>{text}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="row g-4 mt-1">
          {featureCards.map((feature) => (
            <div className="col-md-6 col-xl-4" key={feature.title}>
              <Card sx={{ height: '100%', borderRadius: 5 }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 3,
                      bgcolor: 'rgba(15, 76, 129, 0.1)',
                      mb: 2
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6">{feature.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1.25 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </Container>
      </Box>
    </>
  );
};

export default Home;
