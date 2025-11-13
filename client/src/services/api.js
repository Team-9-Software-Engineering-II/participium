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
      // Sessione scaduta o non valida
      // Non fare redirect se siamo già nella pagina di login, register o home
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
  getSession: () => api.get('/auth/session'), // Verifica sessione attiva
};

// ==================== USERS ====================

export const userAPI = {
  // Ottiene il profilo dell'utente loggato
  getProfile: () => api.get('/users/me'),
  
  // Aggiorna il profilo dell'utente
  updateProfile: (profileData) => api.put('/users/me', profileData),
};

// ==================== REPORTS ====================

export const reportAPI = {
  // Crea una nuova segnalazione
  create: (reportData) => {
    // Invia i dati come JSON con gli URL delle foto già caricate
    return api.post('/reports', {
      title: reportData.title,
      description: reportData.description,
      categoryId: reportData.categoryId,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      anonymous: reportData.anonymous || false,
      photos: reportData.photos || [], // Array di URL
    });
  },
  
  // Lista delle segnalazioni (con filtri opzionali)
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    return api.get(`/reports?${params.toString()}`);
  },
  
  // Dettagli di una segnalazione
  getById: (reportId) => api.get(`/reports/${reportId}`),
  
  // Segnalazioni per la mappa
  getMapData: () => api.get('/reports/map'),
  
  // Download CSV
  downloadCSV: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    return api.get(`/reports/download?${params.toString()}`, {
      responseType: 'blob',
    });
  },
  
  // Invia un messaggio su una segnalazione
  sendMessage: (reportId, message) => 
    api.post(`/reports/${reportId}/messages`, { message }),
};

// ==================== UPLOAD ====================

export const uploadAPI = {
  // Upload singola foto
  uploadPhoto: (photoFile) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    return api.post('/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Upload multiple foto (fino a 3)
  uploadPhotos: (photoFiles) => {
    const formData = new FormData();
    photoFiles.forEach((file) => {
      formData.append('photos', file);
    });
    
    return api.post('/upload/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ==================== STATISTICS ====================

export const statisticsAPI = {
  // Statistiche pubbliche
  getPublic: () => api.get('/statistics/public'),
  
  // Statistiche private (solo admin)
  getPrivate: () => api.get('/statistics/private'),
};

// ==================== STAFF ====================

export const staffAPI = {
  // Segnalazioni assegnate (per staff tecnico)
  getAssignedReports: () => api.get('/staff/reports/assigned'),
  
  // Aggiorna lo stato di una segnalazione
  updateReportStatus: (reportId, statusData) => 
    api.put(`/staff/reports/${reportId}/status`, statusData),
};

// ==================== URP ====================

export const urpAPI = {
  // Segnalazioni in attesa di approvazione
  getReportsForReview: () => api.get('/urp/reports/review'),
  
  // Approva o rifiuta una segnalazione
  reviewReport: (reportId, reviewData) => 
    api.put(`/urp/reports/${reportId}/review`, reviewData),
};

// ==================== ADMIN ====================

export const adminAPI = {
  // Recupera tutti gli utenti per l'area amministrativa
  getUsers: () => api.get('/admin/users'),
  // Recupera i ruoli disponibili per gli utenti municipali
  getRoles: () => api.get('/admin/roles'),
  
  // Crea un nuovo utente municipale
  createUser: (userData) => api.post('/admin/users', userData),
  
  // Assegna un ruolo a un utente
  assignRole: (userId, role) => 
    api.put(`/admin/users/${userId}/role`, { role }),
};

export default api;
