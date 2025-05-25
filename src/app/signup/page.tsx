"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/user";
import {
  UserPlus,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      toast({
        title: "Role Required",
        description:
          "Please select whether you are an MSME, Buyer, or Financier.",
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
    } else if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setMessage(
        "User may already exist or confirmation is pending. Please check your email or try logging in."
      );
      toast({
        title: "Confirmation May Be Required",
        description:
          "User may already exist or confirmation is pending. Please check your email or try logging in.",
      });
    } else if (data.user) {
      setMessage(
        "Signup successful! Please check your email to confirm your account."
      );
      toast({
        title: "Signup Successful!",
        description:
          "Your account has been created. Please check your email to confirm your account.",
      });
      router.push("/login");
    }
    setLoading(false);
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case UserRole.MSME:
        return Building2;
      case UserRole.BUYER:
        return User;
      case UserRole.FINANCIER:
        return Building2;
      default:
        return User;
    }
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
            <h1 className="text-3xl font-bold mb-3">Join BillForge</h1>
            <p className="text-primary-foreground/80 text-center mb-8">
              Create your account to start managing invoices efficiently. Choose
              your role and get started!
            </p>
            <UserPlus className="w-24 h-24 opacity-80" />
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
            <h2 className="text-2xl font-semibold mt-4">Create Your Account</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Join BillForge today to streamline your invoicing.
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl font-bold">Create Your Account</h2>
            <p className="text-muted-foreground mt-2">
              Join BillForge today to streamline your invoicing.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                  minLength={6}
                  required
                  disabled={loading}
                  className={cn(
                    "h-12 pl-10 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                I am a...
              </Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={loading}
              >
                <SelectTrigger
                  id="role"
                  className={cn(
                    "h-12 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                  aria-required="true"
                >
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>{" "}
                <SelectContent>
                  <SelectItem
                    value={UserRole.MSME}
                    className="relative flex h-9 cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      MSME (Enterprise/Seller)
                    </div>
                  </SelectItem>
                  <SelectItem
                    value={UserRole.BUYER}
                    className="relative flex h-9 cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <User className="h-4 w-4 flex-shrink-0" />
                      Buyer (Client/Customer)
                    </div>
                  </SelectItem>
                  <SelectItem
                    value={UserRole.FINANCIER}
                    className="relative flex h-9 cursor-default select-none items-center rounded-sm px-2 py-1.5 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      Financier
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                {message}
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
                  Creating your account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button
                variant="link"
                asChild
                className="p-0 h-auto font-semibold hover:text-primary"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
