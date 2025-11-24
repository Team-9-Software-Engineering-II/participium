import axios from 'axios';

// Configura l'URL base dell'API
const API_BASE_URL = 'http://localhost:3000';

// Crea un'istanza di axios con configurazione di base
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per gestire errori di autenticazione
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getSession: () => api.get('/auth/session'),
};

// ==================== USERS ====================
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (profileData) => api.put('/users/me', profileData),
};

// ==================== REPORTS ====================
export const reportAPI = {
  create: (reportData) => {
    return api.post('/reports', {
      title: reportData.title,
      description: reportData.description,
      categoryId: reportData.categoryId,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      anonymous: reportData.anonymous || false,
      photos: reportData.photos || [],
    });
  },
  
  // Ottiene TUTTI i report (Endpoint pubblico usato per filtri custom lato officer)
  getAll: () => api.get('/reports'),
  
  getById: (reportId) => api.get(`/reports/${reportId}`),
  
  getMapData: () => api.get('/reports/map'), // Assumendo esista o fallback su getAll
  
  downloadCSV: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/reports/download?${params.toString()}`, {
      responseType: 'blob',
    });
  },
  
  sendMessage: (reportId, message) => 
    api.post(`/reports/${reportId}/messages`, { message }),
};

// ==================== MUNICIPAL (Officer) ====================
export const urpAPI = {
  // Rotta specifica backend: GET /municipal/reports/pending
  getPendingReports: () => api.get('/municipal/reports/pending'),

  // Rotta specifica backend: PUT /municipal/reports/:reportId
  // Payload atteso dal controller: { action: 'assigned' | 'rejected', rejectionReason?: string }
  reviewReport: (reportId, action, rejectionReason = null) => 
    api.put(`/municipal/reports/${reportId}`, { 
      action, 
      rejectionReason 
    }),

  // Rotta specifica backend: PUT /municipal/reports/:reportId/category
  updateReportCategory: (reportId, categoryId) =>
    api.put(`/municipal/reports/${reportId}/category`, { categoryId }),
};

// ==================== UPLOAD ====================
export const uploadAPI = {
  uploadPhoto: (photoFile) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return api.post('/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadPhotos: (photoFiles) => {
    const formData = new FormData();
    photoFiles.forEach((file) => {
      formData.append('photos', file);
    });
    return api.post('/upload/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== ADMIN ====================
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getRoles: () => api.get('/admin/roles'),
  createUser: (userData) => api.post('/admin/users', userData),
  assignRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
};

export default api;