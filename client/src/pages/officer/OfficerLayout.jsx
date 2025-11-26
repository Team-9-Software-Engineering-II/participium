import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ClipboardList,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";
import Navbar from "@/components/common/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { urpAPI, reportAPI } from "@/services/api";
import { Badge } from "@/components/ui/badge";

const getNavigationItems = (counts) => [
  {
    name: "Pending Reports",
    description: "Review and assign reports",
    to: "/municipal/dashboard",
    icon: ClipboardList,
    count: counts.pending,
    badgeVariant: "secondary",
  },
  {
    name: "Assigned Reports",
    description: "Reports sent to technical office",
    to: "/municipal/assigned",
    icon: CheckCircle2,
    count: counts.assigned,
    badgeVariant: "secondary",
  },
  {
    name: "Rejected Reports",
    description: "Reports declined with reason",
    to: "/municipal/rejected",
    icon: XCircle,
    count: counts.rejected,
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

export default function OfficerLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({
    pending: 0,
    assigned: 0,
    rejected: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const pendingPromise = urpAPI.getPendingReports();
        const allPromise = reportAPI.getAll();

        const [pendingRes, allRes] = await Promise.all([
          pendingPromise,
          allPromise,
        ]);

        const allReports = allRes.data || [];
        const assignedCount = allReports.filter(
          (r) => r.status === "Assigned"
        ).length;
        const rejectedCount = allReports.filter(
          (r) => r.status === "Rejected"
        ).length;

        setCounts({
          pending: pendingRes.data.length,
          assigned: assignedCount,
          rejected: rejectedCount,
        });
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    };

    fetchCounts();
  }, [location.pathname]);

  const navigationItems = getNavigationItems(counts);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:flex lg:flex-col"
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            width: "280px",
            height: "calc(100vh - 64px)",
          }}
        >
          <div className="flex flex-1 flex-col gap-6 border-r bg-card/80 p-6 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Officer Dashboard
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{user?.username || "Officer"}</span>
              </div>
            </div>

            <nav
              className="flex flex-1 flex-col gap-2"
              data-cy="officer-sidebar"
            >
              {navigationItems.map((item, idx) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={navLinkClasses}
                  data-cy={
                    idx === 0
                      ? "nav-pending"
                      : idx === 1
                      ? "nav-assigned"
                      : "nav-rejected"
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <div className="flex flex-col text-left">
                      <span>{item.name}</span>
                    </div>
                  </div>
                  {item.count > 0 && (
                    <Badge
                      variant={item.badgeVariant}
                      className="ml-auto"
                      data-cy={
                        idx === 0
                          ? "badge-pending"
                          : idx === 1
                          ? "badge-assigned"
                          : "badge-rejected"
                      }
                    >
                      {item.count}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-[280px]">
          {/* MODIFICA QUI: pt-20/pt-24 ridotto a pt-6 per ridurre lo spazio sotto la navbar */}
          <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-8">
            <div className="mb-6 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-primary/50 hover:text-primary"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>
            </div>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col gap-4 border-r bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.count > 0 && (
                    <Badge className={`ml-auto ${item.badgeClassName}`}>
                      {item.count}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
