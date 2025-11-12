import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
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
  X,
  SlidersHorizontal,
  Building2,
  ListTree,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { MapView } from "@/components/MapView";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Reports state
  const [allReports, setAllReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);

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
      try {
        setLoading(true);

        // Fetch all reports
        const allResponse = await fetch("http://localhost:3000/api/reports", {
          credentials: "include",
        });

        if (allResponse.ok) {
          const allData = await allResponse.json();
          setAllReports(allData);
        }

        // Fetch user's reports if authenticated
        if (isAuthenticated) {
          const myResponse = await fetch(
            "http://localhost:3000/api/reports/my",
            {
              credentials: "include",
            }
          );

          if (myResponse.ok) {
            const myData = await myResponse.json();
            setMyReports(myData);
          }
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [isAuthenticated]);

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

  // Filter reports based on search query
  const filteredReports = allReports.filter(
    (report) =>
      report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyReports = myReports.filter(
    (report) =>
      report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine which list to show
  const displayReports = showMyReports ? filteredMyReports : filteredReports;
  const totalResults = showMyReports
    ? filteredMyReports.length
    : filteredReports.length;

  const handleNewReport = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
    } else {
      navigate("/reports/new");
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedDate("");
  };

  const handleApplyFilters = () => {
    // Qui applicherai i filtri ai dati
    setShowFilters(false);
  };

  // Reusable Reports List component
  const ReportsList = () => {
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
                : "No reports to display yet. Check back later!"}
            </p>
          </div>
        ) : (
          displayReports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              <h3 className="font-semibold mb-2">{report.title}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {report.address ||
                      report.location ||
                      "Location not specified"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{report.User?.username || "Anonymous"}</span>
                </div>
              </div>
              {report.status && (
                <div className="mt-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {report.status}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Desktop Layout (md and above) - With sidebar */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Sidebar - Reports List */}
        <div className="w-96 border-r border-border bg-background flex flex-col relative">
          {/* Search Bar */}
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

          {/* My Reports Switch */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">My reports</span>
              <Switch
                checked={showMyReports}
                onCheckedChange={(checked) => {
                  if (!isAuthenticated && checked) {
                    // Se non loggato, attiva lo switch comunque
                    setShowMyReports(true);
                    return;
                  }
                  setShowMyReports(checked);
                }}
              />
            </div>
          </div>

          {/* Login message if not authenticated and switch active */}
          {!isAuthenticated && showMyReports ? (
            <div className="px-4 pb-4">
              <div className="bg-background rounded-lg p-4 text-center space-y-3 border">
                <p className="text-sm font-medium">
                  Log in to see your reports
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full"
                  size="sm"
                >
                  Log in
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {totalResults} results
                </p>
              </div>

              {/* Reports List */}
              <div className="flex-1 overflow-y-auto px-4">
                <ReportsList />
              </div>
            </>
          )}

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
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Right - Map */}
        <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-900 h-full">
          <div className="absolute inset-0 h-full z-0">
            <MapView />
          </div>
        </div>
      </div>

      {/* Mobile Layout (below md) - With bottom buttons */}
      <div className="md:hidden relative h-screen w-screen">
        {/* Map Area */}
        <div className="absolute inset-0 z-0">
          <MapView />
        </div>

        {/* Theme Toggle Button - Bottom Left (only when not logged in) */}
        {!isAuthenticated && (
          <Button
            onClick={() => {
              console.log('Toggle theme clicked, current theme:', theme);
              toggleTheme();
            }}
            variant="outline"
            size="icon"
            className="absolute bottom-1 left-4 z-[1001] h-12 w-12 rounded-full bg-white dark:bg-black backdrop-blur border-border"
          >
            {theme === "dark" ? (
              <Sun style={{ width: "20px", height: "20px" }} />
            ) : (
              <Moon style={{ width: "20px", height: "20px" }} />
            )}
          </Button>
        )}

        {/* Bottom buttons */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-between items-center px-4 z-10">
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
                {/* Search bar */}
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

                {/* My Reports Switch */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">My reports</span>
                  <Switch
                    checked={showMyReports}
                    onCheckedChange={(checked) => {
                      if (!isAuthenticated && checked) {
                        setShowMyReports(true);
                        return;
                      }
                      setShowMyReports(checked);
                    }}
                  />
                </div>

                {/* Login message if not authenticated and switch active */}
                {!isAuthenticated && showMyReports ? (
                  <div className="py-2">
                    <div className="bg-background rounded-lg p-4 text-center space-y-3 border">
                      <p className="text-sm font-medium">
                        Log in to see your reports
                      </p>
                      <Button
                        onClick={() => navigate("/login")}
                        className="w-full"
                        size="sm"
                      >
                        Log in
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Results count */}
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {totalResults} results
                      </p>
                    </div>

                    {/* Reports List - Scrollable */}
                    <div
                      className="overflow-y-auto"
                      style={{ maxHeight: "calc(80vh - 400px)" }}
                    >
                      <ReportsList />
                    </div>
                  </>
                )}
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
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
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
                <label className="text-sm font-medium">Report status</label>
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
                <label className="text-sm font-medium">Date</label>
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
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
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
                <label className="text-sm font-medium">Report status</label>
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
                <label className="text-sm font-medium">Date</label>
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
            <Button
              onClick={() => navigate('/login')}
              className="flex-1"
            >
              Go to Log in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
