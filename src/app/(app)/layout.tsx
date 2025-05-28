"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, createContext, useContext } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { UserRole, type Profile } from "@/types/user"; // Import Profile type

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/components/ui/AppLogo";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Home,
  Settings,
  User,
  LogOut,
  LogIn,
  Briefcase,
  Building,
  Landmark,
} from "lucide-react"; // Added Landmark
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "./requireAuth";

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  session: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  session: false,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  const router = useRouter();

  // Initial session check and setup auth listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setLoading(false);
          return;
        }

        if (initialSession?.user) {
          console.log("Initial session found:", initialSession.user.email);
          setUser(initialSession.user);
          setSession(true);

          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", initialSession.user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
          }

          if (mounted && profileData) {
            setProfile(profileData);
          }
        } else {
          console.log("No initial session found");
          setSession(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setSession(false);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log("Auth state changed:", event, currentSession?.user?.email);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (currentSession?.user) {
          console.log("Setting user and session:", currentSession.user.email);
          setUser(currentSession.user);
          setSession(true);

          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentSession.user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
          }

          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setUser(null);
        setProfile(null);
        setSession(false);
        // Use a more reliable navigation method
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // First update local state
      setUser(null);
      setProfile(null);
      setSession(false);

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error during sign out:", error);
        // Even if there's an error, we should still redirect
      }

      // Use router.push instead of window.location
      router.push("/login");
    } catch (error) {
      console.error("Error during sign out:", error);
      // If there's an error, still try to redirect
      router.push("/login");
    }
  };

  const value = {
    user,
    profile,
    loading,
    session,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function UserNav() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  // Add memo to prevent unnecessary re-renders
  const userDisplayData = React.useMemo(() => {
    if (!user) return null;
    return {
      email: user.email || "User",
      fallbackInitial: (user.email || "U").charAt(0).toUpperCase(),
      role: profile?.role,
    };
  }, [user, profile]);

  // Memoize role icon to prevent unnecessary re-renders
  const RoleIcon = React.useMemo(() => {
    if (!userDisplayData?.role) return User;
    if (userDisplayData.role === UserRole.MSME) return Briefcase;
    if (userDisplayData.role === UserRole.BUYER) return Building;
    if (userDisplayData.role === UserRole.FINANCIER) return Landmark;
    return User;
  }, [userDisplayData?.role]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-10 ml-auto" />
      </div>
    );
  }

  if (!user || !userDisplayData) {
    return (
      <Button asChild variant="outline">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Link>
      </Button>
    );
  }

  const { email: userEmail, fallbackInitial, role: userRole } = userDisplayData;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-auto w-full justify-start px-2 py-1.5 text-left"
        >
          <Avatar className="h-7 w-7 mr-2">
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden">
            <span className="truncate text-sm font-medium">
              {profile?.full_name || userEmail}
            </span>
            {userRole && (
              <span className="text-xs text-muted-foreground flex items-center">
                <RoleIcon className="h-3 w-3 mr-1" /> {userRole}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Signed in as</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {userEmail}
            </p>
            {userRole && (
              <p className="text-xs leading-none text-muted-foreground flex items-center pt-1">
                <RoleIcon className="h-3 w-3 mr-1" /> Role: {userRole}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <SidebarProvider defaultOpen>
          <Sidebar>
            <SidebarHeader className="p-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <AppLogo className="h-8 w-8" />
                <h1 className="text-xl font-semibold text-primary">
                  BillForge
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {NAV_LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      className="w-full justify-start"
                      tooltip={link.tooltip}
                    >
                      <Link href={link.href}>
                        <link.icon className="mr-2 h-5 w-5" />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2 border-t border-sidebar-border">
              <UserNav />
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
              <SidebarTrigger className="sm:hidden" />
              {/* Future: Breadcrumbs or page title could go here */}
            </header>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </RequireAuth>
    </AuthProvider>
  );
}
