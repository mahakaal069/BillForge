
'use client'; 

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, createContext, useContext } from 'react';
import type { User as SupabaseUser, AuthSubscription } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { UserRole, type Profile } from '@/types/user'; // Import Profile type

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
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { NAV_LINKS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Home, Settings, User, LogOut, LogIn, Briefcase, Building, Landmark } from 'lucide-react'; // Added Landmark
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';


interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null; // Add profile to context
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null); // Add profile state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    };

    const getSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authStateChangeData } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const authListenerSubscription = authStateChangeData?.subscription;

    return () => {
      authListenerSubscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


function UserNav() {
  const { user, profile, loading } = useAuth(); // Get profile from context
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh(); 
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-10 ml-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Link>
      </Button>
    );
  }

  const userEmail = user.email || "User";
  const fallbackInitial = userEmail.charAt(0).toUpperCase();
  const userRole = profile?.role;
  
  let RoleIcon = User; // Default icon
  if (userRole === UserRole.MSME) RoleIcon = Briefcase;
  else if (userRole === UserRole.BUYER) RoleIcon = Building;
  else if (userRole === UserRole.FINANCIER) RoleIcon = Landmark;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-auto w-full justify-start px-2 py-1.5 text-left">
          <Avatar className="h-7 w-7 mr-2">
            {/* <AvatarImage src={user.user_metadata?.avatar_url} alt={userEmail} /> */}
            <AvatarFallback>{fallbackInitial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-grow overflow-hidden">
            <span className="truncate text-sm font-medium">{profile?.full_name || userEmail}</span>
            {userRole && (
              <span className="text-xs text-muted-foreground flex items-center">
                <RoleIcon className="h-3 w-3 mr-1" /> {userRole}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
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
        {/* <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator /> */}
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarHeader className="p-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <AppLogo className="h-8 w-8" />
              <h1 className="text-xl font-semibold text-primary">BillForge</h1>
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
          <main className="flex-1 p-6 overflow-auto">
              {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
