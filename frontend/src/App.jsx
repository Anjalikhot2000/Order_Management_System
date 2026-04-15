import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import GlobalLoader from './components/GlobalLoader';
import { setupAxiosInterceptors } from './utils/axiosInterceptor';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import './App.css';

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f4c81', light: '#406f9d', dark: '#0a3357' },
    secondary: { main: '#d97706' },
    background: { default: '#f4f7fb', paper: '#ffffff' },
    success: { main: '#15803d' },
    warning: { main: '#b45309' }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 18px 40px rgba(15, 76, 129, 0.08)' }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true }
    }
  }
});

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Inner App component that uses LoadingContext
const AppContent = () => {
  const loading = useLoading();

  // Setup axios interceptors on mount
  useEffect(() => {
    setupAxiosInterceptors(loading);
  }, [loading]);

  return (
    <Router>
      <GlobalLoader />
      <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<Products />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order-confirmation/:orderId"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <OrderConfirmation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard initialSection="customers" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard initialSection="reports" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard initialSection="settings" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      );
};

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
