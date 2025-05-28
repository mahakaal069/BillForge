"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./layout";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const [isClientMount, setIsClientMount] = useState(false);

  // Handle initial client-side mount
  useEffect(() => {
    setIsClientMount(true);
  }, []);

  // Handle auth state and redirects
  useEffect(() => {
    // Don't do anything until client-side mount
    if (!isClientMount) return;

    // Wait for loading to complete
    if (loading) return;

    // If we have a session but no user, wait a bit longer
    if (session && !user) return;

    // If we're not authenticated, redirect to login
    if (!session && !user) {
      // Only include returnTo for actual app routes
      console.log("RequireAuth: Redirecting to login without returnTo");
      router.replace("/(auth)/login");
    }
  }, [user, loading, session, isClientMount, router]);

  // Show loading state
  if (loading || !isClientMount || (session && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-muted rounded-full"></div>
        </div>
      </div>
    );
  }

  // If we get here, we're authenticated
  return <>{children}</>;
}
