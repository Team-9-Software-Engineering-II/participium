/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useState, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Carica il tema salvato in localStorage, altrimenti usa 'light'
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    // Rimuovi entrambe le classi prima
    document.documentElement.classList.remove('light', 'dark');
    // Aggiungi la classe del tema corrente
    document.documentElement.classList.add(theme);
    // Salva in localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
