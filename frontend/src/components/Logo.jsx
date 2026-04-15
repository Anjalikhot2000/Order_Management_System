import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Logo.css';

const Logo = ({ 
  variant = 'default', // 'default' | 'sidebar' | 'inline'
  showText = true,
  textOnly = false,
  size = 'md' // 'sm' | 'md' | 'lg'
}) => {
  if (textOnly) {
    return (
      <RouterLink to="/" className="logo-link logo-text-only">
        <span className={`logo-text logo-text-${size}`}>ShopHub</span>
      </RouterLink>
    );
  }

  return (
    <RouterLink to="/" className="logo-link">
      <img 
        src={logo} 
        alt="ShopHub Logo" 
        className={`logo-image logo-${variant} logo-${size}`}
      />
      {showText && (
        <span className={`logo-text logo-${variant} logo-text-${size}`}>
          ShopHub
        </span>
      )}
    </RouterLink>
  );
};

export default Logo;
