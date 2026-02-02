import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Leaf, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-cover bg-center relative"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1767294274634-613a3545e36d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZmFjdG9yeSUyMGludGVyaW9yJTIwY2xlYW58ZW58MHx8fHwxNzcwMDM5NTc1fDA&ixlib=rb-4.1.0&q=85')` 
        }}
      >
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 p-12 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-white">PCF Manager</span>
          </div>
          <div className="max-w-md">
            <h1 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-6">
              Product Carbon Footprint Management
            </h1>
            <p className="text-white/80 text-lg">
              Track, calculate, and certify your product emissions with precision. 
              Built for manufacturing excellence.
            </p>
          </div>
          <div className="text-white/60 text-sm">
            © 2024 PCF Manager. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-primary">PCF Manager</span>
          </div>

          <div className="grid-card rounded-md">
            <div className="mb-8">
              <h2 className="font-heading text-2xl font-bold text-primary mb-2">Sign In</h2>
              <p className="text-muted-foreground">Enter your credentials to access the platform</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="label-style">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pcf.com"
                  required
                  className="h-11"
                  data-testid="login-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="label-style">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11"
                  data-testid="login-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 btn-animate bg-primary hover:bg-primary/90"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-200">
              <p className="text-sm text-muted-foreground text-center">
                Demo credentials: <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">admin@pcf.com</span> / <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
