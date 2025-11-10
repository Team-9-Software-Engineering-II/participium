import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verifica la sessione all'avvio
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authAPI.getSession();
        if (response.data.authenticated) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Errore verifica sessione:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Login
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      // La risposta contiene { authenticated: true, user: {...} }
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Errore durante il login:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Errore durante il login' 
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Errore durante il logout:', error);
      // Logout locale anche in caso di errore
      setUser(null);
    }
  };

  // Registrazione
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // Login automatico dopo registrazione
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Errore durante la registrazione' 
      };
    }
  };

  // Aggiorna il profilo
  const updateProfile = async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Errore durante l\'aggiornamento del profilo:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Errore durante l\'aggiornamento' 
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
