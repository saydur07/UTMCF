// src/config/api.js
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://us-central1-utmcf-2f326.cloudfunctions.net/api'
    : 'http://localhost:3001/api';

// Add this line
const SHOW_ADMIN_BUTTON = true; // Set to true to show admin button in production

export { API_BASE_URL, SHOW_ADMIN_BUTTON };