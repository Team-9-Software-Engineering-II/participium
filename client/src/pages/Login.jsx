import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '../components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
    if (hasError) setHasError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setHasError(false);
    setLoading(true);

    if (!formData.username || !formData.password) {
      setError('All fields are required');
      setHasError(true);
      setLoading(false);
      return;
    }

    const result = await login(formData);
    
    if (result.success) {
      navigate('/');
    } else {
      // Backend always returns "Invalid credentials" for security reasons
      // We can't distinguish between wrong username or wrong password
      setHasError(true);
      setError('Invalid credentials. Please check your username and password.');
      // Keep username for convenience, clear password
      setFormData({ ...formData, password: '' });
    }
    
    setLoading(false);
  };

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
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
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
                  ? 'border-destructive focus-visible:ring-destructive' 
                  : ''
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`pr-10 ${
                  hasError
                    ? 'border-destructive focus-visible:ring-destructive' 
                    : ''
                }`}
                autoComplete="current-password"
                autoFocus={hasError}
              />
              <button
                type="button"
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
          >
            {loading ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}