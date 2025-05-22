
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from "@/hooks/use-toast";
import { LogIn } from 'lucide-react'; // Using Lucide for consistency

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      toast({
        title: "Login Failed",
        description: signInError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard...",
      });
      router.push('/dashboard');
      router.refresh(); 
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl rounded-xl shadow-2xl bg-card text-card-foreground md:flex">
        {/* Branding Column */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-muted p-12 text-center rounded-l-xl">
          <Link href="/" className="mb-6">
            <AppLogo className="h-16 w-16 text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-primary mb-3">BillForge</h1>
          <p className="text-muted-foreground mb-8">
            Modern invoicing, simplified for you. Access your account to manage your invoices seamlessly.
          </p>
          <LogIn className="w-24 h-24 text-primary/70" />
        </div>

        {/* Form Column */}
        <div className="w-full md:w-1/2 p-8 sm:p-12">
          {/* Mobile Header (Logo only) */}
          <div className="md:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <AppLogo className="h-12 w-12 mx-auto text-primary" />
            </Link>
             <h2 className="text-2xl font-semibold mt-4">Welcome Back!</h2>
          </div>
           <div className="md:hidden text-center mb-6">
             <p className="text-sm text-muted-foreground">Sign in to continue to BillForge.</p>
           </div>

          {/* Desktop Header (Text only) */}
          <div className="hidden md:block text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Welcome Back!</h2>
            <p className="text-muted-foreground mt-2">Sign in to continue to BillForge.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <p>
              Don&apos;t have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto font-semibold">
                  <Link href="/signup">Sign up</Link>
              </Button>
            </p>
            {/* <Button variant="link" asChild className="p-0 h-auto text-xs">
               <Link href="/forgot-password">Forgot password?</Link>
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
