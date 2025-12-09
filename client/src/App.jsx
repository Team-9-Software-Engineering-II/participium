import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Info from './pages/Info';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminLayout from './pages/admin/AdminLayout';
import Overview from './pages/admin/Overview';
import MunicipalityUsers from './pages/admin/MunicipalityUsers';
import Reports from './pages/admin/Reports';
import CreateReport from './pages/CreateReport';
import ReportDetails from './pages/ReportDetails';
import OfficerLayout from './pages/officer/OfficerLayout';
import OfficerReports from './pages/officer/OfficerReports';
import TechnicianLayout from './pages/technician/TechnicianLayout';
import TechnicianReports from './pages/technician/TechnicianReports';
import { Toaster } from "@/components/ui/sonner"

// Componente spostato fuori da App per risolvere S6478
const HomeRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'municipal' || user?.role === 'officer') {
    return <Navigate to="/municipal/dashboard" replace />;
  }
  if (user?.role === 'technical') {
    return <Navigate to="/technical/dashboard" replace />;
  }
  return <Home />;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/info" element={<Info />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={<AdminLayout />}
          >
            <Route index element={<Overview />} />
            <Route path="municipality-users" element={<MunicipalityUsers />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          <Route 
            path="/reports/new" 
            element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            } 
          />

          {/* Nuova rotta per il dettaglio report */}
          <Route 
            path="/reports/:id" 
            element={
              <ProtectedRoute>
                <ReportDetails />
              </ProtectedRoute>
            } 
          />

          <Route path="/municipal" element={
            <ProtectedRoute>
              <OfficerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OfficerReports status="pending" />} />
            <Route path="assigned" element={<OfficerReports status="assigned" />} />
            <Route path="rejected" element={<OfficerReports status="rejected" />} />
          </Route>

          <Route path="/technical" element={
              <ProtectedRoute>
                <TechnicianLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="reports/active" replace />} />
              <Route path="reports/active" element={<TechnicianReports type="active" />} />
              <Route path="reports/maintainer" element={<TechnicianReports type="maintainer" />} />
              <Route path="reports/history" element={<TechnicianReports type="history" />} />
            </Route>

        </Routes>

        <Toaster />

        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;