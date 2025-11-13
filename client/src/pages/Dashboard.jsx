import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MapPin, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { reportAPI } from '@/services/api';

const API_BASE_URL = 'http://localhost:3000';

// Helper function to get full image URL
const getImageUrl = (photoPath) => {
  if (!photoPath) return '';
  // If it's already a full URL, return as is
  if (photoPath.startsWith('http')) return photoPath;
  // Otherwise, prepend the base URL
  return `${API_BASE_URL}${photoPath}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState({});

  // Fetch address from coordinates
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();
      const road = data.address?.road || data.address?.pedestrian || "";
      const houseNumber = data.address?.house_number || "";
      return `${road} ${houseNumber}`.trim() || "Address not available";
    } catch (error) {
      console.error("Error fetching address:", error);
      return "Address not available";
    }
  };

  // Load user's reports from API
  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        setLoading(true);
        const response = await reportAPI.getAll();
        // Filter to get only the user's reports
        const userReports = response.data.filter(report => report.userId === user?.id);
        console.log("User reports:", userReports);
        console.log("First report photos:", userReports[0]?.photos);
        setMyReports(userReports);

        // Fetch addresses for all reports
        const addressPromises = userReports.map(async (report) => {
          if (report.latitude && report.longitude) {
            const address = await fetchAddress(report.latitude, report.longitude);
            return { id: report.id, address };
          }
          return { id: report.id, address: null };
        });

        const fetchedAddresses = await Promise.all(addressPromises);
        const addressMap = {};
        fetchedAddresses.forEach(({ id, address }) => {
          addressMap[id] = address;
        });
        setAddresses(addressMap);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setMyReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchMyReports();
    }
  }, [user?.id]);

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
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-4">
                  Loading your reports...
                </p>
              </div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No reports</p>
                <p className="text-sm mt-2">
                  You haven't created any reports yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">{report.title}</h3>
                      {report.status && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {report.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {/* Street Address */}
                      {addresses[report.id] && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{addresses[report.id]}</span>
                        </div>
                      )}
                      
                      {/* Coordinates */}
                      {report.latitude && report.longitude && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3 opacity-50" />
                          <span className="opacity-70">
                            {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {report.description && (
                        <p className="text-sm mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                    </div>
                    
                    {report.photos && report.photos.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {report.photos.slice(0, 3).map((photo, idx) => (
                          <img
                            key={idx}
                            src={getImageUrl(photo)}
                            alt={`Report photo ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded"
                            onError={(e) => {
                              console.error('Failed to load image:', photo);
                              e.target.style.display = 'none';
                            }}
                          />
                        ))}
                        {report.photos.length > 3 && (
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
                            +{report.photos.length - 3}
                          </div>
                        )}
                      </div>
                    )}
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
