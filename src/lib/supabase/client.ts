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

export const supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
