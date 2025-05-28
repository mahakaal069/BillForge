"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/ui/AppLogo";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle, Building, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user";
import { motion } from "framer-motion";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.MSME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user, session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (user) {
        // Create profile in the profiles table
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: email.toLowerCase(),
          full_name: fullName,
          role: role,
        });

        if (profileError) throw profileError;

        toast({
          title: "Account created successfully!",
          description: "Please check your email to confirm your account.",
        });

        // If we have a session, redirect to dashboard, otherwise to login
        if (session) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-lg opacity-90 mb-6">Join our platform today</p>
            
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
        
        {/* Right Column - Signup Form */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full md:w-1/2 bg-white p-8 flex flex-col justify-center overflow-y-auto"
        >
          <div className="md:hidden flex justify-center mb-6">
            <AppLogo className="h-16 w-auto" />
          </div>
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="fullName" className="text-sm font-medium block mb-1.5">
                Full name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-11 w-full"
                  placeholder="Enter your full name"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
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
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="password" className="text-sm font-medium block mb-1.5">
                Password
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 w-full"
                  placeholder="Create a password"
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

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="role" className="text-sm font-medium block mb-1.5">
                I am a...
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={role === UserRole.MSME ? "default" : "outline"}
                  className={cn(
                    "relative flex items-center justify-center h-11",
                    role === UserRole.MSME &&
                      "ring-2 ring-offset-1 ring-offset-background ring-primary"
                  )}
                  onClick={() => setRole(UserRole.MSME)}
                >
                  <Building className="h-4 w-4 mr-1.5" />
                  <span>MSME</span>
                </Button>
                <Button
                  type="button"
                  variant={role === UserRole.BUYER ? "default" : "outline"}
                  className={cn(
                    "relative flex items-center justify-center h-11",
                    role === UserRole.BUYER &&
                      "ring-2 ring-offset-1 ring-offset-background ring-primary"
                  )}
                  onClick={() => setRole(UserRole.BUYER)}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  <span>Buyer</span>
                </Button>
                <Button
                  type="button"
                  variant={role === UserRole.FINANCIER ? "default" : "outline"}
                  className={cn(
                    "relative flex items-center justify-center h-11",
                    role === UserRole.FINANCIER &&
                      "ring-2 ring-offset-1 ring-offset-background ring-primary"
                  )}
                  onClick={() => setRole(UserRole.FINANCIER)}
                >
                  <Briefcase className="h-4 w-4 mr-1.5" />
                  <span>Financier</span>
                </Button>
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
              transition={{ delay: 0.5 }}
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
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    <span>Create account</span>
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
