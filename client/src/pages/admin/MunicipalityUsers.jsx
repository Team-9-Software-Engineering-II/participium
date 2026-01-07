import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserRound, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Helper Functions ---

const extractRoleName = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    return role.name ?? role.label ?? '';
  }
  return '';
};

const extractRoleNames = (roles) => {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles.map(r => extractRoleName(r));
  return [extractRoleName(roles)];
};

const normalizeRole = (role) => extractRoleName(role).trim().toLowerCase();

const isRestrictedRole = (roles) => {
  const roleNames = extractRoleNames(roles);
  return roleNames.some(roleName => {
    const normalized = normalizeRole(roleName);
    return normalized === 'admin' || normalized === 'citizen';
  });
};

const formatDisplayName = (user) => {
  const composedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (composedName) return composedName;
  return user.username || user.email || `User ${user.id}`;
};

// Determina cosa mostrare nella colonna "Office"
const getOfficeDisplay = (user) => {
  const roleNames = extractRoleNames(user?.roles);
  const offices = [];
  
  // Check if user has municipal/mpro role
  const hasMunicipalRole = roleNames.some(name => {
    const normalized = normalizeRole(name);
    return normalized.includes('municipal') || normalized === 'mpro';
  });
  if (hasMunicipalRole) {
    offices.push('MPRO');
  }

  // Check if user has technical role
  const hasTechnicalRole = roleNames.some(name => {
    const normalized = normalizeRole(name);
    return normalized.includes('technical') || normalized === 'technician';
  });
  if (hasTechnicalRole) {
    // Show all technical offices - use office.name directly
    if (user.technicalOffices && user.technicalOffices.length > 0) {
      user.technicalOffices.forEach(office => {
        offices.push(office.name);
      });
    } else {
      // Fallback: prova a usare il nome dalla categoria se presente
      offices.push('Technical Office (not assigned)');
    }
  }

  // Check if user has external maintainer role
  const hasExternalRole = roleNames.some(name => {
    const normalized = normalizeRole(name);
    return normalized.includes('external') || normalized === 'external_maintainer';
  });
  if (hasExternalRole) {
    // Show company name for external maintainer
    offices.push(user.company?.name || 'External Company');
  }

  return offices.length > 0 ? offices.join(', ') : '—';
};

export default function MunicipalityUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog & Form States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [technicalOffices, setTechnicalOffices] = useState([]); // Stato per gli uffici
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    roleId: '',
    technicalOfficeId: '', // Nuovo campo per l'ufficio
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit User Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserRoles, setEditUserRoles] = useState([]); // Array di ruoli assegnati all'utente
  const [originalUserRoles, setOriginalUserRoles] = useState([]); // Ruoli originali per confronto
  const [newRoleToAdd, setNewRoleToAdd] = useState('');
  const [newRoleTechnicalOfficeId, setNewRoleTechnicalOfficeId] = useState('');
  const [newRoleCompanyId, setNewRoleCompanyId] = useState('');
  const [editError, setEditError] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Delete User Dialog States
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState(null);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getUsers();
      const list = Array.isArray(data) ? data : [];
      // Filter out citizens and admins
      const filtered = list.filter((user) => !isRestrictedRole(user?.roles));
      setUsers(filtered);
    } catch (err) {
      console.error('Failed to fetch municipality users', err);
      setError('Unable to load municipality users right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Carica Ruoli, Uffici Tecnici e Companies quando si apre il dialog
  const fetchDataForDialog = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);
    try {
      const promises = [
        adminAPI.getRoles(),
        adminAPI.getTechnicalOffices(),
        // Add companies with fallback to empty array on error
        adminAPI.getCompanies().catch((err) => {
          console.warn('Companies endpoint not available:', err.message || err);
          return { data: [] };
        })
      ];

      const results = await Promise.all(promises);
      const [rolesRes, officesRes, companiesRes] = results;

      // Processa Ruoli
      const roleList = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      const formattedRoles = roleList
        .map((role) => ({
          id: role?.id ?? role.name,
          name: extractRoleName(role),
        }))
        .filter((role) => role.name && !isRestrictedRole([role.name]));
      setRoleOptions(formattedRoles);

      // Processa Uffici
      setTechnicalOffices(Array.isArray(officesRes.data) ? officesRes.data : []);

      // Processa Companies
      setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);

    } catch (err) {
      console.error('Failed to load form data', err);
      setRolesError('Unable to load roles or offices.');
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carica i dati quando si apre uno dei due dialog (creazione o modifica)
    if (!isAddDialogOpen && !isEditDialogOpen) return;
    if (roleOptions.length > 0) return; 
    fetchDataForDialog();
  }, [isAddDialogOpen, isEditDialogOpen, roleOptions.length, fetchDataForDialog]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleDialogChange = (open) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setFormValues({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        roleId: '',
        technicalOfficeId: '',
      });
      setFormError(null);
      setRolesError(null);
    }
  };

  const handleFormChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Logica condizionale: verifica se il ruolo selezionato è Technical Staff
  const isTechnicalStaffSelected = useMemo(() => {
    if (!formValues.roleId) return false;
    const selectedRole = roleOptions.find(r => String(r.id) === String(formValues.roleId));
    // Controlla il nome del ruolo (case insensitive e parziale per sicurezza)
    return selectedRole?.name.toLowerCase().includes('technical_staff');
  }, [formValues.roleId, roleOptions]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError(null);

    const requiredFields = ['firstName', 'lastName', 'email', 'username', 'password', 'roleId'];
    const missing = requiredFields.filter((field) => !formValues[field]?.trim());

    // Controllo specifico: se è Technical Staff, deve avere un ufficio selezionato
    if (isTechnicalStaffSelected && !formValues.technicalOfficeId) {
      setFormError('Please select a Technical Office for the technical staff.');
      return;
    }

    if (missing.length > 0) {
      setFormError('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Costruiamo l'oggetto base con i dati comuni
      const payload = {
        email: formValues.email.trim(),
        username: formValues.username.trim(),
        password: formValues.password,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        roleId: Number(formValues.roleId),
      };

      // 2. Aggiungiamo technicalOfficeId SOLO se il ruolo è effettivamente tecnico.
      // Per i Municipal Officer questo blocco viene saltato, evitando l'errore 400.
      if (isTechnicalStaffSelected) {
        payload.technicalOfficeId = Number(formValues.technicalOfficeId);
      }

      await adminAPI.createUser(payload);

      await fetchUsers();
      handleDialogChange(false);
    } catch (err) {
      console.error('Failed to create municipality user', err);
      setFormError(
        err.response?.data?.message ||
          'Unable to create the user right now. Please review the data and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funzioni per Edit User
  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    // Use roles array from backend
    const userRoles = user.roles || [];
    const normalizedRoles = Array.isArray(userRoles) ? userRoles : [userRoles];
    setEditUserRoles(normalizedRoles);
    setOriginalUserRoles(normalizedRoles);
    setNewRoleToAdd('');
    setNewRoleTechnicalOfficeId('');
    setNewRoleCompanyId('');
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingUser(null);
    setEditUserRoles([]);
    setOriginalUserRoles([]);
    setNewRoleToAdd('');
    setNewRoleTechnicalOfficeId('');
    setNewRoleCompanyId('');
    setEditError(null);
  };

  const handleAddRoleToUser = () => {
    if (!newRoleToAdd) {
      setEditError('Please select a role to add.');
      return;
    }

    const roleToAdd = roleOptions.find(r => String(r.id) === String(newRoleToAdd));
    if (!roleToAdd) return;

    const roleName = roleToAdd.name.toLowerCase();
    const isTechnicalRole = roleName.includes('technical_staff') || roleName.includes('technician');
    const isExternalRole = roleName.includes('external_maintainer') || roleName.includes('external');

    // Validazione ufficio tecnico
    if (isTechnicalRole && !newRoleTechnicalOfficeId) {
      setEditError('Please select a Technical Office for this role.');
      return;
    }

    // Validazione company
    if (isExternalRole && !newRoleCompanyId) {
      setEditError('Please select a Company for this role.');
      return;
    }

    // Controlla se il ruolo è già assegnato
    // Per technical_staff e external_maintainer, verifica anche l'ufficio/company
    const alreadyHasRole = editUserRoles.some(r => {
      const sameRoleName = normalizeRole(r) === normalizeRole(roleToAdd.name);
      if (!sameRoleName) return false;
      
      // Se è technical role, controlla se ha lo stesso ufficio
      if (isTechnicalRole) {
        const existingOfficeId = typeof r === 'object' ? r.technicalOfficeId : null;
        return existingOfficeId && existingOfficeId === Number(newRoleTechnicalOfficeId);
      }
      
      // Se è external role, controlla se ha la stessa company
      if (isExternalRole) {
        const existingCompanyId = typeof r === 'object' ? r.companyId : null;
        return existingCompanyId && existingCompanyId === Number(newRoleCompanyId);
      }
      
      // Per altri ruoli, basta verificare il nome
      return true;
    });

    if (alreadyHasRole) {
      if (isTechnicalRole) {
        setEditError('This user already has this technical role for the selected office.');
      } else if (isExternalRole) {
        setEditError('This user already has this external role for the selected company.');
      } else {
        setEditError('This role is already assigned to the user.');
      }
      return;
    }

    // Aggiungi il ruolo alla lista con le informazioni aggiuntive
    const newRole = { 
      id: roleToAdd.id, 
      name: roleToAdd.name 
    };

    if (isTechnicalRole) {
      newRole.technicalOfficeId = Number(newRoleTechnicalOfficeId);
    }
    if (isExternalRole) {
      newRole.companyId = Number(newRoleCompanyId);
    }

    setEditUserRoles(prev => [...prev, newRole]);
    setNewRoleToAdd('');
    setNewRoleTechnicalOfficeId('');
    setNewRoleCompanyId('');
    setEditError(null);
  };

  // Verifica se ci sono modifiche ai ruoli
  const hasRoleChanges = useMemo(() => {
    if (editUserRoles.length !== originalUserRoles.length) return true;
    
    // Confronta i ruoli normalizzati
    const currentRoleNames = editUserRoles.map(r => normalizeRole(r)).sort((a, b) => a.localeCompare(b));
    const originalRoleNames = originalUserRoles.map(r => normalizeRole(r)).sort((a, b) => a.localeCompare(b));
    
    return !currentRoleNames.every((role, index) => role === originalRoleNames[index]);
  }, [editUserRoles, originalUserRoles]);

  const handleSaveUserRoles = async () => {
    if (editUserRoles.length === 0) {
      setEditError('A user must have at least one role.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      // Format roles with their associations
      const roles = editUserRoles.map(role => {
        const roleData = { roleId: typeof role === 'object' ? role.id : role };
        
        // Add technical office association if present
        if (typeof role === 'object' && role.technicalOfficeId) {
          roleData.technicalOfficeIds = [role.technicalOfficeId];
        }
        
        // Add company association if present
        if (typeof role === 'object' && role.companyId) {
          roleData.companyId = role.companyId;
        }
        
        return roleData;
      });

      await adminAPI.updateUserRoles(editingUser.id, roles);

      toast.success('User roles updated successfully', {
        description: `Roles for ${formatDisplayName(editingUser)} have been updated.`,
        style: {
          color: 'black',
        },
        descriptionClassName: 'text-black dark:text-white'
      });

      // Aggiorna la lista utenti
      await fetchUsers();
      handleCloseEditDialog();
    } catch (err) {
      console.error('Failed to update user roles', err);
      setEditError(
        err.response?.data?.message ||
          'Unable to update user roles. Please try again.'
      );
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Funzioni per Delete User
  const handleOpenDeleteDialog = async (user) => {
    // Check if user can be deleted before showing dialog
    try {
      const { data } = await adminAPI.checkUserDeletion(user.id);
      
      if (!data.canDelete) {
        // Show error dialog instead of delete confirmation
        setDeletionError({
          user,
          message: data.message,
          activeReportsCount: data.activeReportsCount
        });
        return;
      }
      
      // User can be deleted, show confirmation dialog
      setUserToDelete(user);
    } catch (error) {
      console.error('Error checking user deletion:', error);
      setDeletionError({
        user,
        message: error.response?.data?.message || 'Failed to check if user can be deleted',
        activeReportsCount: 0
      });
    }
  };

  const handleCloseDeleteDialog = () => {
    setUserToDelete(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await adminAPI.deleteUser(userToDelete.id);

      const deletedUserName = formatDisplayName(userToDelete);

      toast.success('User deleted successfully', {
        description: `${deletedUserName} and all associated roles have been permanently removed.`
      });

      // Aggiorna la lista utenti
      await fetchUsers();
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Failed to delete user', err);
      toast.error('Failed to delete user', {
        description: err.response?.data?.message || 'Unable to delete user. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const roleNames = extractRoleNames(user?.roles).join(' ');
      const haystack = [
        formatDisplayName(user),
        user.email,
        user.username,
        roleNames,
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }, [users, searchTerm]);

  const renderTableBody = () => {
    if (isLoading) {
      return [
        <tr key="loading">
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading municipality users...
          </td>
        </tr>
      ];
    }

    if (displayedUsers.length === 0) {
      return [
        <tr key="empty">
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
            No municipality users found matching your criteria.
          </td>
        </tr>
      ];
    }

    return displayedUsers.map((user) => {
      const roleNames = extractRoleNames(user?.roles);
      const rolesDisplay = roleNames.length > 0 ? roleNames.join(', ') : '—';
      
      return (
      <tr key={user.id} className="transition hover:bg-background/80">
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-sm font-semibold text-muted-foreground">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{formatDisplayName(user)}</p>
              <p className="text-xs text-muted-foreground">
                {user.email || user.username || `ID: ${user.id}`}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-muted-foreground">
          {rolesDisplay}
        </td>
        {/* Cella Office con logica di visualizzazione */}
        <td className="px-4 py-4 text-muted-foreground font-medium">
          {getOfficeDisplay(user)}
        </td>
        {/* Cella Actions */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => handleOpenEditDialog(user)}
              data-cy="edit-user-button"
              title="Edit user"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleOpenDeleteDialog(user)}
              data-cy="delete-user-button"
              title="Delete user"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );});
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
            Team management
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Municipality users</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Review, search and update municipal staff accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button
                data-cy="open-create-user"
                type="button"
                variant="outline"
                className="inline-flex items-center gap-2 border border-primary/40 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add municipality user</DialogTitle>
                <DialogDescription>
                  Provide the account details. All fields are mandatory.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-5" onSubmit={handleCreateUser} data-cy="create-user-modal">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      data-cy="first-name"
                      id="firstName"
                      autoComplete="given-name"
                      value={formValues.firstName}
                      onChange={handleFormChange('firstName')}
                      placeholder="Alex"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      data-cy="last-name"
                      id="lastName"
                      autoComplete="family-name"
                      value={formValues.lastName}
                      onChange={handleFormChange('lastName')}
                      placeholder="Bianchi"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      data-cy="email"
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={formValues.email}
                      onChange={handleFormChange('email')}
                      placeholder="alex.bianchi@participium.gov"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      data-cy="username"
                      id="username"
                      autoComplete="username"
                      value={formValues.username}
                      onChange={handleFormChange('username')}
                      placeholder="alex.bianchi"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary password</Label>
                  <div className="relative">
                  <Input
                    data-cy="password"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formValues.password}
                    onChange={handleFormChange('password')}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    data-cy="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  </div>
                </div>
                
                {/* Selezione Ruolo */}
                <div className="space-y-2">
                  <Label htmlFor="roleId">Role</Label>
                  <Select
                    value={formValues.roleId}
                    onValueChange={handleFormChange('roleId')}
                    disabled={isRolesLoading || !!rolesError}
                  >
                    <SelectTrigger id="roleId" data-cy="select-role">
                      <SelectValue
                        placeholder={(() => {
                          if (isRolesLoading) return 'Loading roles…';
                          if (rolesError) return 'Roles unavailable';
                          return 'Select a role';
                        })()}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)} data-cy="role">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selezione Ufficio Tecnico (Condizionale) */}
                {isTechnicalStaffSelected && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="technicalOfficeId">Technical Office</Label>
                    <Select
                      value={formValues.technicalOfficeId}
                      onValueChange={handleFormChange('technicalOfficeId')}
                    >
                      <SelectTrigger id="technicalOfficeId" data-cy="select-office">
                        <SelectValue placeholder="Select an office" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicalOffices.map((office) => (
                          <SelectItem key={office.id} value={String(office.id)}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formError && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {formError}
                  </div>
                )}
                <DialogFooter className="pt-2">
                  <DialogClose asChild>
                    <Button data-cy="cancel" type="button" variant="ghost" disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button data-cy="submit" type="submit" disabled={isSubmitting || isRolesLoading}>
                    {isSubmitting ? 'Creating...' : 'Create user'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              data-cy="search-users"
              type="search"
              placeholder="Search users"
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow-sm sm:max-w-xs">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-background/80 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  User
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Role
                </th>
                {/* Nuova Colonna Office */}
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Office
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card/60">
              {renderTableBody()}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseEditDialog();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit user roles</DialogTitle>
            <DialogDescription>
              Manage roles for {editingUser ? formatDisplayName(editingUser) : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Mostra info utente */}
            {editingUser && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-medium">{formatDisplayName(editingUser)}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                <p className="text-xs text-muted-foreground">@{editingUser.username}</p>
              </div>
            )}

            {/* Lista ruoli attuali */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Current roles</Label>
              <div className="space-y-2">
                {editUserRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No roles assigned</p>
                ) : (
                  editUserRoles.map((role) => {
                    const roleName = extractRoleName(role);
                    const roleId = typeof role === 'object' ? role.id : role;
                    
                    // Determina informazioni aggiuntive (ufficio/company)
                    let additionalInfo = null;
                    if (typeof role === 'object') {
                      if (role.technicalOfficeId) {
                        const office = technicalOffices.find(o => o.id === role.technicalOfficeId);
                        additionalInfo = office ? ` • ${office.name}` : ' • Office';
                      } else if (role.companyId) {
                        const company = companies.find(c => c.id === role.companyId);
                        additionalInfo = company ? ` • ${company.name}` : ' • Company';
                      }
                    }
                    
                    return (
                      <div
                        key={roleId || roleName}
                        className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                        data-cy="assigned-role-item"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{roleName}</span>
                          {additionalInfo && (
                            <span className="text-xs text-muted-foreground">{additionalInfo}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Aggiungi nuovo ruolo */}
            <div className="space-y-2">
              <Label htmlFor="newRole" className="text-sm font-semibold">Add new role</Label>
              <div className="flex gap-2">
                <Select
                  value={newRoleToAdd}
                  onValueChange={(value) => {
                    setNewRoleToAdd(value);
                    setNewRoleTechnicalOfficeId('');
                    setNewRoleCompanyId('');
                    setEditError(null);
                  }}
                  disabled={isRolesLoading || !!rolesError}
                >
                  <SelectTrigger id="newRole" data-cy="select-new-role" className="flex-1">
                    <SelectValue
                      placeholder={(() => {
                        if (isRolesLoading) return 'Loading roles…';
                        if (rolesError) return 'Roles unavailable';
                        return 'Select a role to add';
                      })()}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)} data-cy="new-role-option">
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRoleToUser}
                  disabled={!newRoleToAdd || isRolesLoading}
                  data-cy="add-role-button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Campo condizionale per Technical Office */}
              {(() => {
                if (!newRoleToAdd) return null;
                const selectedRole = roleOptions.find(r => String(r.id) === String(newRoleToAdd));
                const roleName = selectedRole?.name.toLowerCase() || '';
                const isTechnicalRole = roleName.includes('technical_staff') || roleName.includes('technician');
                
                if (!isTechnicalRole) return null;

                return (
                  <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="newRoleTechnicalOffice">Technical Office</Label>
                    <Select
                      value={newRoleTechnicalOfficeId}
                      onValueChange={setNewRoleTechnicalOfficeId}
                    >
                      <SelectTrigger id="newRoleTechnicalOffice" data-cy="select-new-role-office">
                        <SelectValue placeholder="Select an office" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicalOffices.map((office) => (
                          <SelectItem key={office.id} value={String(office.id)}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              {/* Campo condizionale per Company */}
              {(() => {
                if (!newRoleToAdd) return null;
                const selectedRole = roleOptions.find(r => String(r.id) === String(newRoleToAdd));
                const roleName = selectedRole?.name.toLowerCase() || '';
                const isExternalRole = roleName.includes('external_maintainer') || roleName.includes('external');
                
                if (!isExternalRole) return null;

                return (
                  <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="newRoleCompany">Company</Label>
                    <Select
                      value={newRoleCompanyId}
                      onValueChange={setNewRoleCompanyId}
                    >
                      <SelectTrigger id="newRoleCompany" data-cy="select-new-role-company">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
            </div>

            {editError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {editError}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isEditSubmitting} data-cy="cancel-edit">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSaveUserRoles}
              disabled={isEditSubmitting || editUserRoles.length === 0 || !hasRoleChanges}
              data-cy="save-roles"
            >
              {isEditSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => {
        if (!open) handleCloseDeleteDialog();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{userToDelete ? formatDisplayName(userToDelete) : ''}</strong>?
              <br/><br/>
              <span className="text-destructive font-medium">
                This action will remove the user account and all their associated roles permanently.
              </span>
              <br/>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} data-cy="cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-cy="confirm-delete"
            >
              {isDeleting ? 'Deleting...' : 'Delete user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Error Dialog */}
      <AlertDialog open={!!deletionError} onOpenChange={(open) => {
        if (!open) setDeletionError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete user</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletionError ? formatDisplayName(deletionError.user) : ''}</strong> cannot be deleted at this time.
              <br/><br/>
              {deletionError?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletionError(null)}>
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}