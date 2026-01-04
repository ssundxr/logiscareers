import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          // Validate response before storing
          if (response.data?.access) {
            localStorage.setItem('accessToken', response.data.access);
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          // Allow current request to fail, let component handle redirect
          return Promise.reject(new Error('Session expired. Please login again.'));
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API Services
export const authService = {
  login: (username, password) => api.post('/auth/token/', { username, password }),
  register: (data) => api.post('/accounts/users/', data),
  getProfile: () => api.get('/accounts/users/me/'),
  updateProfile: (data) => api.put('/accounts/users/update_profile/', data),
};

export const jobService = {
  // Admin endpoints
  getAll: (params) => api.get('/jobs/manage/', { params }),
  getById: (id) => api.get(`/jobs/manage/${id}/`),
  create: (data) => api.post('/jobs/manage/', data),
  update: (id, data) => api.put(`/jobs/manage/${id}/`, data),
  delete: (id) => api.delete(`/jobs/manage/${id}/`),
  activate: (id) => api.post(`/jobs/manage/${id}/activate/`),
  close: (id) => api.post(`/jobs/manage/${id}/close/`),
  getStats: () => api.get('/jobs/manage/stats/'),
  
  // Public endpoints (for candidates)
  getPublicJobs: (params) => api.get('/jobs/public/', { params }),
  getPublicJob: (id) => api.get(`/jobs/public/${id}/`),
};

export const candidateService = {
  // Admin endpoints
  getAll: (params) => api.get('/candidates/profiles/', { params }),
  getById: (id) => api.get(`/candidates/profiles/${id}/`),
  getFullProfile: (id) => api.get(`/candidates/profiles/${id}/full_profile/`),
  
  // Candidate endpoints
  getMyProfile: () => api.get('/candidates/my-profile/me/'),
  createProfile: (data) => api.post('/candidates/my-profile/create_profile/', data),
  updateMyProfile: (data) => api.patch('/candidates/my-profile/update_profile/', data),
  
  // Resume upload
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append('cv_file', file);
    return api.post('/candidates/my-profile/upload-resume/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Photo upload
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post('/candidates/my-profile/upload-photo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const applicationService = {
  // Admin endpoints
  getAll: (params) => api.get('/candidates/applications/', { params }),
  getById: (id) => api.get(`/candidates/applications/${id}/`),
  updateStatus: (id, status) => api.post(`/candidates/applications/${id}/update_status/`, { status }),
  
  // Candidate endpoints
  getMyApplications: () => api.get('/candidates/my-applications/list_applications/'),
  apply: (data) => api.post('/candidates/my-applications/apply/', data),
  withdraw: (id) => api.post(`/candidates/my-applications/${id}/withdraw/`),
};

export const assessmentService = {
  evaluate: (candidateId, jobId) => api.post('/assessments/evaluate/', {
    candidate_id: candidateId,
    job_id: jobId,
  }),
  evaluateApplication: (applicationId) => api.post('/assessments/evaluate_application/', {
    application_id: applicationId,
  }),
  batchEvaluate: (jobId, applicationIds) => api.post('/assessments/batch_evaluate/', {
    job_id: jobId,
    application_ids: applicationIds,
  }),
  getAssessment: (applicationId) => api.get('/assessments/get_assessment/', {
    params: { application_id: applicationId },
  }),
  getStatus: () => api.get('/assessments/status/'),
};
