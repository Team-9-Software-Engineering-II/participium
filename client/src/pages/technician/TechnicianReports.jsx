/* eslint-disable react/prop-types */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { staffAPI } from "@/services/api";
import {
  Card,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Calendar, ArrowRight, CheckCircle2, Clock, Save, HardHat, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Stati in cui il tecnico può spostare il report
const ALLOWED_TRANSITIONS = [
  { value: "In Progress", label: "In Progress", color: "bg-amber-500" },
  { value: "Suspended", label: "Suspended", color: "bg-red-500" },
  { value: "Resolved", label: "Resolved", color: "bg-green-500" },
];

const FINISHED_STATUSES = new Set(["Resolved", "Rejected"]);

const getStatusBadgeClass = (status, variant = 'default') => {
  if (status === "Assigned") return variant === 'mobile' ? "bg-blue-500" : "bg-blue-600";
  if (status === "In Progress") return "bg-amber-500";
  if (status === "Resolved") return variant === 'mobile' ? "bg-green-500" : "bg-green-600";
  return "bg-gray-500";
};

export default function TechnicianReports({ type = "active" }) {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ricarica i report quando cambia il tipo di vista (Active/History)
  useEffect(() => {
    fetchReports();
  }, [type]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Scarica TUTTI i report assegnati
      const response = await staffAPI.getAssignedReports();
      const allData = response.data;

      // 2. Filtra in base al tipo di vista richiesto
      const filteredData = allData.filter((report) => {
        const isFinished = FINISHED_STATUSES.has(report.status);
        const isExternal = !!report.companyId;
        
        if (type === "active") {
          // Mostra: Assigned, In Progress, Suspended MA NON assegnati esternamente
          return !isFinished && !isExternal;
        } else if (type === "maintainer") {
          // Mostra solo quelli assegnati a maintainer
          return !isFinished && isExternal;
        } else {
          // Mostra: Resolved, Rejected
          return isFinished;
        }
      });

      // 3. Ordina per data (più recenti in alto)
      filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setReports(filteredData);
    } catch (error) {
      console.error("Failed to fetch reports", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reports.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await staffAPI.updateReportStatus(reportId, { status: newStatus });
      
      toast({
        title: "Status Updated",
        description: `Report marked as ${newStatus}`,
      });

      // Ricarica la lista per riflettere i cambiamenti
      fetchReports();
    } catch (error) {
      console.error("Failed to update status", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update report status.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/5">
        {type === "active" ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">All caught up!</h3>
            <p className="text-muted-foreground">You have no pending reports assigned.</p>
          </>
        ) : type === "maintainer" ? (
          <>
            <HardHat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No external assignments</h3>
            <p className="text-muted-foreground">You haven't assigned any reports to external maintainers.</p>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No history</h3>
            <p className="text-muted-foreground">You haven't resolved any reports yet.</p>
          </>
        )}
      </div>
    );
  }

  const getTitle = () => {
    if (type === "active") return "Your Assigned Reports";
    if (type === "maintainer") return "External Maintainer Reports";
    return "Resolved Reports History";
  };

  const getDescription = () => {
    if (type === "active") return "Manage reports assigned to you.";
    if (type === "maintainer") return "Monitor reports assigned to external companies.";
    return "Archive of reports you have processed.";
  };

  return (
    <div className="space-y-4" data-cy="report-list">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{getTitle()}</h2>
        <p className="text-muted-foreground">{getDescription()}</p>
      </div>

      {reports.map((report) => (
        <ReportCard 
          key={report.id} 
          report={report} 
          type={type} 
          onUpdateStatus={handleUpdateStatus}
          onRefresh={fetchReports}
        />
      ))}
    </div>
  );
}

// Dialog Component for Assignment
function AssignMaintainerDialog({ report, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const fetchCompanies = async () => {
        setLoading(true);
        try {
          const res = await staffAPI.getEligibleCompanies(report.id);
          setCompanies(res.data);
        } catch (error) {
          console.error("Failed to fetch companies", error);
        } finally {
          setLoading(false);
        }
      };
      fetchCompanies();
    }
  }, [open, report.id]);

  const handleAssign = async () => {
    if (!selectedCompany) return;
    setAssigning(true);
    try {
      await staffAPI.assignExternal(report.id, selectedCompany);
      toast({
        title: "Report Assigned",
        description: "The report has been successfully assigned to the maintainer.",
      });
      setOpen(false);
      onRefresh(); // Ricarica la lista per spostare il report nella tab corretta
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: "Could not assign the report. Please try again.",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <HardHat className="h-4 w-4" /> Assign to Maintainer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to External Maintainer</DialogTitle>
          <DialogDescription>
            Select a compatible company to handle this report. The report will be moved to the Maintainer list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
             <div className="text-sm text-center text-muted-foreground">Loading companies...</div>
          ) : companies.length === 0 ? (
             <div className="text-sm text-center text-red-500">No eligible companies found for this category.</div>
          ) : (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger data-cy="company-select-trigger">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button data-cy="cancel-assignment-button"variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button data-cy="confirm-assignment-butto" onClick={handleAssign} disabled={!selectedCompany || assigning}>
            {assigning ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sotto-componente per gestire lo stato locale del Select
function ReportCard({ report, type, onUpdateStatus, onRefresh }) {
  const navigate = useNavigate();
  // Stato locale per il valore selezionato nel dropdown
  const [selectedStatus, setSelectedStatus] = useState(report.status);

  // Se il report cambia (es. ricaricamento lista), resetta la selezione
  useEffect(() => {
    setSelectedStatus(report.status);
  }, [report.status]);

  const hasChanged = selectedStatus !== report.status;

  return (
    <Card data-cy="report-card" className="transition-all hover:shadow-md border-l-4 border-l-primary/20">
      <div className="flex flex-col md:flex-row md:items-start gap-4 p-6">
        
        {/* Left Content: Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-normal">
              {report.category?.name || "Uncategorized"}
            </Badge>
            {/* Mobile Badge */}
            <Badge 
              className={`md:hidden ${getStatusBadgeClass(report.status, 'mobile')}`}
            >
              {report.status}
            </Badge>
            {report.companyId && (
               <Badge variant="secondary" className="gap-1">
                 <Building2 className="w-3 h-3" /> External
               </Badge>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-semibold leading-none tracking-tight">
              {report.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                <span>
                  {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
              <span>{format(new Date(report.createdAt), "PPP")}</span>
            </div>
          </div>
        </div>

        {/* Right Content: Actions */}
        <div className="flex flex-col items-start md:items-end gap-3 min-w-[240px] border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
          
          {/* Desktop Status Badge (Visible only if not editing or in history) */}
          <div className="hidden md:flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Current:</span>
            <Badge 
              className={`text-white px-3 py-1 ${getStatusBadgeClass(report.status, 'desktop')}`}
            >
              {report.status}
            </Badge>
          </div>

          {/* Status Updater (SOLO se siamo nella vista Active) */}
          {/* COMMENTATO PER RICHIESTA: Rimuoviamo temporaneamente il cambio stato
          {type === "active" && (
            <div className="w-full space-y-2">
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-full md:w-[240px] bg-background" data-cy="status-select">
                  <SelectValue placeholder="Change status..." />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_TRANSITIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasChanged && (
                <Button 
                  data-cy="update-status-btn"
                  size="sm" 
                  className="w-full animate-in fade-in zoom-in duration-200"
                  onClick={() => onUpdateStatus(report.id, selectedStatus)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              )}
            </div>
          )}
          */}

          {/* Pulsante per assegnazione esterna (Solo Active) */}
          {type === "active" && (
            <div className="w-full md:w-[240px]">
              <AssignMaintainerDialog report={report} onRefresh={onRefresh} />
            </div>
          )}

          <Button 
            data-cy="view-details-button"
            variant="ghost" 
            size="sm" 
            className="w-full md:w-auto mt-auto gap-2 text-primary hover:text-primary/80"
            onClick={() => navigate(`/reports/${report.id}`)}
          >
            View Full Details <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}