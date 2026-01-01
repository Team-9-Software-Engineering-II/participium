import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserRound, Eye, EyeOff, Pencil, Trash2, X } from 'lucide-react';
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

const normalizeRole = (role) => extractRoleName(role).trim().toLowerCase();

const isRestrictedRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'citizen';
};

const formatDisplayName = (user) => {
  const composedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (composedName) return composedName;
  return user.username || user.email || `User ${user.id}`;
};

// Determina cosa mostrare nella colonna "Office"
const getOfficeDisplay = (user) => {
  const roleName = extractRoleName(user?.role);
  const normalized = normalizeRole(roleName);

  if (normalized.includes('municipal') || normalized === 'mpro') {
    return 'MPRO';
  }

  if (normalized.includes('technical') || normalized === 'technician') {
    // Mostra il nome dell'ufficio se presente, altrimenti fallback
    return user.technicalOffice?.name || 'Technical Office';
  }

  if (normalized.includes('external') || normalized === 'external_maintainer') {
    // Mostra il nome della company per gli external maintainer
    return user.company?.name || 'External Company';
  }

  return '—';
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
  const [newRoleToAdd, setNewRoleToAdd] = useState('');
  const [editError, setEditError] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete User Dialog States
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Role Dialog States
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await adminAPI.getUsers();
      const list = Array.isArray(data) ? data : [];
      // Filtra via admin e citizen
      const filtered = list.filter((user) => !isRestrictedRole(user?.role));
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

  // Carica Ruoli e Uffici Tecnici quando si apre il dialog
  const fetchDataForDialog = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);
    try {
      const [rolesRes, officesRes] = await Promise.all([
        adminAPI.getRoles(),
        adminAPI.getTechnicalOffices() // Chiama la nuova route /offices
      ]);

      // Processa Ruoli
      const roleList = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      const formattedRoles = roleList
        .map((role) => ({
          id: role?.id ?? role.name,
          name: extractRoleName(role),
        }))
        .filter((role) => role.name && !isRestrictedRole(role.name));
      setRoleOptions(formattedRoles);

      // Processa Uffici
      setTechnicalOffices(Array.isArray(officesRes.data) ? officesRes.data : []);

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
    // Simula ruoli multipli - quando il backend sarà pronto, user.roles sarà un array
    // Per ora usiamo il ruolo singolo come array
    const userRoles = user.roles || (user.role ? [user.role] : []);
    setEditUserRoles(Array.isArray(userRoles) ? userRoles : [userRoles]);
    setNewRoleToAdd('');
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingUser(null);
    setEditUserRoles([]);
    setNewRoleToAdd('');
    setEditError(null);
  };

  const handleAddRoleToUser = () => {
    if (!newRoleToAdd) {
      setEditError('Please select a role to add.');
      return;
    }

    const roleToAdd = roleOptions.find(r => String(r.id) === String(newRoleToAdd));
    if (!roleToAdd) return;

    // Controlla se il ruolo è già assegnato
    const alreadyHasRole = editUserRoles.some(r => 
      normalizeRole(r) === normalizeRole(roleToAdd.name)
    );

    if (alreadyHasRole) {
      setEditError('This role is already assigned to the user.');
      return;
    }

    // Aggiungi il ruolo alla lista
    setEditUserRoles(prev => [...prev, { id: roleToAdd.id, name: roleToAdd.name }]);
    setNewRoleToAdd('');
    setEditError(null);
  };

  const handleRemoveRoleFromUser = (roleToRemove) => {
    if (editUserRoles.length === 1) {
      setEditError('A user must have at least one role.');
      return;
    }
    // Apri dialog di conferma
    setRoleToDelete(roleToRemove);
  };

  const handleCloseDeleteRoleDialog = () => {
    setRoleToDelete(null);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;

    setIsDeletingRole(true);
    try {
      // TODO: Quando il backend sarà pronto, implementare la chiamata API
      // await adminAPI.removeUserRole(editingUser.id, roleToDelete.id);

      // Per ora simula il successo
      console.log('Removing role from user:', {
        userId: editingUser.id,
        role: roleToDelete
      });

      // Simula un delay di rete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Rimuovi il ruolo dalla lista locale
      setEditUserRoles(prev => 
        prev.filter(r => normalizeRole(r) !== normalizeRole(roleToDelete))
      );
      setEditError(null);

      // Mostra toast di successo
      toast.success('Role removed successfully', {
        description: `The role has been removed. The user remains active with other roles.`
      });

      handleCloseDeleteRoleDialog();
    } catch (err) {
      console.error('Failed to remove role', err);
      toast.error('Failed to remove role', {
        description: err.response?.data?.message || 'Please try again.'
      });
    } finally {
      setIsDeletingRole(false);
    }
  };

  const handleSaveUserRoles = async () => {
    if (editUserRoles.length === 0) {
      setEditError('A user must have at least one role.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      // TODO: Quando il backend sarà pronto, implementare la chiamata API
      // const roleIds = editUserRoles.map(r => typeof r === 'object' ? r.id : r);
      // await adminAPI.updateUserRoles(editingUser.id, { roleIds });

      // Per ora simula il successo
      console.log('Updating user roles:', {
        userId: editingUser.id,
        roles: editUserRoles
      });

      // Simula un delay di rete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mostra toast di successo
      toast.success('User roles updated successfully', {
        description: `Roles for ${formatDisplayName(editingUser)} have been updated.`
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
  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
  };

  const handleCloseDeleteDialog = () => {
    setUserToDelete(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // TODO: Quando il backend sarà pronto, implementare la chiamata API
      // await adminAPI.deleteUser(userToDelete.id);

      // Per ora simula il successo
      console.log('Deleting user:', userToDelete.id);

      // Simula un delay di rete
      await new Promise(resolve => setTimeout(resolve, 500));

      const deletedUserName = formatDisplayName(userToDelete);

      // Aggiorna la lista utenti rimuovendo l'utente localmente
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      // Mostra toast di successo
      toast.success('User deleted successfully', {
        description: `${deletedUserName} and all associated roles have been permanently removed.`
      });

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
      const haystack = [
        formatDisplayName(user),
        user.email,
        user.username,
        extractRoleName(user?.role),
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

    return displayedUsers.map((user) => (
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
          {extractRoleName(user?.role)}
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
    ));
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
                    return (
                      <div
                        key={roleId || roleName}
                        className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                        data-cy="assigned-role-item"
                      >
                        <span className="text-sm font-medium">{roleName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveRoleFromUser(role)}
                          disabled={editUserRoles.length === 1 || isEditSubmitting}
                          data-cy="remove-role-button"
                          title="Remove role"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
                  onValueChange={setNewRoleToAdd}
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
              disabled={isEditSubmitting || editUserRoles.length === 0}
              data-cy="save-roles"
            >
              {isEditSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => {
        if (!open) handleCloseDeleteRoleDialog();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove role from user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the role <strong>{roleToDelete ? extractRoleName(roleToDelete) : ''}</strong> from this user?
              <br/><br/>
              The user will remain active and functional with their other assigned roles. Only this specific role will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRole} data-cy="cancel-delete-role">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRole}
              disabled={isDeletingRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-cy="confirm-delete-role"
            >
              {isDeletingRole ? 'Removing...' : 'Remove role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}