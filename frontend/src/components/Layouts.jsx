import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

export const statusColorMap = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'secondary',
  packed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  paid: 'success',
  failed: 'error',
  refunded: 'default'
};

export function StatusChip({ label }) {
  const normalized = String(label || 'pending').toLowerCase();
  return (
    <Chip
      label={normalized.replace('_', ' ')}
      color={statusColorMap[normalized] || 'default'}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

export function MetricCard({ title, value, caption, accent = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%', background: 'linear-gradient(180deg, #fff 0%, #f8fbff 100%)' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, color: accent }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function SectionCard({ title, subtitle, action, children, sx }) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ p: 3 }}>
        {(title || action) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2.5 }}
          >
            <Box>
              {title && <Typography variant="h6">{title}</Typography>}
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {action}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <Paper
      sx={{
        p: 5,
        textAlign: 'center',
        background: 'linear-gradient(180deg, #fff 0%, #f8fbff 100%)',
        border: '1px dashed rgba(20, 33, 61, 0.18)'
      }}
    >
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, mb: 2.5 }}>
        {description}
      </Typography>
      {action}
    </Paper>
  );
}

export function PublicLayout({ title, subtitle, eyebrow, actions, children }) {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="xl">
        <Paper
          sx={{
            overflow: 'hidden',
            borderRadius: 8,
            background:
              'linear-gradient(135deg, rgba(20, 33, 61, 0.97) 0%, rgba(25, 48, 89, 0.98) 54%, rgba(12, 74, 110, 0.98) 100%)',
            color: 'common.white',
            mb: 4
          }}
        >
          <div className="container-fluid">
            <div className="row g-0 align-items-stretch">
              <div className="col-lg-7">
                <Box sx={{ p: { xs: 4, md: 6 }, height: '100%', display: 'flex', alignItems: 'center' }}>
                  <Box>
                    {eyebrow && (
                      <Chip
                        label={eyebrow}
                        size="small"
                        sx={{
                          mb: 2,
                          color: 'common.white',
                          backgroundColor: 'rgba(255,255,255,0.12)'
                        }}
                      />
                    )}
                    <Typography variant="h2" sx={{ color: 'common.white', mb: 2 }}>
                      {title}
                    </Typography>
                    <Typography sx={{ maxWidth: 640, opacity: 0.86, fontSize: '1.05rem', lineHeight: 1.7 }}>
                      {subtitle}
                    </Typography>
                    {actions && <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>{actions}</Stack>}
                  </Box>
                </Box>
              </div>
              <div className="col-lg-5">
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 260,
                    p: { xs: 4, md: 5 },
                    background:
                      'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 25%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))'
                  }}
                >
                  {children}
                </Box>
              </div>
            </div>
          </div>
        </Paper>
      </Container>
    </Box>
  );
}

function NavList({ navItems, onNavigate }) {
  const location = useLocation();

  return (
    <List sx={{ px: 1 }}>
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <ListItemButton
            key={item.label}
            component={RouterLink}
            to={item.path}
            selected={active}
            onClick={onNavigate}
            sx={{
              borderRadius: 3,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'rgba(29, 78, 216, 0.12)',
                color: 'primary.main'
              }
            }}
          >
            {item.icon && <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>}
            <ListItemText primary={item.label} />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export function DashboardLayout({
  title,
  subtitle,
  user,
  logout,
  navItems,
  metrics,
  headerAction,
  children
}) {
  const [open, setOpen] = React.useState(false);

  const drawerContent = (
    <Box sx={{ width: 280, p: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.5 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
          {user?.name?.[0] || 'U'}
        </Avatar>
        <Box>
          <Typography variant="subtitle1">{user?.name || 'User'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {user?.role || 'member'}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 1 }} />
      <NavList navItems={navItems} onNavigate={() => setOpen(false)} />
      <Box sx={{ px: 2, pt: 2 }}>
        <Button
          fullWidth
          color="error"
          variant="outlined"
          startIcon={<LogoutRoundedIcon />}
          onClick={logout}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ backgroundColor: 'rgba(255,255,255,0.84)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(20,33,61,0.08)' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton sx={{ display: { lg: 'none' } }} onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="primary.main">
              Operations Console
            </Typography>
            <Typography variant="h5">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {headerAction}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <div className="row g-4">
          <div className="col-lg-3 d-none d-lg-block">
            <Paper sx={{ position: 'sticky', top: 96, overflow: 'hidden' }}>{drawerContent}</Paper>
          </div>
          <div className="col-lg-9">
            {metrics && metrics.length > 0 && (
              <div className="row g-3 mb-3">
                {metrics.map((metric) => (
                  <div className="col-sm-6 col-xl-3" key={metric.title}>
                    <MetricCard {...metric} />
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
        </div>
      </Container>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)} sx={{ display: { lg: 'none' } }}>
        {drawerContent}
      </Drawer>
    </Box>
  );
}
