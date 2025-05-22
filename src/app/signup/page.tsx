
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from "@/hooks/use-toast";
import { UserRole } from '@/types/user';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      toast({
        title: "Role Required",
        description: "Please select whether you are an MSME or a Buyer.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role, // Pass the selected role here
        },
        // emailRedirectTo: `${window.location.origin}/auth/callback`, // Optional: if you have email confirmation enabled
      },
    });

    if (signUpError) {
      setError(signUpError.message);
       toast({
        title: "Signup Failed",
        description: signUpError.message,
        variant: "destructive",
      });
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // This case might indicate email confirmation is pending if enabled and user already exists but unconfirmed
      setMessage("User may already exist or confirmation is pending. Please check your email or try logging in.");
      toast({
        title: "Confirmation May Be Required",
        description: "User may already exist or confirmation is pending. Please check your email or try logging in.",
      });
    } else if (data.user) {
      setMessage('Signup successful! Please check your email to confirm your account if required, or try logging in.');
      toast({
        title: "Signup Successful!",
        description: "Please check your email to confirm your account if required. You can now try logging in.",
      });
      // You might want to redirect to login or a "check your email" page
      // router.push('/login'); 
    } else {
       setError("An unexpected error occurred during signup.");
       toast({
        title: "Signup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Link href="/" className="mb-4">
            <AppLogo className="h-12 w-12" />
          </Link>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Join BillForge to manage your invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
               <p className="text-xs text-muted-foreground">Password should be at least 6 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">I am a...</Label>
              <Select 
                value={role} 
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.MSME}>MSME (Enterprise/Seller)</SelectItem>
                  <SelectItem value={UserRole.BUYER}>Buyer (Customer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <p>
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/login">Login</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
