import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Rotta pubblica - Home page */}
          <Route path="/" element={<Home />} />
          
          {/* Pagina Info */}
          <Route path="/info" element={<Info />} />
          
          {/* Rotte di autenticazione */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Rotte protette */}
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
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
