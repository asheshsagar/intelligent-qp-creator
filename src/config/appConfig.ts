
// API base URL from environment variable or default to localhost
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Default auth settings
export const AUTH_CONFIG = {
  tokenKey: 'authToken',  // localStorage key for authentication token
  tokenExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// Request timeout settings
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// App routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CIE_EXAM: '/cie-exam-setup',
  SEMESTER_EXAM: '/semester-exam-setup',
  GENERATE_QUESTIONS: '/generate-questions',
};
