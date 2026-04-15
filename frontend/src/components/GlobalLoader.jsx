import React from 'react';
import { useLoading } from '../contexts/LoadingContext';
import Loader from './Loader';
import './GlobalLoader.css';

/**
 * GlobalLoader Component
 * Displays a full-screen overlay with 3-dot loader when any API request or page load is in progress
 */
const GlobalLoader = () => {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-content">
        <Loader text="Loading..." size="medium" color="blue" />
      </div>
    </div>
  );
};

export default GlobalLoader;
