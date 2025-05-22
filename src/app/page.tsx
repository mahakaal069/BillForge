// This page will be handled by middleware.
// If logged in, middleware redirects to /dashboard.
// If not logged in, middleware redirects to /login.
// So this component might not be rendered directly often,
// but acts as a fallback or initial entry point before middleware kicks in.

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';

export default function HomePage() {
  // Fallback content if middleware somehow doesn't redirect immediately
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center">
        <AppLogo className="h-20 w-20 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-primary mb-4">Welcome to BillForge</h1>
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
