
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLogo } from '@/components/AppLogo';
import { useToast } from "@/hooks/use-toast";
import { UserRole } from '@/types/user';
import { UserPlus } from 'lucide-react'; // Using Lucide for consistency

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
          role: role,
        },
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
      setMessage("User may already exist or confirmation is pending. Please check your email or try logging in.");
      toast({
        title: "Confirmation May Be Required",
        description: "User may already exist or confirmation is pending. Please check your email or try logging in.",
      });
    } else if (data.user) {
      setMessage('Signup successful! Please check your email to confirm your account if required, or try logging in.');
      toast({
        title: "Signup Successful!",
        description: "Your account has been created. You can now try logging in.",
      });
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
      <div className="w-full max-w-4xl rounded-xl shadow-2xl bg-card text-card-foreground md:flex">
        {/* Branding Column */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-muted p-12 text-center rounded-l-xl">
          <Link href="/" className="mb-6">
            <AppLogo className="h-16 w-16 text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-primary mb-3">Join BillForge</h1>
          <p className="text-muted-foreground mb-8">
            Create your account to start managing invoices efficiently. Choose your role and get started!
          </p>
          <UserPlus className="w-24 h-24 text-primary/70" />
        </div>

        {/* Form Column */}
        <div className="w-full md:w-1/2 p-8 sm:p-12">
          {/* Mobile Header (Logo only) */}
           <div className="md:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <AppLogo className="h-12 w-12 mx-auto text-primary" />
            </Link>
             <h2 className="text-2xl font-semibold mt-4">Create Your Account</h2>
          </div>
           <div className="md:hidden text-center mb-6">
             <p className="text-sm text-muted-foreground">Join BillForge today to streamline your invoicing.</p>
           </div>

           {/* Desktop Header (Text only) */}
          <div className="hidden md:block text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Create Your Account</h2>
            <p className="text-muted-foreground mt-2">Join BillForge today to streamline your invoicing.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
                className="h-11"
              />
               <p className="text-xs text-muted-foreground">Password should be at least 6 characters.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">I am a...</Label>
              <Select 
                value={role} 
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={loading}
                required
              >
                <SelectTrigger id="role" className="h-11">
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
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <p>
              Already have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto font-semibold">
                  <Link href="/login">Login</Link>
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
