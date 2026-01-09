/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  const [activeRole, setActiveRole] = useState(null);

  // Helper function to set default role
  const setDefaultRole = (userRoles) => {
    const firstRole = userRoles?.[0];
    setActiveRole(firstRole);
    if (firstRole) {
      localStorage.setItem('activeRole', JSON.stringify(firstRole));
    }
  };

  // Helper function to restore saved role
  const restoreSavedRole = (userRoles) => {
    const savedActiveRole = localStorage.getItem('activeRole');
    if (!savedActiveRole) {
      setDefaultRole(userRoles);
      return;
    }

    try {
      const parsedRole = JSON.parse(savedActiveRole);
      const isValidRole = userRoles.some(r => r.id === parsedRole.id);
      
      if (isValidRole) {
        setActiveRole(parsedRole);
      } else {
        setDefaultRole(userRoles);
      }
    } catch (e) {
      console.warn('Failed to parse saved active role:', e);
      setDefaultRole(userRoles);
    }
  };

  // Verifica la sessione all'avvio
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authAPI.getSession();
        if (response.data.authenticated) {
          setUser(response.data.user);
          const userRoles = response.data.user.roles || [];
          restoreSavedRole(userRoles);
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
        // NON impostiamo automaticamente il ruolo qui
        // Sarà gestito dalla pagina di login o dalla selezione ruolo
      }
      
      return { success: true, user: response.data.user };
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
      setActiveRole(null);
      localStorage.removeItem('activeRole');
    } catch (error) {
      console.error('Errore durante il logout:', error);
      // Logout locale anche in caso di errore
      setUser(null);
      setActiveRole(null);
      localStorage.removeItem('activeRole');
    }
  };

  // Registrazione
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // Login automatico dopo registrazione
      if (response.data.authenticated) {
        setUser(response.data.user);
        setDefaultRole(response.data.user.roles);
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

  // Switch active role
  const switchRole = (role) => {
    setActiveRole(role);
    localStorage.setItem('activeRole', JSON.stringify(role));
  };

  // Select initial role after login
  const selectInitialRole = (role) => {
    setActiveRole(role);
    localStorage.setItem('activeRole', JSON.stringify(role));
  };

  const value = useMemo(() => ({
    user,
    loading,
    activeRole,
    login,
    logout,
    register,
    updateProfile,
    switchRole,
    selectInitialRole,
    isAuthenticated: !!user,
  }), [user, loading, activeRole, login, logout, register, updateProfile, switchRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
