
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'CRITICAL ERROR (Middleware): Supabase URL or Anon Key is missing. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment. ' +
      'If running locally, check .env.local and restart the dev server. ' +
      'For deployments, check your hosting provider s environment variable settings.'
    );
    // Optional: return a generic error response or redirect, though Supabase client init will also throw
    // For now, letting it proceed to the Supabase client init to throw its own more specific error
    // which the user is currently seeing. The console.error above is for server logs.
     throw new Error('Middleware: Supabase environment variables are not set. Check server logs.');
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        // Update response cookies as well
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '', ...options });
        // Update response cookies as well
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Allow access to auth pages and root page (which redirects to dashboard or login)
  if (['/login', '/signup', '/'].includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    // If user is logged in and tries to access login/signup, redirect to dashboard
     if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // If no session and trying to access a protected route (e.g., /dashboard, /invoices/new)
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/invoices') || pathname.startsWith('/analytics') )) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    if (pathname !== '/dashboard') { // Add returnTo only if not already trying for dashboard
        redirectUrl.searchParams.set('returnTo', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }
  
  // Refresh session for authenticated users on any navigation to protected routes
  if (session) {
    await supabase.auth.getUser(); // This refreshes the session cookie
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
