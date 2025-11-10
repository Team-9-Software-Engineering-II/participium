import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Plus, List, Clock, User, Moon, Sun, X, SlidersHorizontal, Building2, ListTree } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Rilevamento mobile/desktop
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Filtri
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Categorie disponibili
  const categories = [
    'Water Supply – Drinking Water',
    'Architectural Barriers',
    'Sewer System',
    'Public Lighting',
    'Waste',
    'Road Signs and Traffic Lights',
    'Roads and Urban Furnishings',
    'Public Green Areas and Playgrounds',
    'Other'
  ];

  // Stati disponibili
  const statuses = [
    { value: 'Pending Approval', label: 'Da assegnare' },
    { value: 'Assigned', label: 'Assegnata' },
    { value: 'In Progress', label: 'In lavorazione' },
    { value: 'Suspended', label: 'Sospesa' },
    { value: 'Rejected', label: 'Rifiutata' },
    { value: 'Resolved', label: 'Chiusa' }
  ];

  // Opzioni data
  const dateOptions = [
    { value: 'today', label: 'Oggi' },
    { value: 'week', label: 'Ultima settimana' },
    { value: 'month', label: 'Questo mese' },
    { value: 'custom', label: 'Scegli date' }
  ];

  // Mock data vuoto - verranno caricati i dati reali dall'API
  const mockReports = [];
  const mockMyReports = []; // Segnalazioni dell'utente loggato

  const filteredReports = mockReports.filter(report =>
    report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyReports = mockMyReports.filter(report =>
    report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determina quale lista mostrare
  const displayReports = showMyReports ? filteredMyReports : filteredReports;
  const totalResults = showMyReports ? filteredMyReports.length : filteredReports.length;

  const handleNewReport = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
    } else {
      navigate('/reports/new');
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedDate('');
  };

  const handleApplyFilters = () => {
    // Qui applicherai i filtri ai dati
    setShowFilters(false);
  };

  // Componente Lista Segnalazioni riutilizzabile
  const ReportsList = () => (
    <div className="space-y-3">
      {displayReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessuna segnalazione</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {showMyReports 
              ? "Non hai ancora creato nessuna segnalazione"
              : "Non ci sono ancora segnalazioni da visualizzare. Torna più tardi!"}
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
                <span>{report.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{report.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{report.author}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      
      {/* Layout Desktop (md e superiori) - Con sidebar */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Sidebar Sinistra - Lista Segnalazioni */}
        <div className="w-96 border-r border-border bg-background flex flex-col relative">
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca una segnalazione"
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

          {/* Switch Le mie segnalazioni */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Le mie segnalazioni</span>
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

          {/* Messaggio Login se non autenticato e switch attivo */}
          {!isAuthenticated && showMyReports ? (
            <div className="px-4 pb-4">
              <div className="bg-background rounded-lg p-4 text-center space-y-3 border">
                <p className="text-sm font-medium">
                  Effettua il login per vedere le tue segnalazioni
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                  size="sm"
                >
                  Login
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Conteggio risultati */}
              <div className="px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {totalResults} risultati
                </p>
              </div>

              {/* Reports List */}
              <div className="flex-1 overflow-y-auto px-4">
                <ReportsList />
              </div>
            </>
          )}

          {/* Pulsante Theme Toggle - Bottom Left (solo quando non loggato) */}
          {!isAuthenticated && (
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="absolute bottom-6 left-6 h-14 w-14 rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50"
            >
              {theme === 'dark' ? (
                <Sun style={{ width: '20px', height: '20px' }} />
              ) : (
                <Moon style={{ width: '20px', height: '20px' }} />
              )}
            </Button>
          )}

          {/* Pulsante + in basso a destra */}
          <Button
            onClick={handleNewReport}
            className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Destra - Mappa */}
        <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
          <div className="text-center space-y-4 p-4">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Mappa Interattiva</h2>
              <p className="text-base text-muted-foreground">Work in Progress</p>
              <p className="text-sm text-muted-foreground mt-2">
                Qui verrà visualizzata la mappa con OpenStreetMap
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Mobile (sotto md) - Con pulsanti in basso */}
      <div className="md:hidden flex-1 relative">
        {/* Area Mappa (Work in Progress) */}
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
          <div className="text-center space-y-4 p-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-xl font-bold mb-2">Mappa Interattiva</h2>
              <p className="text-sm text-muted-foreground">Work in Progress</p>
              <p className="text-xs text-muted-foreground mt-2">
                Qui verrà visualizzata la mappa con OpenStreetMap
              </p>
            </div>
          </div>
        </div>

        {/* Pulsante Theme Toggle - Bottom Left (solo quando non loggato) */}
        {!isAuthenticated && (
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-4 z-10 h-12 w-12 rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          >
            {theme === 'dark' ? (
              <Sun style={{ width: '20px', height: '20px' }} />
            ) : (
              <Moon style={{ width: '20px', height: '20px' }} />
            )}
          </Button>
        )}

        {/* Pulsanti in basso */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between items-center px-4">
          {/* Spazio vuoto a sinistra per bilanciare */}
          <div className="w-14"></div>
          
          {/* Pulsante Lista Segnalazioni - Centro */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="lg"
                variant="default"
                className="shadow-lg gap-2 h-12 px-4"
              >
                <List className="h-5 w-5" />
                <span className="text-sm">Lista segnalazioni</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Segnalazioni</SheetTitle>
                <SheetDescription>
                  Visualizza e gestisci le segnalazioni
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-4 space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca una segnalazione"
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

                {/* Switch Le mie segnalazioni */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">Le mie segnalazioni</span>
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

                {/* Messaggio Login se non autenticato e switch attivo */}
                {!isAuthenticated && showMyReports ? (
                  <div className="py-2">
                    <div className="bg-background rounded-lg p-4 text-center space-y-3 border">
                      <p className="text-sm font-medium">
                        Effettua il login per vedere le tue segnalazioni
                      </p>
                      <Button
                        onClick={() => navigate('/login')}
                        className="w-full"
                        size="sm"
                      >
                        Login
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Conteggio risultati */}
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {totalResults} risultati
                      </p>
                    </div>

                    {/* Lista Report - Scrollabile */}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 400px)' }}>
                      <ReportsList />
                    </div>
                  </>
                )}
              </div>

              {/* Pulsante + fisso in basso a destra dentro lo Sheet */}
              <Button
                onClick={handleNewReport}
                className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
              >
                <Plus className="h-6 w-6" />
              </Button>
            </SheetContent>
          </Sheet>

          {/* Pulsante Nuova Segnalazione - Destra */}
          <Button
            size="lg"
            onClick={handleNewReport}
            className="shadow-lg rounded-full h-14 w-14 p-0"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Dialog Filtri - Desktop only */}
      {!isMobile && (
        <Dialog open={showFilters} onOpenChange={setShowFilters}>
          <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtra i risultati</DialogTitle>
            <DialogDescription>
              Seleziona i criteri per filtrare le segnalazioni
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipologia (Category) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tipologia</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Seleziona tipologia" />
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

            {/* Stato segnalazione */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Stato segnalazione</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedStatus === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('')}
                  className="rounded-full"
                >
                  Nessun filtro
                </Button>
                {statuses.map((status) => (
                  <Button
                    key={status.value}
                    variant={selectedStatus === status.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                    className="rounded-full"
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Data</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDate === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate('')}
                  className="rounded-full"
                >
                  Nessun filtro
                </Button>
                {dateOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedDate === option.value ? 'default' : 'outline'}
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

          {/* Footer con pulsanti */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="flex-1"
            >
              RIMUOVI FILTRO
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1"
            >
              FILTRA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Filtri - Sheet per Mobile only */}
      {isMobile && (
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Filtra i risultati</SheetTitle>
            <SheetDescription>
              Seleziona i criteri per filtrare le segnalazioni
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 150px)' }}>
            {/* Tipologia (Category) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tipologia</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Seleziona tipologia" />
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

            {/* Stato segnalazione */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Stato segnalazione</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedStatus === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus('')}
                  className="rounded-full"
                >
                  Nessun filtro
                </Button>
                {statuses.map((status) => (
                  <Button
                    key={status.value}
                    variant={selectedStatus === status.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                    className="rounded-full"
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Data</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedDate === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDate('')}
                  className="rounded-full"
                >
                  Nessun filtro
                </Button>
                {dateOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedDate === option.value ? 'default' : 'outline'}
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

          {/* Footer con pulsanti */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t flex gap-3">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="flex-1"
            >
              RIMUOVI FILTRO
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1"
            >
              FILTRA
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      )}

      {/* Dialog per richiedere login */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accesso richiesto</DialogTitle>
            <DialogDescription>
              Devi effettuare il login per accedere a questa funzionalità.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLoginPrompt(false)}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={() => navigate('/login')}
              className="flex-1"
            >
              Vai al Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
