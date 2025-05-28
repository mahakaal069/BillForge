import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create Supabase client with cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { pathname } = req.nextUrl;
  // Define protected and public routes
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isApiRoute = pathname.startsWith('/api');
  const isStaticRoute = ['/_next', '/favicon.ico', '/static', '/.well-known'].some(route => pathname.startsWith(route));

  // Don't handle static assets or API routes
  if (isStaticRoute || isApiRoute) {
    return res;
  }

  try {
    // Get the session without auto-refresh
    const { data: { session }, error } = await supabase.auth.getSession();

    // If there's an error getting the session, let the client handle it
    if (error) {
      console.error('Session error:', error);
      return res;
    }

    // For auth routes (login/signup), redirect to dashboard if already authenticated
    if (isAuthRoute) {
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return res;
    }

    // For all other routes, require authentication
    if (!session && pathname !== '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If we have a session, allow access to the requested route
    return res;
  } catch (error) {
    console.error('Auth middleware error:', error);
    // On error, allow the request to proceed - the client-side auth check will handle it
    return res;
  }
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
