const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

export const API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : (import.meta.env.DEV ? 'http://localhost:5000' : '');
