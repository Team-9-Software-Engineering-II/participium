import { useState } from 'react';
import Navbar from '../components/common/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data vuoto - verranno caricati i dati reali dall'API
  const mockReports = [];

  const filteredReports = mockReports.filter(report =>
    report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Colonna sinistra - Lista Report */}
        <div className="w-[400px] border-r bg-card flex flex-col">
          {/* Search bar - Fixed */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca una segnalazione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Report count - Fixed */}
          <div className="px-4 py-2 border-b">
            <p className="text-sm text-muted-foreground">
              {filteredReports.length} segnalazioni trovate
            </p>
          </div>

          {/* Lista Report - Scrollabile */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna segnalazione</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Non ci sono ancora segnalazioni da visualizzare. Torna più tardi!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* I report appariranno qui quando disponibili */}
              </div>
            )}
          </div>
        </div>

        {/* Area centrale - Mappa (Work in Progress) */}
        <div className="flex-1 flex items-center justify-center bg-neutral-100">
          <div className="text-center space-y-4">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Mappa Interattiva</h2>
              <p className="text-muted-foreground">Work in Progress</p>
              <p className="text-sm text-muted-foreground mt-2">
                Qui verrà visualizzata la mappa con OpenStreetMap
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
