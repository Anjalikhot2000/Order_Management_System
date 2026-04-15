import axios from 'axios';

/**
 * Setup axios interceptors for global loading state
 * Should be called once in App.jsx with loading context
 * 
 * @param {Object} loadingContext - Loading context with startLoading and stopLoading
 */
export const setupAxiosInterceptors = (loadingContext) => {
  if (!loadingContext) return;

  const { startLoading, stopLoading } = loadingContext;

  // Request interceptor - start loading before API call
  axios.interceptors.request.use(
    (config) => {
      startLoading();
      return config;
    },
    (error) => {
      stopLoading();
      return Promise.reject(error);
    }
  );

  // Response interceptor - stop loading after API call
  axios.interceptors.response.use(
    (response) => {
      stopLoading();
      return response;
    },
    (error) => {
      stopLoading();
      return Promise.reject(error);
    }
  );
};
