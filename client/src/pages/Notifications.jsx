import Navbar from '../components/common/Navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">
            View all your notifications and updates
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Center</CardTitle>
            <CardDescription>
              Stay updated on your reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications</p>
              <p className="text-sm mt-2">
                Notifications about your reports will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
