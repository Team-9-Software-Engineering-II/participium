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
          <h1 className="text-4xl font-bold mb-4">What is Participium?</h1>
          <p className="text-xl text-muted-foreground">
            The civic participation portal of the City of Turin
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-lg leading-relaxed">
              Participium is the digital platform that connects Turin citizens 
              with the municipal administration. Through Participium you can report problems, 
              monitor the progress of repairs and actively contribute to improving 
              your city.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle>Report Problems</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Photograph and geolocate problems in your neighborhood: potholes, 
                public lighting, waste, architectural barriers and much more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle>Monitor Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track the status of your reports in real time: pending approval, 
                assigned, in progress or resolved.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle>Active Participation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Help make Turin better. Every report helps 
                the administration to intervene where needed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle>Transparency</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                All reports are public and traceable, ensuring 
                maximum transparency in the resolution process.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How does it work?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Register</h3>
                <p className="text-muted-foreground">
                  Create a free account with your email to start reporting.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Report</h3>
                <p className="text-muted-foreground">
                  Photograph the problem, indicate the location on the map and select the appropriate category.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Monitor</h3>
                <p className="text-muted-foreground">
                  Receive updates on the status of your report until it is resolved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-muted-foreground">
          <p>
            For more information, contact the City of Turin or visit the official website.
          </p>
        </div>
      </div>
    </div>
  );
}
