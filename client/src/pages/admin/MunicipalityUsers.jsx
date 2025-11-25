import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserRound, Eye, EyeOff } from 'lucide-react';
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
    if (!isAddDialogOpen) return;
    if (roleOptions.length > 0) return; 
    fetchDataForDialog();
  }, [isAddDialogOpen, roleOptions.length, fetchDataForDialog]);

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
    return selectedRole && selectedRole.name.toLowerCase().includes('technical_staff');
  }, [formValues.roleId, roleOptions]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError(null);

    const requiredFields = ['firstName', 'lastName', 'email', 'username', 'password', 'roleId'];
    const missing = requiredFields.filter((field) => !formValues[field]?.trim());

    // Validazione extra
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
      const payload = {
        email: formValues.email.trim(),
        username: formValues.username.trim(),
        password: formValues.password,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        roleId: Number(formValues.roleId),
      };

      if (isTechnicalStaffSelected) {
        payload.technicalOfficeId = Number(formValues.technicalOfficeId);
      }

      await adminAPI.createUser(payload);
      await fetchUsers();
      handleDialogChange(false);
    } catch (err) {
      console.error('Failed to create municipality user', err);
      setFormError(err.response?.data?.message || 'Unable to create the user. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                        placeholder={
                          isRolesLoading ? 'Loading roles…' : rolesError ? 'Roles unavailable' : 'Select a role'
                        }
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card/60">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Loading municipality users...
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No municipality users found.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}