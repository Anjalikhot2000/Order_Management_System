import React from 'react';
import './Loader.css';

/**
 * Reusable Loader Component
 * Displays three animated bouncing dots with optional loading text
 * 
 * @param {Object} props - Component props
 * @param {string} [props.text='Loading...'] - Loading text to display
 * @param {string} [props.size='medium'] - Size: 'small', 'medium', 'large'
 * @param {string} [props.color='default'] - Color: 'default', 'purple', 'blue'
 * @returns {JSX.Element} Loader component
 */
const Loader = ({ text = 'Loading...', size = 'medium', color = 'default' }) => {
  return (
    <div className={`loader-container loader-${size} loader-${color}`}>
      <div className="loader-dots">
        <span className="loader-dot"></span>
        <span className="loader-dot"></span>
        <span className="loader-dot"></span>
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;
