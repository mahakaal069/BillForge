
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { InvoiceStatus, FactoringStatus, type Invoice, type InvoiceItem, type FactoringBid } from '@/types/invoice';
import type { Profile } from '@/types/user';
import { UserRole } from '@/types/user';

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

export async function createInvoiceAction(data: InvoiceFormValues, status: InvoiceStatus): Promise<CreateInvoiceResult> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { items, clientName, clientEmail, clientAddress, invoiceDate, dueDate, paymentTerms, notes, subtotal, taxAmount, totalAmount } = data;

  const formattedInvoiceDate = invoiceDate ? new Date(invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const formattedDueDate = dueDate
    ? new Date(dueDate).toISOString().split('T')[0]
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];


  const invoiceToInsert = {
    user_id: user.id,
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    client_name: clientName,
    client_email: clientEmail,
    client_address: clientAddress,
    invoice_date: formattedInvoiceDate,
    due_date: formattedDueDate,
    payment_terms: paymentTerms,
    notes: notes,
    status: status,
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    is_factoring_requested: false,
    factoring_status: FactoringStatus.NONE,
  };

  const { data: newInvoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoiceToInsert)
    .select('id')
    .single();

  if (invoiceError || !newInvoice) {
    console.error('Error inserting invoice:', invoiceError);
    return { success: false, error: invoiceError?.message || 'Failed to create invoice.' };
  }

  const invoiceId = newInvoice.id;

  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error inserting invoice items:', itemsError);
      await supabase.from('invoices').delete().eq('id', invoiceId); // Rollback invoice creation
      return { success: false, error: itemsError.message || 'Failed to create invoice items.' };
    }
  }

  revalidatePath('/dashboard');
  if (status === InvoiceStatus.SENT) {
    revalidatePath(`/invoices/${invoiceId}/view`);
  }

  return { success: true, invoiceId };
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  bids?: FactoringBid[];
}

export async function getInvoiceWithItemsById(id: string): Promise<InvoiceWithItems | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('User not authenticated to fetch invoice');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let query = supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      client_name,
      client_email,
      client_address,
      invoice_date,
      due_date,
      payment_terms,
      notes,
      status,
      subtotal,
      tax_amount,
      total_amount,
      is_factoring_requested,
      factoring_status,
      user_id,
      created_at,
      updated_at,
      accepted_bid_id,
      assigned_financier_id,
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        total
      ),
      factoring_bids (
        id,
        invoice_id,
        financier_id,
        bid_amount,
        discount_fee_percentage,
        status,
        created_at,
        financier:profiles!factoring_bids_financier_id_fkey(full_name)
      )
    `)
    .eq('id', id)
    .order('created_at', { foreignTable: 'factoring_bids', ascending: false });


  const { data: invoiceData, error: invoiceError } = await query.single();


  if (invoiceError) {
    console.error('Error fetching invoice by ID:', invoiceError.message, invoiceError);
    return null;
  }

  if (!invoiceData) {
    return null;
  }

  // Authorization check:
  // MSME owner can view.
  // Buyer can view if their email matches client_email.
  // Financier can view if invoice is in a state relevant to them (e.g. BUYER_ACCEPTED or PENDING_FINANCING)
  const isOwner = invoiceData.user_id === user.id && profile?.role === UserRole.MSME;
  const isBuyerRecipient = profile?.role === UserRole.BUYER && invoiceData.client_email === user.email;
  const isFinancierAndViewable = profile?.role === UserRole.FINANCIER &&
    (invoiceData.factoring_status === FactoringStatus.BUYER_ACCEPTED ||
     invoiceData.factoring_status === FactoringStatus.PENDING_FINANCING ||
     invoiceData.factoring_status === FactoringStatus.FINANCED);


  if (!isOwner && !isBuyerRecipient && !isFinancierAndViewable) {
    console.error('User not authorized to view this invoice or invoice not in viewable state for role.');
    return null;
  }
  
  const invoice: InvoiceWithItems = {
    id: invoiceData.id,
    invoiceNumber: invoiceData.invoice_number,
    clientName: invoiceData.client_name,
    clientEmail: invoiceData.client_email,
    clientAddress: invoiceData.client_address,
    invoiceDate: invoiceData.invoice_date,
    dueDate: invoiceData.due_date,
    items: (invoiceData.invoice_items || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
    })),
    subtotal: invoiceData.subtotal,
    taxAmount: invoiceData.tax_amount,
    totalAmount: invoiceData.total_amount,
    status: invoiceData.status as InvoiceStatus,
    paymentTerms: invoiceData.payment_terms,
    notes: invoiceData.notes,
    user_id: invoiceData.user_id,
    is_factoring_requested: invoiceData.is_factoring_requested,
    factoring_status: invoiceData.factoring_status as FactoringStatus,
    accepted_bid_id: invoiceData.accepted_bid_id,
    assigned_financier_id: invoiceData.assigned_financier_id,
    bids: (invoiceData.factoring_bids || []).map((bid: any) => ({
        ...bid,
        financier_name: bid.financier?.full_name || 'Unknown Financier',
    })),
    created_at: invoiceData.created_at,
    updated_at: invoiceData.updated_at,
  };

  return invoice;
}

export async function updateInvoiceAction(invoiceId: string, data: InvoiceFormValues, status: InvoiceStatus): Promise<CreateInvoiceResult> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: existingInvoice, error: fetchExistingError } = await supabase
    .from('invoices')
    .select('is_factoring_requested, factoring_status, user_id')
    .eq('id', invoiceId)
    .single();

  if (fetchExistingError || !existingInvoice) {
    console.error('Error fetching existing invoice for update or not found:', fetchExistingError);
    return { success: false, error: 'Failed to find existing invoice for update.' };
  }

  if (existingInvoice.user_id !== user.id) {
    return { success: false, error: 'You do not have permission to update this invoice.' };
  }

  const { items, clientName, clientEmail, clientAddress, invoiceDate, dueDate, paymentTerms, notes, subtotal, taxAmount, totalAmount } = data;

  const formattedInvoiceDate = invoiceDate ? new Date(invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const formattedDueDate = dueDate
    ? new Date(dueDate).toISOString().split('T')[0]
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const invoiceToUpdate = {
    client_name: clientName,
    client_email: clientEmail,
    client_address: clientAddress,
    invoice_date: formattedInvoiceDate,
    due_date: formattedDueDate,
    payment_terms: paymentTerms,
    notes: notes,
    status: status,
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    updated_at: new Date().toISOString(),
    is_factoring_requested: existingInvoice.is_factoring_requested,
    factoring_status: existingInvoice.factoring_status,
  };

  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update(invoiceToUpdate)
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (invoiceUpdateError) {
    console.error('Error updating invoice:', invoiceUpdateError);
    return { success: false, error: invoiceUpdateError.message || 'Failed to update invoice.' };
  }

  const { error: deleteItemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteItemsError) {
    console.error('Error deleting old invoice items:', deleteItemsError);
    return { success: false, error: deleteItemsError.message || 'Failed to update invoice items (delete step).' };
  }

  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsInsertError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsInsertError) {
      console.error('Error inserting updated invoice items:', itemsInsertError);
      return { success: false, error: itemsInsertError.message || 'Failed to update invoice items (insert step).' };
    }
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath(`/invoices/${invoiceId}/edit`);

  return { success: true, invoiceId };
}


export async function deleteInvoiceAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !invoice) {
    console.error('Error fetching invoice for deletion or invoice not found/not owned by user:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission to delete it.' };
  }

  const { error: deleteError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting invoice:', deleteError);
    return { success: false, error: deleteError.message || 'Failed to delete invoice.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function requestInvoiceFactoringAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== UserRole.MSME) {
    return { success: false, error: 'Only MSME users can request factoring.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found or you do not have permission.' };
  }

  if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.PAID) {
    return { success: false, error: 'Factoring can only be requested for sent or paid invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.NONE) {
    return { success: false, error: 'Invoice is already in a factoring process or request.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      is_factoring_requested: true,
      factoring_status: FactoringStatus.REQUESTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('Error updating invoice for factoring:', updateError);
    return { success: false, error: 'Failed to request factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

// Action for Buyer to accept factoring
export async function acceptFactoringByBuyerAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: 'User not authenticated or email missing.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.BUYER) {
    return { success: false, error: 'Only Buyers can accept factoring requests.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, client_email, factoring_status, status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found.' };
  }

  if (invoice.client_email !== user.email) {
    return { success: false, error: 'You are not authorized to act on this invoice.' };
  }

  if (invoice.factoring_status !== FactoringStatus.REQUESTED) {
    return { success: false, error: 'Factoring request is not in the correct state to be accepted.' };
  }
   if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
    return { success: false, error: 'Cannot accept factoring for paid or void invoices.' };
  }


  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.BUYER_ACCEPTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('Error accepting factoring:', updateError);
    return { success: false, error: 'Failed to accept factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

// Action for Buyer to reject factoring
export async function rejectFactoringByBuyerAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: 'User not authenticated or email missing.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.BUYER) {
    return { success: false, error: 'Only Buyers can reject factoring requests.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, client_email, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found.' };
  }

  if (invoice.client_email !== user.email) {
    return { success: false, error: 'You are not authorized to act on this invoice.' };
  }

  if (invoice.factoring_status !== FactoringStatus.REQUESTED) {
    return { success: false, error: 'Factoring request is not in the correct state to be rejected.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.BUYER_REJECTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('Error rejecting factoring:', updateError);
    return { success: false, error: 'Failed to reject factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

// Action for Financier to place a bid
export async function placeFactoringBidAction(
  invoiceId: string,
  bidAmount: number,
  discountFeePercentage: number
): Promise<{ success: boolean; error?: string; bidId?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'User not authenticated.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.FINANCIER) {
    return { success: false, error: 'Only Financiers can place bids.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, status, factoring_status, total_amount')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) return { success: false, error: 'Invoice not found.' };

  if (invoice.factoring_status !== FactoringStatus.BUYER_ACCEPTED && invoice.factoring_status !== FactoringStatus.PENDING_FINANCING) {
    return { success: false, error: 'Invoice is not open for bidding.' };
  }
  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
    return { success: false, error: 'Cannot bid on paid or void invoices.'}
  }
  if (bidAmount <= 0 || bidAmount > invoice.total_amount) {
    return { success: false, error: 'Invalid bid amount.'}
  }
  if (discountFeePercentage <=0 || discountFeePercentage >= 100) {
    return { success: false, error: 'Invalid discount fee percentage.'}
  }


  const { data: newBid, error: bidInsertError } = await supabase
    .from('factoring_bids')
    .insert({
      invoice_id: invoiceId,
      financier_id: user.id,
      bid_amount: bidAmount,
      discount_fee_percentage: discountFeePercentage,
      status: 'PENDING',
    })
    .select('id')
    .single();

  if (bidInsertError || !newBid) {
    console.error('Error inserting bid:', bidInsertError);
    return { success: false, error: 'Failed to place bid.' };
  }

  // If this is the first bid, update invoice status to PENDING_FINANCING
  if (invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED) {
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({ factoring_status: FactoringStatus.PENDING_FINANCING, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (updateInvoiceError) {
      console.warn('Failed to update invoice status to PENDING_FINANCING after first bid:', updateInvoiceError);
      // Not returning error here as bid was placed, but logging warning.
    }
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard'); // Financiers might see this on their dashboard
  return { success: true, bidId: newBid.id };
}

// Action for MSME to accept a bid
export async function acceptFactoringBidAction(
  invoiceId: string,
  bidId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'User not authenticated.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME) {
    return { success: false, error: 'Only MSME owners can accept bids.' };
  }

  const { data: invoice, error: fetchInvoiceError } = await supabase
    .from('invoices')
    .select('id, user_id, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchInvoiceError || !invoice) return { success: false, error: 'Invoice not found.' };
  if (invoice.user_id !== user.id) return { success: false, error: 'You do not own this invoice.' };
  if (invoice.factoring_status !== FactoringStatus.PENDING_FINANCING && invoice.factoring_status !== FactoringStatus.BUYER_ACCEPTED) {
    return { success: false, error: 'Invoice is not in a state to accept bids.' };
  }

  const { data: bid, error: fetchBidError } = await supabase
    .from('factoring_bids')
    .select('id, financier_id, status')
    .eq('id', bidId)
    .eq('invoice_id', invoiceId)
    .single();

  if (fetchBidError || !bid) return { success: false, error: 'Bid not found.' };
  if (bid.status !== 'PENDING') return { success: false, error: 'This bid is not pending.' };

  // Transaction to update bid and invoice
  // Note: True transactions are complex with Supabase serverless functions.
  // Here, we do sequential updates. If one fails, the state might be inconsistent.
  // For production, consider a Supabase Edge Function for atomicity.

  const { error: updateBidError } = await supabase
    .from('factoring_bids')
    .update({ status: 'ACCEPTED_BY_MSME', updated_at: new Date().toISOString() })
    .eq('id', bidId);

  if (updateBidError) {
    console.error('Error updating bid status:', updateBidError);
    return { success: false, error: 'Failed to update bid status.' };
  }

  const { error: updateInvoiceError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.FINANCED,
      assigned_financier_id: bid.financier_id,
      accepted_bid_id: bid.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (updateInvoiceError) {
    console.error('Error updating invoice status to FINANCED:', updateInvoiceError);
    // Attempt to roll back bid status update if invoice update fails (best effort)
    await supabase.from('factoring_bids').update({ status: 'PENDING' }).eq('id', bidId);
    return { success: false, error: 'Failed to update invoice to financed state.' };
  }
  
  // Optional: Mark other pending bids for this invoice as 'REJECTED_BY_MSME' or 'SUPERSEDED'
  // This is important for a clean system.
  await supabase
    .from('factoring_bids')
    .update({ status: 'REJECTED_BY_MSME', updated_at: new Date().toISOString() })
    .eq('invoice_id', invoiceId)
    .neq('id', bidId) // Don't update the accepted bid
    .eq('status', 'PENDING');


  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}
