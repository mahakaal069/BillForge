'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Invoice } from '@/types/invoice';
import type { Profile } from '@/types/user';

export async function getDashboardData() {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
        redirect('/login');
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', user.id)
        .single();

    if (profileError || !profileData) {
        throw new Error('Failed to fetch user profile');
    }

    const profile = profileData as Profile;

    // Prepare invoice query based on user role
    let invoicesQuery;
    const msmeProfileJoinSyntax = 'profiles!user_id(full_name)';
    let selectString = `
    id,
    invoice_number,
    client_name,
    total_amount,
    due_date,
    status,
    is_factoring_requested,
    factoring_status,
    created_at
  `;

    if (profile.role === 'MSME') {
        invoicesQuery = supabase
            .from('invoices')
            .select(selectString)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
    } else if (profile.role === 'BUYER' && user.email) {
        selectString += `,${msmeProfileJoinSyntax}`;
        invoicesQuery = supabase
            .from('invoices')
            .select(selectString)
            .eq('client_email', user.email)
            .order('created_at', { ascending: false });
    } else if (profile.role === 'FINANCIER') {
        selectString += `,${msmeProfileJoinSyntax}`;
        invoicesQuery = supabase
            .from('invoices')
            .select(selectString)
            .in('factoring_status', ['BUYER_ACCEPTED', 'PENDING_FINANCING', 'FINANCED'])
            .order('created_at', { ascending: false });
    } else {
        invoicesQuery = supabase.from('invoices').select('*').limit(0);
    }

    const { data: invoicesData, error: invoicesError } = await invoicesQuery;

    if (invoicesError) {
        throw new Error('Failed to fetch invoices');
    }

    return {
        profile,
        invoices: invoicesData || [],
    };
}
