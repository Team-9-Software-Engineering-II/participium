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
        <div className="absolute bottom-0 left-0 opacity-25 translate-y-16">
          <img 
            src="/mole-login.png" 
            alt="Mole Antonelliana" 
            className="h-[120vh] w-auto object-contain origin-bottom-left" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-7xl font-bold mb-6 tracking-tight">
            Participium
          </h1>
          <p className="text-xl text-neutral-300 dark:text-neutral-400 leading-relaxed">
            La tua voce conta.
          </p>

          <div className="w-24 h-[2px] bg-neutral-600 dark:bg-neutral-700 my-4"></div>

          <p className="text-l text-neutral-400 dark:text-neutral-500 leading-relaxed">
            Segnala problemi nella tua città, monitora i progressi 
            e contribuisci a rendere Torino un posto migliore per tutti.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex flex-col bg-background relative">
        {/* Header with Back button (left) and Login/Register toggle (right) */}
        <div className="flex justify-between items-center p-6">
          {/* Back to Participium button */}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Torna a Participium</span>
            </Link>
          </Button>

          {/* Login/Register toggle */}
          {isLogin ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Non hai un account?
              </span>
              <Button asChild variant="outline">
                <Link to="/register">Registrati</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Hai già un account?
              </span>
              <Button asChild variant="outline">
                <Link to="/login">Login</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>

        {/* Dark/Light Mode Toggle - Bottom Right */}
        <div className="absolute bottom-6 right-6">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleTheme}
            className="rounded-full shadow-lg h-16 w-16"
          >
            {theme === 'light' ? (
              <Moon style={{ width: '26px', height: '26px' }} />
            ) : (
              <Sun style={{ width: '26px', height: '26px' }} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
