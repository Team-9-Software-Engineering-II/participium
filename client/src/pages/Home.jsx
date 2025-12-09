/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Search,
  Plus,
  List,
  Clock,
  User,
  Moon,
  Sun,
  SlidersHorizontal,
  ListTree,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { MapView } from "@/components/MapView";
import { reportAPI } from "@/services/api";

// Reusable Reports List component
const ReportsList = ({ isAuthenticated, loading, displayReports, showMyReports, navigate, onViewInMap }) => {
  // Se non autenticato, mostra il box di login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No reports</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          Log in to view and manage reports in your area.
        </p>
        <div className="w-full bg-background rounded-lg p-4 text-center space-y-3 border">
          <p className="text-sm font-medium">Log in to see reports</p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full"
            size="sm"
          >
            Log in
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground mt-4">
          Loading reports...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {showMyReports
              ? "You haven't created any reports yet"
              : "No reports found matching your criteria."}
          </p>
        </div>
      ) : (
        displayReports.map((report) => (
          <Card
            key={report.id}
            className="p-4 cursor-pointer transition-colors hover:bg-accent"
            onClick={() => navigate(`/reports/${report.id}`)}
          >
            <h3 className="font-semibold mb-2">{report.title}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {/* Street Address */}
              {report.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span
                    className="font-medium truncate"
                    title={report.address}
                  >
                    {report.address}
                  </span>
                </div>
              )}

              {/* Coordinates */}
              {report.latitude && report.longitude && (
                <div className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3 opacity-50" />
                  <span className="opacity-70">
                    {report.latitude.toFixed(6)},{" "}
                    {report.longitude.toFixed(6)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{report.reporterName || "Anonymous"}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Status Badge removed for brevity if not used, or add back if needed */}
              </div>
              <button 
                type="button"
                className="inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInMap(report);
                }}
              >
                <MapPin className="h-3 w-3" />
                View in map
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Reports state
  const [allReports, setAllReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Mobile/desktop detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load reports from API
  useEffect(() => {
    const fetchReports = async () => {
      // PULIZIA: Rimosso controllo if (!isAuthenticated).
      // Ci affidiamo alla risposta del backend (401 se non autorizzato).

      setLoading(true);
      try {
        // Fetch all reports
        // Nota: Se non autenticato, questo lancerà un errore (401) che verrà catturato sotto
        const response = await reportAPI.getAll();
        const assignedResponse = await reportAPI.getAssigned();
        const fetchedReports = response.data;
        const assignedReports = assignedResponse.data;

        setAllReports(assignedReports);

        // OTTIMIZZAZIONE: Filtriamo i report dell'utente direttamente dai dati già scaricati
        // invece di fare una seconda chiamata API ridondante.
        if (user) {
          const userReports = fetchedReports.filter(
            (report) => report.userId === user.id
          );
          setMyReports(userReports);
        }
      } catch (error) {
        // Se l'errore è 401 (non autenticato) o altro, svuotiamo le liste
        console.error("Error fetching reports:", error);
        setAllReports([]);
        setMyReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [isAuthenticated, user]); // Re-run quando cambia lo stato di auth o l'utente

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Available categories
  const categories = [
    "Water Supply – Drinking Water",
    "Architectural Barriers",
    "Sewer System",
    "Public Lighting",
    "Waste",
    "Road Signs and Traffic Lights",
    "Roads and Urban Furnishings",
    "Public Green Areas and Playgrounds",
    "Other",
  ];

  // Available statuses
  const statuses = [
    { value: "Pending Approval", label: "Pending Approval" },
    { value: "Assigned", label: "Assigned" },
    { value: "In Progress", label: "In Progress" },
    { value: "Suspended", label: "Suspended" },
    { value: "Rejected", label: "Rejected" },
    { value: "Resolved", label: "Resolved" },
  ];

  // Date options
  const dateOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last week" },
    { value: "month", label: "This month" },
    { value: "custom", label: "Choose dates" },
  ];

  // Helper function to check if a date matches the filter
  const matchesDateFilter = (reportDate) => {
    if (!selectedDate) return true;

    const now = new Date();
    const reportDateTime = new Date(reportDate);

    switch (selectedDate) {
      case "today": {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const reportDay = new Date(
          reportDateTime.getFullYear(),
          reportDateTime.getMonth(),
          reportDateTime.getDate()
        );
        return reportDay.getTime() === today.getTime();
      }

      case "week": {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return reportDateTime >= weekAgo;
      }

      case "month": {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return reportDateTime >= monthStart;
      }

      default:
        return true;
    }
  };

  // Helper function to get category name from categoryId
  const getCategoryName = (categoryId) => {
    const categoryMap = {
      1: "Water Supply – Drinking Water",
      2: "Architectural Barriers",
      3: "Sewer System",
      4: "Public Lighting",
      5: "Waste",
      6: "Road Signs and Traffic Lights",
      7: "Roads and Urban Furnishings",
      8: "Public Green Areas and Playgrounds",
      9: "Other",
    };
    return categoryMap[categoryId] || "";
  };

  // Filter helper function
  const filterReportsList = (reports) => {
    return reports.filter((report) => {
      // Search query filter
      const matchesSearch =
        !searchQuery ||
        report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.address?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        !selectedCategory ||
        getCategoryName(report.categoryId) === selectedCategory;

      // Status filter
      const matchesStatus = !selectedStatus || report.status === selectedStatus;

      // Date filter
      const matchesDate = matchesDateFilter(report.createdAt);

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  };

  const filteredReports = filterReportsList(allReports);
  const filteredMyReports = filterReportsList(myReports);

  // Determine which list to show
  const displayReports = showMyReports ? filteredMyReports : filteredReports;
  const totalResults = displayReports.length;

  const handleNewReport = () => {
    // Manteniamo questo controllo UX per evitare redirect o errori 401 durante la navigazione
    if (isAuthenticated) {
      navigate("/reports/new");
    } else {
      setShowLoginPrompt(true);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedDate("");
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
  };

  const handleViewInMap = (report) => {
    setSelectedReport(report);
    // Chiudi la sheet mobile se aperta
    if (isMobile) {
      const sheetTrigger = document.querySelector('[data-state="open"]');
      if (sheetTrigger) {
        sheetTrigger.click();
      }
    }
  };


  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Desktop Layout (md and above) - With sidebar */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Sidebar - Reports List */}
        <div className="w-96 border-r border-border bg-background flex flex-col relative">
          {/* Mostra Search Bar solo se autenticato */}
          {isAuthenticated && (
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for a report"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowFilters(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mostra Toggle "My reports" solo se autenticato */}
          {isAuthenticated && (
            <div className="px-4 py-3">
              <span className="text-xl font-bold">All reports</span>
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-medium">My reports</span>
                <Switch
                  checked={showMyReports}
                  onCheckedChange={setShowMyReports}
                />
              </div>
            </div>
          )}

          {/* Reports List Area */}
          <div className="px-4 py-4">
            {isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                {totalResults} results
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <ReportsList 
              isAuthenticated={isAuthenticated}
              loading={loading}
              displayReports={displayReports}
              showMyReports={showMyReports}
              navigate={navigate}
              onViewInMap={handleViewInMap}
            />
          </div>

          {/* Theme Toggle Button - Bottom Left (only when not logged in) */}
          {!isAuthenticated && (
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="absolute bottom-6 left-6 h-14 w-14 rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50"
            >
              {theme === "dark" ? (
                <Sun style={{ width: "20px", height: "20px" }} />
              ) : (
                <Moon style={{ width: "20px", height: "20px" }} />
              )}
            </Button>
          )}

          {/* + Button bottom right */}
          <Button
            onClick={handleNewReport}
            className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            data-cy="new-report-button"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Right - Map */}
        <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-900 h-full">
          <div className="absolute inset-0 h-full z-0">
            <MapView reports={displayReports} selectedReport={selectedReport} />
          </div>
        </div>
      </div>

      {/* Mobile Layout (below md) - With bottom buttons */}
      <div className="md:hidden relative h-screen w-screen">
        {/* Map Area */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <MapView reports={displayReports} selectedReport={selectedReport} />
        </div>

        {/* Theme Toggle Button - Bottom Left (only when not logged in) */}
        {!isAuthenticated && (
          <Button
            onClick={() => toggleTheme()}
            variant="outline"
            size="icon"
            className="absolute bottom-2 left-4 z-[1001] h-12 w-12 rounded-full bg-white dark:bg-black backdrop-blur border-border"
          >
            {theme === "dark" ? (
              <Sun style={{ width: "20px", height: "20px" }} />
            ) : (
              <Moon style={{ width: "20px", height: "20px" }} />
            )}
          </Button>
        )}

        {/* Legend Button - Bottom Left (always visible on mobile) */}
        <Button
          onClick={() => setShowLegend(true)}
          variant="outline"
          size="icon"
          className={`absolute left-4 z-[1001] h-12 w-12 rounded-full bg-white dark:bg-black backdrop-blur border-border ${
            isAuthenticated ? "bottom-6" : "bottom-[76px]"
          }`}
        >
          <Info style={{ width: "20px", height: "20px" }} />
        </Button>

        {/* Bottom buttons */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 pb-2 z-10">
          {/* Empty space on the left for balance */}
          <div className="w-14"></div>

          {/* Reports List Button - Center */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="lg"
                variant="default"
                className="shadow-lg gap-2 h-12 px-4"
              >
                <List className="h-5 w-5" />
                <span className="text-sm">Reports list</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Reports</SheetTitle>
                <SheetDescription>View and manage reports</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Search bar e Toggle visibili solo se autenticato */}
                {isAuthenticated && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for a report"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowFilters(true)}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium">My reports</span>
                      <Switch
                        checked={showMyReports}
                        onCheckedChange={setShowMyReports}
                      />
                    </div>

                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {totalResults} results
                      </p>
                    </div>
                  </>
                )}

                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(80vh - 400px)" }}
                >
                  <ReportsList 
                    isAuthenticated={isAuthenticated}
                    loading={loading}
                    displayReports={displayReports}
                    showMyReports={showMyReports}
                    navigate={navigate}
                    onViewInMap={handleViewInMap}
                  />
                </div>
              </div>

              {/* Fixed + button bottom right inside Sheet */}
              <Button
                onClick={handleNewReport}
                className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </SheetContent>
          </Sheet>

          {/* New Report Button - Right */}
          <Button
            size="lg"
            onClick={handleNewReport}
            className="shadow-lg rounded-full h-14 w-14 p-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Filters Dialog - Desktop only */}
      {!isMobile && (
        <Dialog open={showFilters} onOpenChange={setShowFilters}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filter results</DialogTitle>
              <DialogDescription>
                Select criteria to filter reports
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Category */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground block">
                  Category
                </span>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <ListTree className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report status */}
              <div className="space-y-3">
                <span className="text-sm font-medium block">Report status</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedStatus === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("")}
                    className="rounded-full"
                  >
                    No filter
                  </Button>
                  {statuses.map((status) => (
                    <Button
                      key={status.value}
                      variant={
                        selectedStatus === status.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedStatus(status.value)}
                      className="rounded-full"
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-3">
                <span className="text-sm font-medium block">Date</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDate === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDate("")}
                    className="rounded-full"
                  >
                    No filter
                  </Button>
                  {dateOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        selectedDate === option.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedDate(option.value)}
                      className="rounded-full"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="flex-1"
              >
                CLEAR FILTERS
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                FILTER
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Filters - Sheet for Mobile only */}
      {isMobile && (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filter results</SheetTitle>
              <SheetDescription>
                Select criteria to filter reports
              </SheetDescription>
            </SheetHeader>

            <div
              className="space-y-6 py-4 overflow-y-auto"
              style={{ maxHeight: "calc(85vh - 150px)" }}
            >
              {/* Category */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground block">
                  Category
                </span>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <ListTree className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report status */}
              <div className="space-y-3">
                <span className="text-sm font-medium block">Report status</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedStatus === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus("")}
                    className="rounded-full"
                  >
                    No filter
                  </Button>
                  {statuses.map((status) => (
                    <Button
                      key={status.value}
                      variant={
                        selectedStatus === status.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedStatus(status.value)}
                      className="rounded-full"
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-3">
                <span className="text-sm font-medium block">Date</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDate === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDate("")}
                    className="rounded-full"
                  >
                    No filter
                  </Button>
                  {dateOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        selectedDate === option.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedDate(option.value)}
                      className="rounded-full"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t flex gap-3">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="flex-1"
              >
                CLEAR FILTERS
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                FILTER
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Dialog to request login */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login required</DialogTitle>
            <DialogDescription>
              You must log in to access this feature.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLoginPrompt(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={() => navigate("/login")} className="flex-1">
              Go to Log in
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legend Dialog */}
      <Dialog open={showLegend} onOpenChange={setShowLegend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Legend</DialogTitle>
            <DialogDescription>Report status legend</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold mb-3 text-sm">
                How to select a point on the map
              </h3>
              <p className="text-sm text-muted-foreground">
                Move the cursor or click on a point on the map
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">
                Report status legend
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#3B82F6" }}
                  />
                  <span className="text-sm">Pending Approval</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#F97316" }}
                  />
                  <span className="text-sm">Assigned</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#FACC15" }}
                  />
                  <span className="text-sm">In Progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#22C55E" }}
                  />
                  <span className="text-sm">Resolved</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#EF4444" }}
                  />
                  <span className="text-sm">Rejected</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: "#6B7280" }}
                  />
                  <span className="text-sm">Suspended</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
