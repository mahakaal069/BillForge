import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL ERROR: Supabase URL or Anon Key is missing in src/lib/supabase/client.ts. ' +
    'Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly. ' +
    'If you just created/modified .env.local, please restart your Next.js development server.'
  );
}

export const supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development'
  },
  cookies: {
    get(name) {
      if (typeof document === 'undefined') return '';
      const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
      return match ? decodeURIComponent(match[3]) : '';
    },
    set(name, value, options = {}) {
      if (typeof document === 'undefined') return;
      let cookie = name + '=' + encodeURIComponent(value);
      if (options.maxAge) cookie += '; Max-Age=' + options.maxAge;
      if (options.path) cookie += '; Path=' + options.path;
      cookie += '; SameSite=Lax';
      if (process.env.NODE_ENV === 'production') cookie += '; Secure';
      document.cookie = cookie;
    },
    remove(name, options = {}) {
      if (typeof document === 'undefined') return;
      document.cookie = name + '=; Max-Age=0; Path=' + (options.path || '/');
    }
  }
});
