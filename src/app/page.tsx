// This page will be handled by middleware.
// If logged in, middleware redirects to /dashboard.
// If not logged in, middleware redirects to /login.
// So this component might not be rendered directly often,
// but acts as a fallback or initial entry point before middleware kicks in.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/AppLogo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function HomePage() {
  try {
    // Check for session cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token");
    const refreshToken = cookieStore.get("sb-refresh-token");
    const hasSessionCookies = !!accessToken && !!refreshToken;

    const supabase = await createSupabaseServerClient();

    // Only try to get session if we have cookies
    if (hasSessionCookies) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (session?.user && !sessionError) {
        // Verify the session is valid by making a test API call
        const { error: testError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!testError) {
          // Valid session confirmed
          return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
              <div className="text-center">
                <AppLogo className="h-20 w-20 mx-auto mb-6" />
                <h1 className="text-4xl font-bold text-primary mb-4">
                  Welcome back to Invoice DOS
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Click below to access your dashboard
                </p>
                <div className="space-x-4">
                  <Button asChild size="lg">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        }
      }
    }

    // Default to showing login/signup for any other case
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <AppLogo className="h-20 w-20 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-primary mb-4">
            Welcome to Invoice DOS
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Modern invoicing, simplified.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Home page error:", error);
    // On error, show login/signup buttons
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <AppLogo className="h-20 w-20 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-primary mb-4">
            Welcome to Invoice DOS
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Modern invoicing, simplified.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
