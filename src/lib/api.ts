// src/lib/api.ts - Enhanced API with question paper endpoints
import axios from 'axios';
import { API_BASE_URL, AUTH_CONFIG, REQUEST_TIMEOUT } from '@/config/appConfig';

// Create axios instance with configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create separate instance for file uploads
const fileUploadApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for file uploads
});

// Add interceptor to include auth token with each request
const addAuthInterceptor = (instance: any) => {
  instance.interceptors.request.use(
    (config: any) => {
      const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(api);
addAuthInterceptor(fileUploadApi);

// Auth API endpoints
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData: {
    name: string;
    email: string;
    password: string;
    department: string;
    semester: string;
    courses: string[];
  }) => api.post('/auth/register', userData),
  
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    return Promise.resolve();
  }
};

// Courses API endpoints
export const coursesAPI = {
  getAllCourses: () => api.get('/courses'),
};

// Exams API endpoints
export const examsAPI = {
  createExam: (examData: {
    examType: string;
    semester: string;
    courseId: string;
  }) => api.post('/exams', examData),
  
  getEducatorExams: () => api.get('/exams'),
};

// Upload API endpoints
export const uploadAPI = {
  processDocuments: (formData: FormData) => 
    fileUploadApi.post('/upload/process-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  getProcessingStatus: (processId: string) => 
    api.get(`/upload/processing-status/${processId}`),
  
  getProcessedData: (courseId: string) => 
    api.get(`/upload/processed-data/${courseId}`),
  
  getMyUploads: () => api.get('/upload/my-uploads'),
  
  getCourseHistory: (courseId: string) => 
    api.get(`/upload/course-history/${courseId}`),
};

// Question Generation API endpoints
export const questionAPI = {
  generateQuestions: (config: {
    courseId: string;
    examType: string;
    questionConfigs: any[];
    useProcessedData: boolean;
  }) => api.post('/questions/generate', config),
  
  getQuestionsByFilters: (filters: {
    courseId: string;
    difficulty?: string;
    bloomLevel?: string;
    unit?: string;
    marks?: number;
  }) => api.post('/questions/filter', filters),
  
  getQuestionStats: (courseId: string) => api.get(`/questions/stats/${courseId}`),
};

// Question Paper API endpoints (NEW)
export const questionPaperAPI = {
  saveQuestionPaper: (paperData: {
    courseId: string;
    examType: string;
    semester: string;
    title: string;
    content: string;
    questions: any[];
    totalMarks: number;
    totalQuestions: number;
    generationSource: string;
    processedDataUsed?: string;
  }) => api.post('/question-papers', paperData),
  
  getMyQuestionPapers: () => api.get('/question-papers'),
  
  getQuestionPaper: (paperId: string) => api.get(`/question-papers/${paperId}`),
  
  trackDownload: (paperId: string) => api.put(`/question-papers/${paperId}/download`),
  
  deleteQuestionPaper: (paperId: string) => api.delete(`/question-papers/${paperId}`),
  
  getCourseQuestionPapers: (courseId: string) => api.get(`/question-papers/course/${courseId}`),
  
  getQuestionPaperStats: () => api.get('/question-papers/stats'),
};

export default api;