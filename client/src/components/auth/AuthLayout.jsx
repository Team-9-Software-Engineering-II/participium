/* eslint-disable react/prop-types */
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthLayout({ children }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isLogin = location.pathname === '/login';

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-col lg:justify-center lg:px-16 bg-neutral-900 dark:bg-neutral-950 text-white relative overflow-hidden">
        {/* Background Logo - Mole Antonelliana */}
        <div className="absolute inset-0">
          <img 
            src="/mole-login.png" 
            alt="Mole Antonelliana" 
            className="w-full h-full object-cover opacity-25" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-7xl font-bold mb-6 tracking-tight">
            Participium
          </h1>
          <p className="text-xl text-neutral-300 dark:text-neutral-400 leading-relaxed">
            Your voice matters.
          </p>

          <div className="w-24 h-[2px] bg-neutral-600 dark:bg-neutral-700 my-4"></div>

          <p className="text-l text-neutral-400 dark:text-neutral-500 leading-relaxed">
            Report problems in your city, monitor progress 
            and contribute to making Turin a better place for everyone.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex flex-col bg-background relative min-h-screen lg:min-h-0">
        {/* Header with Back button (left) and Login/Register toggle (right) */}
        <div className="flex justify-between items-center p-4 sm:p-6">
          {/* Back to Participium button */}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Participium</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          {/* Login/Register toggle */}
          {isLogin ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                Don't have an account?
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                Already have an account?
              </span>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>

        {/* Dark/Light Mode Toggle - Bottom Right */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleTheme}
            className="rounded-full shadow-lg h-14 w-14 sm:h-16 sm:w-16"
          >
            {theme === 'light' ? (
              <Moon style={{ width: '24px', height: '24px' }} className="sm:w-[26px] sm:h-[26px]" />
            ) : (
              <Sun style={{ width: '24px', height: '24px' }} className="sm:w-[26px] sm:h-[26px]" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
