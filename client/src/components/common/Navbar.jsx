import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { User, HelpCircle, Bell, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Mock notifications - will be loaded from API
  const notifications = [];
  const unreadCount = notifications.filter(n => !n.read).length;

  // Logica per determinare se l'utente è un Officer
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isOfficer = roleName && (
    roleName.toLowerCase().includes('municipal') || 
    roleName.toLowerCase().includes('officer')
  );

  // Funzione per ottenere l'etichetta del ruolo formattata
  const getRoleLabel = () => {
    if (!roleName) return '';
    
    switch (roleName) {
      case 'municipal_public_relations_officer':
        return 'MPRO';
      case 'technical_staff':
        return 'Technician';
      default:
        // Fallback: Capitalizza la prima lettera
        return roleName.charAt(0).toUpperCase() + roleName.slice(1);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleDarkMode = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo on the left - Redirect condizionale */}
        <Link to={isOfficer ? "/municipal/dashboard" : "/"} className="flex items-center gap-1 sm:gap-2">
          <img 
            src={theme === 'dark' ? '/mole-logo-white.png' : '/mole-logo-black.png'}
            alt="Participium Logo" 
            className="h-6 sm:h-8 w-auto"
          />
          <div className="text-lg sm:text-2xl font-bold">Participium</div>
        </Link>

        {/* Buttons on the right */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <>
              {/* Notifications dropdown - NASCOSTO per Officer */}
              {!isOfficer && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {/* Badge for unread notifications */}
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80" align="end" forceMount>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm text-primary hover:bg-transparent"
                        asChild
                      >
                        <Link to="/notifications">View all</Link>
                      </Button>
                    </div>

                    {/* Notifications list */}
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.slice(0, 10).map((notification, index) => (
                          <div
                            key={index}
                            className="flex gap-3 px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0 relative"
                          >
                            {/* Avatar/Icon */}
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={notification.avatar} />
                              <AvatarFallback className="bg-primary/10">
                                <Bell className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight mb-1">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {notification.time}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.read && (
                              <div className="absolute top-4 right-4 h-2 w-2 bg-red-500 rounded-full"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Dark mode toggle - visible on mobile only when logged in */}
              <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>

              {/* Settings button - hidden on mobile - NASCOSTO per Officer */}
              {!isOfficer && (
                <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
                  <Link to="/settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              {/* Profile dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.photoUrl} alt={user?.username} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">
                          {user?.firstName} {user?.lastName}
                        </p>
                        {/* Etichetta Ruolo Personalizzata */}
                        <span className="text-xs text-muted-foreground">
                          {getRoleLabel()}
                        </span>
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Voci menu visibili SOLO se NON è officer */}
                  {!isOfficer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>My reports</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/notifications" className="cursor-pointer">
                          <Bell className="mr-2 h-4 w-4" />
                          <span>Notifications</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="cursor-pointer flex items-center gap-2 sm:hidden">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/info" className="cursor-pointer">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          <span>Info</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Login/Register buttons */}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/register">Sign up</Link>
              </Button>

              {/* Info button */}
              <Button variant="ghost" size="icon" asChild>
                <Link to="/info" title="Information">
                  <HelpCircle className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}