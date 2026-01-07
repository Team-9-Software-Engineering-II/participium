import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Check } from 'lucide-react';

/**
 * RoleSwitcher component
 * Allows users with multiple roles to switch between them
 */
export default function RoleSwitcher() {
  const { user, activeRole, switchRole } = useAuth();
  const navigate = useNavigate();

  // Get user roles
  const userRoles = user?.roles || [];

  // Don't show switcher if user has only one role
  if (userRoles.length <= 1) {
    return null;
  }

  // Format role name for display
  const formatRoleName = (role) => {
    if (!role) return '';
    const name = role.name || role;
    
    switch (name) {
      case 'municipal_public_relations_officer':
        return 'Municipal Officer (MPRO)';
      case 'technical_staff': {
        // Mostra ufficio tecnico se disponibile
        if (user?.technicalOffices && user.technicalOffices.length > 0) {
          const officeNames = user.technicalOffices.map(o => o.name).join(', ');
          return `Technical Staff - ${officeNames}`;
        }
        return 'Technical Staff';
      }
      case 'external_maintainer': {
        // Mostra company se disponibile
        if (user?.company) {
          return `External Maintainer - ${user.company.name}`;
        }
        return 'External Maintainer';
      }
      case 'admin':
        return 'Administrator';
      case 'citizen':
        return 'Citizen';
      default:
        // Fallback: format as Title Case
        return name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    }
  };

  // Get home route for a specific role
  const getRoleHomeRoute = (role) => {
    if (!role) return '/';
    const name = role.name || role;
    
    if (name.toLowerCase().includes('municipal') || name.toLowerCase().includes('officer')) {
      return '/municipal/dashboard';
    }
    if (name.toLowerCase().includes('admin')) {
      return '/admin';
    }
    if (name.toLowerCase().includes('technical')) {
      return '/technical/reports/active';
    }
    if (name.toLowerCase().includes('external')) {
      return '/external-maintainer/reports/active';
    }
    if (name.toLowerCase().includes('citizen')) {
      return '/dashboard';
    }
    return '/';
  };

  const handleRoleSwitch = (role) => {
    switchRole(role);
    // Navigate to the appropriate page for the new role
    const homeRoute = getRoleHomeRoute(role);
    navigate(homeRoute);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          title="Switch role"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Switch Role</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
          Your Roles
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {userRoles.map((role) => {
          const isActive = activeRole?.id === role.id;
          
          return (
            <DropdownMenuItem
              key={role.id}
              onClick={() => !isActive && handleRoleSwitch(role)}
              className={`cursor-pointer flex items-center justify-between ${isActive ? 'opacity-100' : ''}`}
            >
              <span 
                className={isActive ? 'font-bold' : 'font-normal'}
                style={{ color: isActive ? 'black' : 'inherit' }}
              >
                {formatRoleName(role)}
              </span>
              {isActive && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
