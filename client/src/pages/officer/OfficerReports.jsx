import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { urpAPI, reportAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Paperclip } from 'lucide-react';
import { format } from 'date-fns';

export default function OfficerReports({ status }) {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [status]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let data = [];
      
      if (status === 'pending') {
        const response = await urpAPI.getPendingReports();
        data = response.data;
      } else {
        const response = await reportAPI.getAll();
        const targetStatus = status === 'assigned' ? 'Assigned' : 'Rejected';
        data = response.data.filter(r => r.status === targetStatus);
      }
      
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch reports", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight capitalize">{status} Reports</h1>
        <p className="text-muted-foreground">
          {status === 'pending' 
            ? 'Review and manage incoming citizen reports.' 
            : `View ${status} reports history.`}
        </p>
      </div>

      {/* MODIFICA QUI: gap-6 e lg:grid-cols-2 per avere card più grandi e 2 per riga */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {reports.length === 0 && (
          <div className="col-span-full py-12 text-center border rounded-lg border-dashed text-muted-foreground">
            No reports found in this section.
          </div>
        )}
        {reports.map((report) => (
          <Card 
            key={report.id} 
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group" 
            onClick={() => navigate(`/reports/${report.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <Badge variant={status === 'pending' ? 'outline' : 'secondary'} className="truncate max-w-[200px]">
                  {report.category?.name || 'Uncategorized'}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap group-hover:text-primary transition-colors pt-1">
                  {format(new Date(report.createdAt || Date.now()), 'dd/MM/yyyy')}
                </span>
              </div>
              <CardTitle className="text-xl mt-3 line-clamp-1 group-hover:text-primary transition-colors">
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px] leading-relaxed">
                {report.description}
              </p>
              {report.photos && report.photos.length > 0 && (
                 <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs font-medium text-primary">
                   <Paperclip className="w-4 h-4" /> 
                   {report.photos.length} attachment{report.photos.length !== 1 ? 's' : ''}
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}