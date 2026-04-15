import React, { createContext, useState, useContext, useCallback } from 'react';

/**
 * LoadingContext - Global loading state for the application
 * Manages loading state for page transitions and API calls
 */
const LoadingContext = createContext();

/**
 * LoadingProvider - Context provider for global loading state
 */
export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);

  // Start loading - increments counter to handle multiple concurrent requests
  const startLoading = useCallback(() => {
    setLoadingCount((prev) => prev + 1);
    setLoading(true);
  }, []);

  // Stop loading - decrements counter, only stops when all requests are done
  const stopLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1));
    if (loadingCount <= 1) {
      // Small delay to prevent flickering
      setTimeout(() => setLoading(false), 300);
    }
  }, [loadingCount]);

  // Manual control
  const setLoadingState = useCallback((state) => {
    setLoading(state);
    if (!state) {
      setLoadingCount(0);
    }
  }, []);

  const value = {
    loading,
    setLoading: setLoadingState,
    startLoading,
    stopLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * useLoading - Hook to access global loading context
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};
