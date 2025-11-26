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
  
  // Ottiene i report (Supporta filtri opzionali per future implementazioni)
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    return api.get(`/reports?${params.toString()}`);
  },

  // Aggiunti metodi specifici per Citizen
  getAssigned: () => api.get('/reports/assigned'),
  getByUser: (userId) => api.get(`/reports/user/${userId}`),
  
  getById: (reportId) => api.get(`/reports/${reportId}`),
  
  getMapData: () => api.get('/reports/map'),
  
  // Scarica categorie dal DB (utile per dropdown dinamici)
  getCategories: () => api.get('/reports/categories'),

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
  reviewReport: (reportId, action, rejectionReason = null) => 
    api.put(`/municipal/reports/${reportId}`, { 
      action, 
      rejectionReason 
    }),

  // Rotta specifica backend: PUT /municipal/reports/:reportId/category
  updateReportCategory: (reportId, categoryId) =>
    api.put(`/municipal/reports/${reportId}/category`, { categoryId }),
};

// ==================== STAFF (Technical) ====================
export const staffAPI = {
  // Segnalazioni assegnate (per staff tecnico)
  getAssignedReports: () => api.get('/offices/reports/assigned'),  
  // Aggiorna lo stato di una segnalazione
  updateReportStatus: (reportId, statusData) => 
    api.put(`/staff/reports/${reportId}/status`, statusData),
};

// ==================== STATISTICS ====================
export const statisticsAPI = {
  getPublic: () => api.get('/statistics/public'),
  getPrivate: () => api.get('/statistics/private'),
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
  
  // Rotta corretta per gli uffici tecnici
  getTechnicalOffices: () => api.get('/offices'),
  
  createUser: (userData) => api.post('/admin/users', userData),
  assignRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
};

export default api;