/* eslint-disable react/prop-types */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { staffAPI, messageAPI } from "@/services/api";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Calendar, ArrowRight, CheckCircle2, Clock, HardHat, Building2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/reportColors";
import { useAuth } from "@/contexts/AuthContext";

// Stati in cui il tecnico può spostare il report
const ALLOWED_TRANSITIONS = [
  { value: "In Progress", label: "In Progress", color: "bg-yellow-400" },
  { value: "Suspended", label: "Suspended", color: "bg-gray-500" },
  { value: "Resolved", label: "Resolved", color: "bg-green-500" },
];

const FINISHED_STATUSES = new Set(["Resolved", "Rejected"]);

export default function TechnicianReports({ type = "active" }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ricarica i report quando cambia il tipo di vista (Active/History)
  useEffect(() => {
    fetchReports();
    
    // Aggiungi listener per ricaricare quando la chat viene chiusa o ci sono cambiamenti
    const handleRefresh = () => {
      console.log('[TechnicianReports] Refresh triggered by event');
      fetchReports();
    };
    
    globalThis.addEventListener('chatMessageRead', handleRefresh);
    
    // Polling automatico ogni 10 secondi per aggiornare l'ordinamento
    const interval = setInterval(() => {
      console.log('[TechnicianReports] Auto-refresh triggered');
      fetchReports();
    }, 10000);
    
    return () => {
      globalThis.removeEventListener('chatMessageRead', handleRefresh);
      clearInterval(interval);
    };
  }, [type]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Scarica TUTTI i report assegnati (passando il ruolo technical_staff)
      const response = await staffAPI.getAssignedReports('technical_staff');
      const allData = response.data;
      console.log('All assigned reports:', allData);

      // 2. Filtra in base al tipo di vista richiesto
      const filteredData = allData.filter((report) => {
        const isFinished = FINISHED_STATUSES.has(report.status);
        const isExternal = !!report.externalMaintainerId;

        console.log(`Report ${report.id}: status=${report.status}, externalMaintainerId=${report.externalMaintainerId}, isFinished=${isFinished}, isExternal=${isExternal}`);
        
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

      console.log(`Filtered reports for type "${type}":`, filteredData);

      // 3. Per ogni report, calcola il numero di messaggi non letti (SOLO per tipo "maintainer")
      if (type === "maintainer" && user?.id) {
        console.log('[Sorting] Starting unread count calculation for maintainer reports...');
        await Promise.all(
          filteredData.map(async (report) => {
            try {
              const messagesResponse = await messageAPI.getMessages(report.id);
              const messages = messagesResponse.data || [];
              
              if (messages.length > 0) {
                const storageKey = `lastReadMessage_${report.id}_${user.id}`;
                const lastReadId = localStorage.getItem(storageKey);
                
                if (lastReadId) {
                  const lastReadIdNum = Number.parseInt(lastReadId, 10);
                  const newMessages = messages.filter(m => 
                    m.id > lastReadIdNum && m.author?.id !== user.id
                  );
                  report._unreadCount = newMessages.length;
                  console.log(`[Sorting] Report ${report.id} (${report.title}): ${newMessages.length} unread messages (lastReadId: ${lastReadIdNum})`);
                } else {
                  const unread = messages.filter(m => m.author?.id !== user.id);
                  report._unreadCount = unread.length;
                  console.log(`[Sorting] Report ${report.id} (${report.title}): ${unread.length} unread messages (no history)`);
                }
              } else {
                report._unreadCount = 0;
                console.log(`[Sorting] Report ${report.id} (${report.title}): 0 messages`);
              }
            } catch (error) {
              console.error(`Error fetching messages for report ${report.id}:`, error);
              report._unreadCount = 0;
            }
          })
        );
        console.log('[Sorting] Unread count calculation completed');
        console.log('[Sorting] Reports before sorting:', filteredData.map(r => ({ id: r.id, title: r.title, unread: r._unreadCount, date: r.createdAt })));
      }

      // 4. Ordina: prima per messaggi non letti (se tipo "maintainer"), poi per data
      filteredData.sort((a, b) => {
        if (type === "maintainer") {
          // Prima i report con messaggi non letti
          const aUnread = a._unreadCount || 0;
          const bUnread = b._unreadCount || 0;
          console.log(`[Sorting] Comparing: "${a.title}" (unread: ${aUnread}) vs "${b.title}" (unread: ${bUnread})`);
          if (aUnread !== bUnread) {
            console.log(`[Sorting] -> Sorting by unread count: ${bUnread - aUnread}`);
            return bUnread - aUnread; // Decrescente
          }
        }
        // Poi per data (più recenti in alto)
        const result = new Date(b.createdAt) - new Date(a.createdAt);
        console.log(`[Sorting] -> Sorting by date: ${result}`);
        return result;
      });
      
      console.log('[Sorting] Reports after sorting:', filteredData.map(r => ({ id: r.id, title: r.title, unread: r._unreadCount || 0, date: r.createdAt })));
      
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
    let emptyStateContent;
    
    if (type === "active") {
      emptyStateContent = (
        <>
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">All caught up!</h3>
          <p className="text-muted-foreground">You have no pending reports assigned.</p>
        </>
      );
    } else if (type === "maintainer") {
      emptyStateContent = (
        <>
          <HardHat className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No external assignments</h3>
          <p className="text-muted-foreground">You haven't assigned any reports to external maintainers.</p>
        </>
      );
    } else {
      emptyStateContent = (
        <>
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No history</h3>
          <p className="text-muted-foreground">You haven't resolved any reports yet.</p>
        </>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/5">
        {emptyStateContent}
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
          userId={user?.id}
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && !showSuccess) {
      const fetchCompanies = async () => {
        setLoading(true);
        try {
          const res = await staffAPI.getEligibleCompanies(report.id);
          setCompanies(res.data);
        } catch (error) {
          console.error("Failed to fetch companies", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load companies.",
          });
        } finally {
          setLoading(false);
        }
      };
      fetchCompanies();
    }
  }, [open, showSuccess,report.id, toast]);

  const handleAssign = async () => {
    if (!selectedCompany) return;
    setOpen(false);
    setAssigning(true);
    try {
      const companyIdNumber = Number.parseInt(selectedCompany, 10);
      await staffAPI.assignExternal(report.id, companyIdNumber);

      setShowSuccess(true);
      setAssigning(false);
    } catch (error) {
      console.error('❌ Assignment error:', error);
      const message = error.response?.data?.message || "Could not assign the report. Please try again.";
      setErrorMessage(message);
      setShowError(true);
      setAssigning(false);
    }
  };

    const handleCloseSuccess = async () => {
    setShowSuccess(false);
    setSelectedCompany("");
    
    // Ricarica la lista e aggiorna i contatori DOPO che l'utente ha visto la conferma
    await onRefresh();
    globalThis.dispatchEvent(new Event('technicianReportsRefresh'));
  };

  const handleCloseError = () => {
    setShowError(false);
    setErrorMessage("");
    setSelectedCompany("");
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCompany("");
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2" data-cy="assign-maintainer-btn">
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
            {loading && (
              <div className="text-sm text-center text-muted-foreground">Loading companies...</div>
            )}
            {!loading && companies.length === 0 && (
              <div className="text-sm text-center text-red-500">No eligible companies found for this category.</div>
            )}
            {!loading && companies.length > 0 && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger data-cy="company-select-trigger">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => {
                  const formattedName = c.name.replaceAll(" ", "-");
                  return (
                  <SelectItem key={c.id} value={c.id.toString()} data-cy={`select-item-${formattedName}`}>
                    {c.name}
                  </SelectItem>
                );
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose} data-cy="cancel-assignment-button">Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedCompany || assigning} data-cy="confirm-assignment-button">
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Assignment Successful
            </AlertDialogTitle>
            <AlertDialogDescription>
              The report has been successfully assigned to the external maintainer and moved to the Maintainers Reports section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseSuccess}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showError} onOpenChange={setShowError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              Assignment Failed
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseError}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
  

// Sotto-componente per gestire lo stato locale del Select
function ReportCard({ report, type, onUpdateStatus, onRefresh, userId }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Controlla se ci sono messaggi non letti
  useEffect(() => {
    const checkUnreadMessages = async () => {
      if (!userId || !report.id) return;
      
      // Solo se il report ha un external maintainer (quindi c'è la chat)
      if (!report.externalMaintainerId) return;

      try {
        const response = await messageAPI.getMessages(report.id);
        const messages = response.data || [];
        
        if (messages.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Recupera l'ultimo messaggio visto da localStorage
        const storageKey = `lastReadMessage_${report.id}_${userId}`;
        const lastReadId = localStorage.getItem(storageKey);
        
        console.log(`[Badge Tech] Report ${report.id}:`, {
          totalMessages: messages.length,
          lastReadId,
          userId,
          externalMaintainerId: report.externalMaintainerId
        });
        
        if (lastReadId) {
          // Conta solo i nuovi messaggi dopo l'ultimo letto
          const lastReadIdNum = Number.parseInt(lastReadId, 10);
          const newMessages = messages.filter(m => 
            m.id > lastReadIdNum && m.author?.id !== userId
          );
          console.log(`[Badge Tech] LastReadId=${lastReadIdNum}, new messages:`, newMessages.length);
          setUnreadCount(newMessages.length);
        } else {
          // Se non abbiamo mai aperto la chat, conta tutti i messaggi degli altri
          const unread = messages.filter(m => m.author?.id !== userId);
          console.log(`[Badge Tech] No lastReadId, unread from others:`, unread.length);
          setUnreadCount(unread.length);
        }
      } catch (error) {
        console.error('Failed to fetch messages for badge:', error);
      }
    };

    checkUnreadMessages();
    
    // Ricontrolla ogni 5 secondi (più frequente)
    const interval = setInterval(checkUnreadMessages, 5000);
    
    // Ascolta eventi per aggiornare il badge
    const handleStorageChange = () => checkUnreadMessages();
    globalThis.addEventListener('storage', handleStorageChange);
    globalThis.addEventListener('chatMessageRead', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      globalThis.removeEventListener('storage', handleStorageChange);
      globalThis.removeEventListener('chatMessageRead', handleStorageChange);
    };
  }, [report.id, report.externalMaintainerId, report.assigneeId, userId]);

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
              className={`md:hidden ${getStatusColor(report.status)}`}
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
              className={`text-white px-3 py-1 ${getStatusColor(report.status, 'dark')}`}
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

          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            <Button 
              data-cy="view-details-button"
              variant="ghost" 
              size="sm" 
              className="w-full md:w-auto gap-2 text-primary hover:text-primary/80"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              View Full Details <ArrowRight className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                <MessageCircle className="h-3 w-3" />
                <span>{unreadCount > 9 ? '9+' : unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}