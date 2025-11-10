import Navbar from '../components/common/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, MapPin, Users, TrendingUp, Shield } from 'lucide-react';

export default function Info() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Cos'è Participium?</h1>
          <p className="text-xl text-muted-foreground">
            Il portale di partecipazione civica del Comune di Torino
          </p>
        </div>

        {/* Introduzione */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-lg leading-relaxed">
              Participium è la piattaforma digitale che mette in contatto i cittadini di Torino 
              con l'amministrazione comunale. Attraverso Participium puoi segnalare problemi, 
              monitorare l'avanzamento delle riparazioni e contribuire attivamente a migliorare 
              la tua città.
            </p>
          </CardContent>
        </Card>

        {/* Funzionalità */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle>Segnala Problemi</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fotografa e geolocalizza problemi nel tuo quartiere: buche stradali, 
                illuminazione pubblica, rifiuti, barriere architettoniche e molto altro.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle>Monitora i Progressi</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Segui in tempo reale lo stato delle tue segnalazioni: in attesa di approvazione, 
                assegnata, in corso o risolta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle>Partecipazione Attiva</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Contribuisci a rendere Torino migliore. Ogni segnalazione aiuta 
                l'amministrazione a intervenire dove serve.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle>Trasparenza</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Tutte le segnalazioni sono pubbliche e tracciabili, garantendo 
                massima trasparenza nel processo di risoluzione.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Come funziona */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Come funziona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Registrati</h3>
                <p className="text-muted-foreground">
                  Crea un account gratuito con la tua email per iniziare a segnalare.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Segnala</h3>
                <p className="text-muted-foreground">
                  Fotografa il problema, indica la posizione sulla mappa e seleziona la categoria appropriata.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Monitora</h3>
                <p className="text-muted-foreground">
                  Ricevi aggiornamenti sullo stato della tua segnalazione fino alla risoluzione.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-muted-foreground">
          <p>
            Per ulteriori informazioni, contatta il Comune di Torino o visita il sito ufficiale.
          </p>
        </div>
      </div>
    </div>
  );
}
