import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock data - verranno caricate le segnalazioni reali dall'API
  const myReports = [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Benvenuto, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">
            Gestisci le tue segnalazioni e contribuisci al miglioramento della città
          </p>
        </div>

        {/* Le Mie Segnalazioni */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Le Mie Segnalazioni</CardTitle>
            <CardDescription>
              Visualizza e gestisci tutte le tue segnalazioni
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nessuna segnalazione</p>
                <p className="text-sm mt-2">
                  Non hai ancora creato nessuna segnalazione
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Qui verranno visualizzate le segnalazioni */}
                {myReports.map((report, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    {/* Report card content */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pulsante Nuova Segnalazione */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/reports/new')}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Crea Nuova Segnalazione
          </Button>
        </div>
      </main>
    </div>
  );
}
