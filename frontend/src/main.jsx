import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './global.css';
import App from './App.jsx';
import { API_BASE_URL } from './config/api';

if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
