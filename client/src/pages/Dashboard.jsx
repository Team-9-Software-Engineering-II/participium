import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock data - real reports will be loaded from API
  const myReports = [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">
            Manage your reports and contribute to improving the city
          </p>
        </div>

        {/* My Reports */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle>My Reports</CardTitle>
            <CardDescription>
              View and manage all your reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No reports</p>
                <p className="text-sm mt-2">
                  You haven't created any reports yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Reports will be displayed here */}
                {myReports.map((report, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    {/* Report card content */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Report Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/reports/new')}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Create New Report
          </Button>
        </div>
      </main>
    </div>
  );
}
