import { Pencil, Plus, Search, UserRound } from 'lucide-react';

const users = [
  {
    id: 'USR-9813',
    name: 'Lucia Romano',
    role: 'Operations lead',
    email: 'lucia.romano@participium.gov',
    status: 'Active',
    lastSeen: '2 hours ago',
  },
  {
    id: 'USR-7755',
    name: 'Marco Rossi',
    role: 'Case supervisor',
    email: 'marco.rossi@participium.gov',
    status: 'Active',
    lastSeen: 'Yesterday',
  },
  {
    id: 'USR-6602',
    name: 'Sara Bianchi',
    role: 'Field technician',
    email: 'sara.bianchi@participium.gov',
    status: 'Invited',
    lastSeen: 'Pending',
  },
];

export default function MunicipalityUsers() {
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/80">
            Team management
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Municipality users</h1>
          
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add user
          </button>
        </div>
      </header>

      <section className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search users"
              className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
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
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-background/80">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 text-sm font-semibold text-muted-foreground">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{user.role}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

