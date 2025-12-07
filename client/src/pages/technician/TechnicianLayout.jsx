import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, ClipboardList, CheckCircle2, User, Users } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { staffAPI } from "@/services/api"; // Usa staffAPI per i report assegnati
import { Badge } from "@/components/ui/badge";

// Definiamo gli stati considerati "finiti"
const FINISHED_STATUSES = new Set(["Resolved", "Rejected"]);

export default function TechnicianLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [counts, setCounts] = useState({ active: 0, maintainer: 0, history: 0 });
  const { user } = useAuth();
  const location = useLocation();

  // Fetch dei contatori aggiornati
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Ottiene TUTTI i report assegnati al tecnicodashboard
        const response = await staffAPI.getAssignedReports();
        const allReports = response.data;

        // Attivi: Non finiti E non assegnati a ditta esterna (companyId nullo o assente)
        const activeCount = allReports.filter(
          (r) => !FINISHED_STATUSES.has(r.status) && !r.companyId
        ).length;

        // Maintainer: Non finiti E assegnati a ditta esterna
        const maintainerCount = allReports.filter(
            (r) => !FINISHED_STATUSES.has(r.status) && r.companyId
        ).length;

        // Storico: Finiti
        const historyCount = allReports.filter(
          (r) => FINISHED_STATUSES.has(r.status)
        ).length;

        setCounts({ active: activeCount, maintainer: maintainerCount, history: historyCount });
      } catch (error) {
        console.error("Error fetching report counts:", error);
      }
    }; 

    fetchCounts();
  }, [location.pathname]); // Aggiorna i conteggi quando cambi pagina (utile dopo aver risolto un report)

  const navigationItems = [
    {
      name: "Your Reports",
      description: "Manage your active tasks",
      to: "reports/active", // Rotta per i report attivi
      icon: ClipboardList,
      count: counts.active,
      badgeVariant: "destructive", // Rosso per attirare attenzione
    },
    {
      name: "Maintainers Reports",
      description: "External assignments",
      to: "reports/maintainer",
      icon: Users,
      count: counts.maintainer,
      badgeVariant: "secondary",
    },
    {
      name: "Resolved Reports",
      description: "View your work history",
      to: "reports/history", // Rotta per lo storico
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
        {/* Desktop Sidebar - FIX LAYOUT: Sidebar Fissa */}
        <aside
          className="hidden lg:flex lg:flex-col"
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            width: "280px",
            height: "calc(100vh - 64px)",
            zIndex: 40, // Assicuriamo che sia sopra il contenuto standard ma sotto overlay modali
          }}
        >
          <div className="flex flex-1 flex-col gap-6 border-r bg-card/80 p-6 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Technician Dashboard
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{user?.username || "Technician"}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4">
              <nav className="flex flex-col gap-2" data-cy="technician-sidebar">
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

        {/* Main Content Area - FIX LAYOUT: Aggiunto margin-left (lg:ml-[280px]) per non finire sotto la sidebar fissa */}
        <main className="flex-1 overflow-y-auto bg-muted/10 p-4 md:p-8 lg:ml-[280px]">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close sidebar"
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
                    <Badge variant={item.badgeVariant} className="ml-auto">
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