import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, ClipboardList, CheckCircle2, User } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { staffAPI } from "@/services/api";
import { Badge } from "@/components/ui/badge";

const FINISHED_STATUSES = new Set(["Resolved", "Rejected"]);

export default function ExternalMaintainerLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({ active: 0, history: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await staffAPI.getAssignedReports('external_maintainer');
        const allReports = response.data;

        const activeCount = allReports.filter(
          (r) => !FINISHED_STATUSES.has(r.status)
        ).length;

        const historyCount = allReports.filter(
          (r) => FINISHED_STATUSES.has(r.status)
        ).length;

        setCounts({ active: activeCount, history: historyCount });
      } catch (error) {
        console.error("Error fetching report counts:", error);
      }
    };

    fetchCounts();
  }, [location.pathname, refreshKey]);

  // Ascolta eventi personalizzati per refresh
  useEffect(() => {
    const handleRefresh = () => setRefreshKey(prev => prev + 1);
    globalThis.addEventListener('maintainerReportsRefresh', handleRefresh);
    return () => globalThis.removeEventListener('maintainerReportsRefresh', handleRefresh);
  }, []);

  const navigationItems = [
    {
      name: "Your Reports",
      description: "Manage your active tasks",
      to: "reports/active",
      icon: ClipboardList,
      count: counts.active,
      badgeVariant: "destructive",
    },
    {
      name: "Resolved Reports",
      description: "View your work history",
      to: "reports/history",
      icon: CheckCircle2,
      count: counts.history,
      badgeVariant: "secondary",
    },
  ];

  const navLinkClasses = ({ isActive }) =>
    [
      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-all",
      isActive
        ? "border-primary/60 bg-primary text-primary-foreground shadow-sm"
        : "border-transparent text-muted-foreground hover:border-accent hover:bg-accent hover:text-accent-foreground",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex lg:flex-col"
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            width: "280px",
            height: "calc(100vh - 64px)",
            zIndex: 40,
          }}
        >
          <div className="flex flex-1 flex-col gap-6 border-r bg-card/80 p-6 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                External Maintainer Dashboard
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{user?.username || "Maintainer"}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4">
              <nav className="flex flex-col gap-2" data-cy="maintainer-sidebar">
                {navigationItems.map((item) => (
                  <NavLink key={item.name} to={item.to} className={navLinkClasses}>
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.count > 0 && (
                      <Badge variant={item.badgeVariant} className="ml-auto">
                        {item.count}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Mobile Header Trigger */}
        <div className="flex items-center border-b bg-background px-4 py-2 lg:hidden">
          <button onClick={() => setIsMobileSidebarOpen(true)} className="mr-2">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">Menu</span>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8 lg:ml-[280px]">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="flex-1 bg-black/50"
            aria-label="Close sidebar"
          />
          <aside className="flex w-72 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">External Maintainer</h2>
              <button onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="flex flex-col gap-2">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={navLinkClasses}
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.count > 0 && (
                      <Badge variant={item.badgeVariant} className="ml-auto">
                        {item.count}
                      </Badge>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
