/* eslint-disable react/prop-types */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { staffAPI } from "@/services/api";
import { Card } from "@/components/ui/card";
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
import { MapPin, Calendar, ArrowRight, Save } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/reportColors";

const ALLOWED_TRANSITIONS = [
  { value: "In Progress", label: "In Progress", color: "bg-yellow-400" },
  { value: "Suspended", label: "Suspended", color: "bg-gray-500" },
  { value: "Resolved", label: "Resolved", color: "bg-green-500" },
];

const FINISHED_STATUSES = new Set(["Resolved", "Rejected"]);

export default function ExternalMaintainerReports({ type = "active" }) {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [type]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await staffAPI.getAssignedReports();
      const allData = response.data;

      const filteredData = allData.filter((report) => {
        const isFinished = FINISHED_STATUSES.has(report.status);

        if (type === "active") {
          return !isFinished;
        } else {
          return isFinished;
        }
      });

      filteredData.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

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
        title: "Status updated",
        description: `Report status changed to ${newStatus}`,
      });

      fetchReports();

      // Emetti evento per aggiornare i contatori nel layout
      globalThis.dispatchEvent(new Event("maintainerReportsRefresh"));
    } catch (error) {
      console.error("Failed to update status", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update report status.",
      });
    }
  };

  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">No reports found</h3>
          <p className="text-sm text-muted-foreground">
            {type === "active"
              ? "You don't have any active reports assigned to you at the moment."
              : "You haven't completed any reports yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" data-cy="reports-title">
          {type === "active" ? "Your Reports" : "Resolved Reports"}
        </h1>
        <p className="text-muted-foreground">
          {type === "active"
            ? "Manage and update the status of your assigned reports"
            : "View your completed work history"}
        </p>
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full" data-cy="reports-table">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-muted/50 transition-colors"
                    data-cy="report-row"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {report.description}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">
                          {report.address || "No address"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {type === "active" ? (
                        <StatusUpdateDialog
                          report={report}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      ) : (
                        <Badge
                          className={getStatusColor(report.status, "dark")}
                          data-cy="status-badge"
                        >
                          {report.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(report.createdAt), "dd/MM/yyyy")}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        View
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {report.description}
                </p>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  {report.address || "No address"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(report.createdAt), "dd/MM/yyyy")}
              </div>

              <div className="flex items-center justify-between pt-2">
                {type === "active" ? (
                  <StatusUpdateDialog
                    report={report}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ) : (
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusUpdateDialog({ report, onUpdateStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(report.status);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    if (selectedStatus !== report.status) {
      onUpdateStatus(report.id, selectedStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <Badge
        className={getStatusColor(report.status)}
        data-cy="current-status-badge"
      >
        {report.status}
      </Badge>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-cy="update-status-button">
            Update
          </Button>
        </DialogTrigger>
        <DialogContent data-cy="status-dialog">
          <DialogHeader>
            <DialogTitle>Update Report Status</DialogTitle>
            <DialogDescription>
              Change the status of this report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="status-select" className="text-sm font-medium">
                New Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-cy="status-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_TRANSITIONS.map((status) => (
                    <SelectItem
                      key={status.value}
                      value={status.value}
                      data-cy="status-option"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${status.color}`}
                        />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedStatus === report.status}
              data-cy="save-changes-button"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
