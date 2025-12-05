import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Users, FileText } from 'lucide-react';
import Navbar from '@/components/common/Navbar';

const navigationItems = [
  {
    name: 'Overview',
    description: 'Key activities and quick stats',
    to: '/admin',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: 'Municipality Users',
    description: 'Manage municipality staff',
    to: '/admin/municipality-users',
    icon: Users,
  },
  {
    name: 'Reports',
    description: 'Review and triage citizen reports',
    to: '/admin/reports',
    icon: FileText,
  },
];

const navLinkClasses = ({ isActive }) =>
  [
    'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
    isActive
      ? 'border-primary/60 bg-primary text-primary-foreground shadow-sm'
      : 'border-transparent text-muted-foreground hover:border-accent hover:bg-accent hover:text-accent-foreground',
  ]
    .filter(Boolean)
    .join(' ');

const mobileNavLinkClasses = ({ isActive }) =>
  [
    'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  ]
    .filter(Boolean)
    .join(' ');

export default function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const openMobileSidebar = () => setIsMobileSidebarOpen(true);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:flex lg:flex-col"
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            width: '280px',
            height: 'calc(100vh - 64px)',
          }}
        >
          <div className="flex flex-1 flex-col gap-6 border-r bg-card/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-card/70">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
              <p className="text-sm text-muted-foreground">
                Quick access to all administrative features.
              </p>
            </div>

            <nav className="flex flex-1 flex-col gap-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end={item.exact}
                  className={navLinkClasses}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="text-xs font-normal text-muted-foreground/80">
                      {item.description}
                    </span>
                  </div>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-[280px]">
          <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-20 sm:px-8 sm:pt-24">
            <div className="mb-6 lg:hidden">
              <button
                type="button"
                onClick={openMobileSidebar}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-primary/50 hover:text-primary"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                Menu
              </button>
            </div>
            <Outlet />
          </div>
        </main>
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <nav
            className="h-full w-72 max-w-full border-r bg-card/95 p-5 shadow-xl backdrop-blur-xl supports-[backdrop-filter]:bg-card/80"
            aria-label="Mobile admin navigation"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Admin navigation</h2>
                <p className="text-xs text-muted-foreground">Select a section to manage.</p>
              </div>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition hover:border-primary/50 hover:text-primary"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end={item.exact}
                  className={mobileNavLinkClasses}
                  onClick={closeMobileSidebar}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </nav>
          <button
            type="button"
            className="flex-1 bg-background/70 backdrop-blur-sm"
            onClick={closeMobileSidebar}
            aria-label="Close sidebar"
          />
        </div>
      )}
    </div>
  );
}
