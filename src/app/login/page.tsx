"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl bg-card text-card-foreground md:grid md:grid-cols-5 overflow-hidden">
        {/* Branding Column */}
        <div className="relative hidden md:flex md:col-span-2 flex-col items-center justify-center bg-primary p-12 text-primary-foreground">
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center">
            <Link
              href="/"
              className="mb-6 transition-transform hover:scale-105"
            >
              <AppLogo className="h-16 w-16" />
            </Link>
            <h1 className="text-3xl font-bold mb-3">BillForge</h1>
            <p className="text-primary-foreground/80 text-center mb-8">
              Modern invoicing, simplified for you. Access your account to
              manage your invoices seamlessly.
            </p>
            <LogIn className="w-24 h-24 opacity-80" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        </div>

        {/* Form Column */}
        <div className="w-full md:col-span-3 p-8 sm:p-12">
          {/* Mobile Header */}
          <div className="md:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <AppLogo className="h-12 w-12 mx-auto text-primary transition-transform hover:scale-105" />
            </Link>
            <h2 className="text-2xl font-semibold mt-4">Welcome Back!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to continue to BillForge.
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl font-bold">Welcome Back!</h2>
            <p className="text-muted-foreground mt-2">
              Sign in to continue to BillForge.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    "h-12 pl-10 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={cn(
                    "h-12 pl-10 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className={cn(
                "w-full h-12 text-base transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.01]",
                "active:scale-[0.99]"
              )}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Login <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                asChild
                className="p-0 h-auto font-semibold hover:text-primary"
              >
                <Link href="/signup">Create one now</Link>
              </Button>
            </p>
            <Button
              variant="ghost"
              asChild
              className="mt-2 text-xs text-muted-foreground hover:text-primary"
            >
              <Link href="/forgot-password">Forgot your password?</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
