import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthLayout from "../components/auth/AuthLayout";
import { Eye, EyeOff, ShieldCheck, UserCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, selectInitialRole } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
    if (hasError) setHasError(false);
  };

  const handleRoleSelection = (role) => {
    selectInitialRole(role);
    
    const roleValue = String(role?.name ?? "").trim().toLowerCase();
    
    if (roleValue.includes("admin")) {
      navigate("/admin");
    } else if (roleValue.includes("municipal") || roleValue.includes("officer")) {
      navigate("/municipal/dashboard");
    } else if (roleValue.includes("technical") || roleValue.includes("staff")) {
      navigate("/technical/reports/active");
    } else {
      navigate("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setHasError(false);
    setLoading(true);

    if (!formData.username || !formData.password) {
      setError("All fields are required");
      setHasError(true);
      setLoading(false);
      return;
    }

    const result = await login(formData);

    if (result.success) {
      const userRoles = result.user?.roles || [];
      const technicalOffices = result.user?.technicalOffices || [];
      const company = result.user?.company;
      
      console.log('Login result:', { userRoles, technicalOffices, company });
      
      // Se l'utente ha più di un ruolo, mostra la schermata di selezione
      if (userRoles.length > 1) {
        // Arricchisci i ruoli con info aggiuntive
        const enrichedRoles = userRoles.map(role => {
          const roleName = role.name.toLowerCase();
          return {
            ...role,
            technicalOffices: roleName.includes('technical') ? technicalOffices : undefined,
            company: roleName.includes('external') || roleName.includes('maintainer') ? company : undefined,
          };
        });
        setAvailableRoles(enrichedRoles);
        setShowRoleSelection(true);
        setLoading(false);
        return;
      }
      
      // Se ha un solo ruolo, lo imposta automaticamente e naviga
      if (userRoles.length === 1) {
        handleRoleSelection(userRoles[0]);
      } else {
        // Nessun ruolo? (caso strano, ma gestiamolo)
        navigate("/");
      }
    } else {
      // Backend always returns "Invalid credentials" for security reasons
      // We can't distinguish between wrong username or wrong password
      setHasError(true);
      setError("Invalid credentials. Please check your username and password.");
      // Keep username for convenience, clear password
      setFormData({ ...formData, password: "" });
    }

    setLoading(false);
  };

  // Se sta mostrando la selezione ruolo, mostra quella schermata
  if (showRoleSelection) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Select Your Role</h1>
            <p className="text-sm text-muted-foreground">
              You have multiple roles. Choose how you want to log in.
            </p>
          </div>

          <div className="space-y-3">
            {availableRoles.map((role) => {
              // Converti nome ruolo in formato leggibile
              let displayName = role.name;
              if (role.name === 'admin') {
                displayName = 'Admin';
              } else if (role.name === 'municipal_public_relations_officer') {
                displayName = 'Municipality Officer';
              } else if (role.name === 'technical_staff') {
                displayName = 'Technical Staff';
              } else if (role.name === 'external_maintainer') {
                displayName = 'External Maintainer';
              } else if (role.name === 'citizen') {
                displayName = 'Citizen';
              }

              // Costruisci una descrizione personalizzata
              let description = '';
              if (role.name === 'admin') {
                description = 'Manage users, roles, and system settings';
              } else if (role.name === 'municipal_public_relations_officer') {
                description = 'Review and assign reports';
              } else if (role.name === 'technical_staff') {
                if (role.technicalOffices && role.technicalOffices.length > 0) {
                  const officeNames = role.technicalOffices.map(o => o.name).join(', ');
                  description = `Manage reports for: ${officeNames}`;
                } else {
                  description = 'Manage assigned reports';
                }
              } else if (role.name === 'external_maintainer') {
                if (role.company) {
                  description = `External maintainer for ${role.company.name}`;
                } else {
                  description = 'External maintenance worker';
                }
              } else if (role.name === 'citizen') {
                description = 'Create and track your reports';
              }

              return (
                <Card 
                  key={role.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleRoleSelection(role)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <UserCircle2 className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{displayName}</CardTitle>
                        <CardDescription className="text-xs">
                          {description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setShowRoleSelection(false);
              setAvailableRoles([]);
            }}
          >
            Back to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to log in
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
              data-cy="error-message"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="name@example.com"
              value={formData.username}
              onChange={handleChange}
              required
              className={
                hasError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`pr-10 ${
                  hasError
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
                autoComplete="current-password"
                autoFocus={hasError}
              />
              <button
                type="button"
                data-cy="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-cy="submit-button"
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
