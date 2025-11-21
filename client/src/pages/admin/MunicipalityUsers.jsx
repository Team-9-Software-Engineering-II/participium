import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserRound } from 'lucide-react';
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

const extractRoleName = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    return (
      role.name ??
      role.label ??
      role.code ??
      role.type ??
      role.slug ??
      ''
    );
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
  if (user.name) return user.name;
  if (user.username) return user.username;
  return user.email || `User ${user.id}`;
};

export default function MunicipalityUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [formValues, setFormValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    roleId: '',
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await adminAPI.getUsers();
      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((user) => !isRestrictedRole(user?.role?.name ?? user?.role));

      setUsers(filtered);
    } catch (err) {
      console.error('Failed to fetch municipality users', err);
      setError('Unable to load municipality users right now. Please try again shortly.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchRoles = useCallback(async () => {
    setIsRolesLoading(true);
    setRolesError(null);
    try {
      const { data } = await adminAPI.getRoles();
      const list = Array.isArray(data) ? data : [];
      const formatted = list
        .map((role) => {
          const name = extractRoleName(role);
          return {
            id: role?.id ?? name,
            name,
          };
        })
        .filter((role) => role.name && !isRestrictedRole(role.name));
      setRoleOptions(formatted);
    } catch (err) {
      console.error('Failed to load municipality roles', err);
      setRolesError('Unable to load roles. Please try again.');
    } finally {
      setIsRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAddDialogOpen && !isEditDialogOpen) return;
    if (roleOptions.length > 0 || isRolesLoading) return;
    fetchRoles();
  }, [isAddDialogOpen, isEditDialogOpen, roleOptions.length, isRolesLoading, fetchRoles]);

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
      });
      setFormError(null);
      setRolesError(null);
    }
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    setEditRoleValue('');
    setUpdateError(null);
  };

  const handleEditDialogChange = (open) => {
    if (open) {
      setIsEditDialogOpen(true);
    } else {
      closeEditDialog();
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditRoleValue(extractRoleName(user?.role?.name ? user.role : user?.role));
    setUpdateError(null);
    setIsEditDialogOpen(true);
  };

  const handleFormChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError(null);

    const requiredFields = ['firstName', 'lastName', 'email', 'username', 'password', 'roleId'];
    const missing = requiredFields.filter((field) => !formValues[field]?.trim());

    if (missing.length > 0) {
      setFormError('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminAPI.createUser({
        email: formValues.email.trim(),
        username: formValues.username.trim(),
        password: formValues.password,
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim(),
        roleId: Number(formValues.roleId),
      });

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

  const handleUpdateRole = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    if (!editRoleValue) {
      setUpdateError('Please select a role to assign.');
      return;
    }

    setIsUpdatingRole(true);
    setUpdateError(null);

    try {
      await adminAPI.assignRole(selectedUser.id, editRoleValue);
      await fetchUsers();
      closeEditDialog();
    } catch (err) {
      console.error('Failed to update municipality user role', err);
      setUpdateError(
        err.response?.data?.message ||
          'Unable to update the role right now. Please try again.'
      );
    } finally {
      setIsUpdatingRole(false);
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
        user.id,
        user?.role?.name ?? user?.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

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
            Review, search and update municipal staff accounts synced from the administrative API.
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
                  Provide the account details. All fields are
                  mandatory.
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
                  <Input
                    data-cy="password"
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={formValues.password}
                    onChange={handleFormChange('password')}
                    placeholder="••••••••"
                  />
                </div>
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
                  {rolesError && (
                    <p className="text-xs text-rose-600">
                      {rolesError}
                    </p>
                  )}
                </div>
                {formError && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {formError}
                  </div>
                )}
                <DialogFooter className="pt-2">
                  <DialogClose asChild>
                    <Button data-cy="cancel" ype="button" variant="ghost" disabled={isSubmitting}>
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
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Action
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
                      {user?.role?.name ?? user?.role ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        data-cy={`edit-user`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-2 border border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-primary"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit municipality user</DialogTitle>
            <DialogDescription>
              Change the role assigned to this municipal account. Only non-administrator, non-citizen
              roles are available.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="rounded-lg border border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{formatDisplayName(selectedUser)}</p>
              <p className="text-xs text-muted-foreground">
                {selectedUser.email || selectedUser.username || `ID: ${selectedUser.id}`}
              </p>
            </div>
          )}
          <form className="space-y-5 pt-4" onSubmit={handleUpdateRole}>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={editRoleValue}
                onValueChange={(value) => setEditRoleValue(value)}
                disabled={isRolesLoading || !!rolesError}
              >
                <SelectTrigger d="editRole" data-cy="select-edit-role">
                  <SelectValue
                    placeholder={
                      isRolesLoading ? 'Loading roles…' : rolesError ? 'Roles unavailable' : 'Select a role'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.name} data-cy="edit-role">
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rolesError && (
                <p className="text-xs text-rose-600">
                  {rolesError}
                </p>
              )}
            </div>
            {updateError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {updateError}
              </div>
            )}
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button data-cy="cancel-edit-role" type="button" variant="ghost" disabled={isUpdatingRole}>
                  Cancel
                </Button>
              </DialogClose>
              <Button data-cy="submit-edit-role" ype="submit" disabled={isUpdatingRole || isRolesLoading}>
                {isUpdatingRole ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

