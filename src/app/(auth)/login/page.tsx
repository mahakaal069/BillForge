"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/ui/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, Building, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Attempt to sign in
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      if (!data.session) {
        throw new Error("Failed to create session");
      }

      // Show success message
      toast({
        title: "Success",
        description: "Successfully logged in. Redirecting...",
      });

      // Wait for session to be set
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Use router.push instead of window.location
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message);
      toast({
        title: "Login Failed",
        description:
          error.message || "Please check your credentials and try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex w-full max-w-5xl h-[600px] shadow-xl rounded-xl overflow-hidden">
        {/* Left Column - Brand/Logo Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex md:w-1/2 bg-primary flex-col justify-center items-center p-8 text-white"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20 
            }}
            className="mb-8"
          >
            <AppLogo className="h-24 w-auto" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center max-w-md"
          >
            <h1 className="text-4xl font-bold mb-4">Invoice DOS</h1>
            <p className="text-lg opacity-90 mb-6">Manage your invoices and billing with ease</p>
            
            <div className="flex flex-col space-y-6 mt-10">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center space-x-3"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Building className="h-6 w-6" />
                </div>
                <span className="text-white font-medium">MSME Vendors</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center space-x-3"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-white font-medium">Buyers</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center space-x-3"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Briefcase className="h-6 w-6" />
                </div>
                <span className="text-white font-medium">Financiers</span>
              </motion.div>
            </div>
            
            <div className="flex justify-center space-x-3 mt-10">
              <div className="h-2 w-2 rounded-full bg-white opacity-70"></div>
              <div className="h-2 w-2 rounded-full bg-white"></div>
              <div className="h-2 w-2 rounded-full bg-white opacity-70"></div>
            </div>
          </motion.div>
        </motion.div>
        
        {/* Right Column - Login Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full md:w-1/2 bg-white p-8 flex flex-col justify-center"
        >
          <div className="md:hidden flex justify-center mb-6">
            <AppLogo className="h-16 w-auto" />
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Don't have an account?{" "}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="email" className="text-sm font-medium block mb-1.5">
                Email address
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 w-full"
                  placeholder="Enter your email"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 w-full"
                  placeholder="Enter your password"
                />
                <div 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  )}
                </div>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-md bg-destructive/10 flex items-center text-destructive text-sm"
              >
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="pt-2"
            >
              <Button
                type="submit"
                className={cn(
                  "w-full h-11", 
                  loading && "opacity-70 cursor-not-allowed"
                )}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-5 w-5 border-t-2 border-b-2 border-current rounded-full animate-spin mr-2" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LogIn className="mr-2 h-5 w-5" />
                    <span>Sign in</span>
                  </div>
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
