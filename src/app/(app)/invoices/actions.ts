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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('SERVER ACTION LOG: [createInvoiceAction] No authenticated user found');
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { items, clientName, clientEmail, clientAddress, invoiceDate, dueDate, paymentTerms, notes, subtotal, taxAmount, totalAmount } = data;

  const formattedInvoiceDate = invoiceDate ? new Date(invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const formattedDueDate = dueDate
    ? new Date(dueDate).toISOString().split('T')[0]
    : new Date(new Date(formattedInvoiceDate).valueOf() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
    console.error('SERVER ACTION LOG: [createInvoiceAction] Error inserting invoice:', invoiceError);
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
      console.error('SERVER ACTION LOG: [createInvoiceAction] Error inserting invoice items:', itemsError);
      await supabase.from('invoices').delete().eq('id', invoiceId);
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
  bids: FactoringBid[];
  clientHistory: string;
  industryStandards: string;
}

export async function getInvoiceWithItemsById(id: string): Promise<InvoiceWithItems | null> {
  console.log("SERVER ACTION LOG: [getInvoiceWithItemsById START] User trying to fetch Invoice ID:", id);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("SERVER ACTION LOG: [getInvoiceWithItemsById] User not authenticated. Aborting fetch.");
    return null;
  }
  console.log("SERVER ACTION LOG: [getInvoiceWithItemsById] Authenticated User ID:", user.id, "Email:", user.email);

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error(`SERVER ACTION LOG: [getInvoiceWithItemsById] Error fetching profile for user ${user.id}. ProfileError:`, profileError, "ProfileData:", profileData, "Aborting fetch.");
    return null;
  }
  const userRole = profileData.role as UserRole;
  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById] User Role: ${userRole}. Fetching invoice details for Invoice ID: ${id}`);

  // Explicitly tell Supabase which relationship to use for factoring_bids
  const { data: invoiceData, error: invoiceError } = await supabase
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
      client_history,
      industry_standards,
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        total
      ),
      factoring_bids:factoring_bids!factoring_bids_invoice_id_fkey (
        id,
        invoice_id,
        financier_id,
        bid_amount,
        discount_fee_percentage,
        status,
        created_at
      )
    `)
    .eq('id', id)
    .order('created_at', { referencedTable: 'factoring_bids', ascending: false })
    .single();

  if (invoiceError) {
    console.error(`SERVER ACTION LOG: [getInvoiceWithItemsById DB QUERY ERROR] For Invoice ID ${id}, User: ${user.id}. Supabase error:`, invoiceError);
    return null;
  }

  if (!invoiceData) {
    let rlsHint = `RLS Hint for role ${userRole} (attempting to fetch invoice ${id}): `;
    if (userRole === UserRole.MSME) {
      rlsHint += `Ensure RLS policy on 'public.invoices' allows SELECT for 'user_id' == auth.uid(). Also check RLS for 'public.invoice_items' (via invoice_id and user_id) and 'public.factoring_bids!factoring_bids_invoice_id_fkey' (via invoice_id and user_id). The join for 'factoring_bids.financier_profile' also requires SELECT on 'public.profiles' for the MSME user to see the financier's name (using profiles!id=factoring_bids.financier_id).`;
    } else if (userRole === UserRole.BUYER) {
      rlsHint += `Ensure RLS policy on 'public.invoices' allows SELECT for 'client_email' == auth.email(). Also check RLS for 'public.invoice_items' (via invoice_id and client_email) and 'public.factoring_bids!factoring_bids_invoice_id_fkey' (via invoice_id and client_email). The join for 'factoring_bids.financier_profile' also requires SELECT on 'public.profiles' for the MSME user to see the financier's name (using profiles!id=factoring_bids.financier_id).`;
    } else if (userRole === UserRole.FINANCIER) {
      rlsHint += `Ensure RLS on 'public.invoices' allows SELECT for relevant 'factoring_status'. Also check RLS for 'public.invoice_items', 'public.factoring_bids!factoring_bids_invoice_id_fkey' (including joining own profile for 'financier_profile' via profiles!id=factoring_bids.financier_id), and 'public.profiles' for MSME/Buyer names.`;
    } else {
      rlsHint += "Unknown role or context. Please verify all RLS policies on invoices, invoice_items, factoring_bids, and profiles.";
    }
    console.warn(`SERVER ACTION LOG: [getInvoiceWithItemsById INVOICE DATA NULL POST-QUERY] For Invoice ID ${id}, User: ${user.id}, Role: ${userRole}. This usually means Row Level Security (RLS) policies are blocking read access for this user/role combination for this specific invoice OR its related items/bids (including nested joins to profiles). ${rlsHint} Also, double-check that an invoice with ID '${id}' actually exists.`);
    return null;
  }

  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById] Fetched raw invoiceData from DB (first 500 chars):`, JSON.stringify(invoiceData).substring(0, 500));

  const isOwner = invoiceData.user_id === user.id && userRole === UserRole.MSME;

  let isBuyerRecipient = false;
  if (userRole === UserRole.BUYER && user.email && invoiceData.client_email) {
    isBuyerRecipient = invoiceData.client_email.toLowerCase() === user.email.toLowerCase();
  }
  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById Auth Pre-Check] User Email (for buyer check): ${user.email}, Invoice Client Email: ${invoiceData.client_email}. isBuyerRecipient: ${isBuyerRecipient}`);

  const isFinancierAndViewable = userRole === UserRole.FINANCIER &&
    (invoiceData.factoring_status === FactoringStatus.BUYER_ACCEPTED ||
      invoiceData.factoring_status === FactoringStatus.PENDING_FINANCING ||
      invoiceData.factoring_status === FactoringStatus.FINANCED);

  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById JS Auth Check for Invoice ${invoiceData.id}] User: ${user.id}, Role: ${userRole}, Invoice Owner ID: ${invoiceData.user_id}. Calculated Permissions - isOwner: ${isOwner}, isBuyerRecipient: ${isBuyerRecipient}, isFinancierAndViewable: ${isFinancierAndViewable}`);

  if (!isOwner && !isBuyerRecipient && !isFinancierAndViewable) {
    console.warn(`SERVER ACTION LOG: [getInvoiceWithItemsById JS Auth FAILED] User ${user.id} (Role: ${userRole}) not authorized by JS logic to view invoice ${invoiceData.id}.`);
    return null;
  }

  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById JS Auth SUCCEEDED] User ${user.id} (Role: ${userRole}) authorized to view invoice ${invoiceData.id}. Proceeding to map data.`);

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
      id: bid.id,
      invoice_id: bid.invoice_id,
      financier_id: bid.financier_id,
      bid_amount: bid.bid_amount,
      discount_fee_percentage: bid.discount_fee_percentage,
      status: bid.status as FactoringBid['status'],
      created_at: bid.created_at,
      financier_profile: bid.financier_profile ? { full_name: bid.financier_profile.full_name } : null
    })),
    created_at: invoiceData.created_at,
    updated_at: invoiceData.updated_at,
    clientHistory: invoiceData.client_history,
    industryStandards: invoiceData.industry_standards,
  };

  return invoice;
}

export async function updateInvoiceAction(invoiceId: string, data: InvoiceFormValues, status: InvoiceStatus): Promise<CreateInvoiceResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: existingInvoice, error: fetchExistingError } = await supabase
    .from('invoices')
    .select('is_factoring_requested, factoring_status, user_id, status')
    .eq('id', invoiceId)
    .single();

  if (fetchExistingError || !existingInvoice) {
    console.error('SERVER ACTION LOG: [updateInvoiceAction] Error fetching existing invoice for update or not found:', fetchExistingError);
    return { success: false, error: 'Failed to find existing invoice for update.' };
  }

  if (existingInvoice.user_id !== user.id) {
    return { success: false, error: 'You do not have permission to update this invoice.' };
  }

  const { items, clientName, clientEmail, clientAddress, invoiceDate, dueDate, paymentTerms, notes, subtotal, taxAmount, totalAmount } = data;

  const formattedInvoiceDate = invoiceDate ? new Date(invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const formattedDueDate = dueDate
    ? new Date(dueDate).toISOString().split('T')[0]
    : new Date(new Date(formattedInvoiceDate).valueOf() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let newFactoringStatus = existingInvoice.factoring_status;
  let newIsFactoringRequested = existingInvoice.is_factoring_requested;

  if (status === InvoiceStatus.DRAFT) {
    if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
      newFactoringStatus = FactoringStatus.NONE;
      newIsFactoringRequested = false;
    }
  } else if (status === InvoiceStatus.SENT) {
    if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
      if (existingInvoice.status === InvoiceStatus.DRAFT && existingInvoice.factoring_status !== FactoringStatus.NONE) {
        newFactoringStatus = FactoringStatus.NONE;
        newIsFactoringRequested = false;
      } else {
        newFactoringStatus = existingInvoice.factoring_status === FactoringStatus.NONE ? FactoringStatus.NONE : existingInvoice.factoring_status;
        newIsFactoringRequested = existingInvoice.is_factoring_requested === false ? false : existingInvoice.is_factoring_requested;
      }
    }
  } else if (status === InvoiceStatus.PAID || status === InvoiceStatus.VOID) {
    if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
      newFactoringStatus = FactoringStatus.NONE;
      newIsFactoringRequested = false;
    }
  }

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
    is_factoring_requested: newIsFactoringRequested,
    factoring_status: newFactoringStatus,
  };

  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update(invoiceToUpdate)
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (invoiceUpdateError) {
    console.error('SERVER ACTION LOG: [updateInvoiceAction] Error updating invoice:', invoiceUpdateError);
    return { success: false, error: invoiceUpdateError.message || 'Failed to update invoice.' };
  }

  const { error: deleteItemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteItemsError) {
    console.error('SERVER ACTION LOG: [updateInvoiceAction] Error deleting old invoice items:', deleteItemsError);
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
      console.error('SERVER ACTION LOG: [updateInvoiceAction] Error inserting updated invoice items:', itemsInsertError);
      return { success: false, error: itemsInsertError.message || 'Failed to update invoice items (insert step).' };
    }
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath(`/invoices/${invoiceId}/edit`);

  return { success: true, invoiceId };
}

export async function deleteInvoiceAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error fetching invoice for deletion or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME || invoice.user_id !== user.id) {
    console.warn(`SERVER ACTION LOG: [deleteInvoiceAction] User ${user.id} (Role: ${profile?.role}) attempted to delete invoice ${invoiceId} not owned by them or not an MSME.`);
    return { success: false, error: 'Only the MSME owner can delete this invoice.' };
  }

  const { error: deleteBidsError } = await supabase
    .from('factoring_bids')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteBidsError) {
    console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error deleting associated factoring bids:', deleteBidsError);
  }

  const { error: deleteItemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteItemsError) {
    console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error deleting associated invoice items:', deleteItemsError);
  }

  const { error: deleteError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error deleting invoice:', deleteError);
    return { success: false, error: deleteError.message || 'Failed to delete invoice.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath(`/invoices/${invoiceId}/edit`);
  return { success: true };
}

export async function requestInvoiceFactoringAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME) {
    return { success: false, error: 'Only MSME users can request factoring.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, total_amount, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [requestInvoiceFactoringAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.user_id !== user.id) {
    return { success: false, error: 'You can only request factoring for your own invoices.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Factoring can only be requested for sent invoices.' };
  }

  if (invoice.total_amount <= 0) {
    return { success: false, error: 'Factoring cannot be requested for invoices with zero or negative amount.' };
  }

  if (invoice.factoring_status !== FactoringStatus.NONE) {
    return { success: false, error: 'Factoring has already been requested or processed for this invoice.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      is_factoring_requested: true,
      factoring_status: FactoringStatus.REQUESTED,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('SERVER ACTION LOG: [requestInvoiceFactoringAction] Error updating invoice factoring status:', updateError);
    return { success: false, error: updateError.message || 'Failed to request factoring.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function acceptFactoringByBuyerAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.BUYER) {
    return { success: false, error: 'Only buyers can accept factoring requests.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [acceptFactoringByBuyerAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Cannot accept factoring for paid or void invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.REQUESTED) {
    return { success: false, error: 'This invoice is not in a state where factoring can be accepted.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.ACCEPTED,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('SERVER ACTION LOG: [acceptFactoringByBuyerAction] Error updating invoice factoring status:', updateError);
    return { success: false, error: updateError.message || 'Failed to accept factoring.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function rejectFactoringByBuyerAction(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.BUYER) {
    return { success: false, error: 'Only buyers can reject factoring requests.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [rejectFactoringByBuyerAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Cannot reject factoring for paid or void invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.REQUESTED) {
    return { success: false, error: 'This invoice is not in a state where factoring can be rejected.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.REJECTED,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('SERVER ACTION LOG: [rejectFactoringByBuyerAction] Error updating invoice factoring status:', updateError);
    return { success: false, error: updateError.message || 'Failed to reject factoring.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function placeFactoringBidAction(invoiceId: string, discountFeePercentage: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.FINANCIER) {
    return { success: false, error: 'Only financiers can place factoring bids.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status, total_amount')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [placeFactoringBidAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Cannot place bid on paid or void invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.ACCEPTED) {
    return { success: false, error: 'This invoice is not in a state where bids can be placed.' };
  }

  if (discountFeePercentage <= 0 || discountFeePercentage >= 100) {
    return { success: false, error: 'Invalid discount fee percentage.' }
  }

  const { data: newBid, error: bidInsertError } = await supabase
    .from('factoring_bids')
    .insert({
      invoice_id: invoiceId,
      financier_id: user.id,
      discount_fee_percentage: discountFeePercentage,
      status: FactoringStatus.PENDING,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (bidInsertError) {
    console.error('SERVER ACTION LOG: [placeFactoringBidAction] Error inserting factoring bid:', bidInsertError);
    return { success: false, error: bidInsertError.message || 'Failed to place factoring bid.' };
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.BIDDING,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('SERVER ACTION LOG: [placeFactoringBidAction] Error updating invoice factoring status:', updateError);
    return { success: false, error: updateError.message || 'Failed to update invoice status.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function acceptFactoringBidAction(invoiceId: string, bidId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME) {
    return { success: false, error: 'Only MSME owners can accept factoring bids.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.user_id !== user.id) {
    return { success: false, error: 'You can only accept bids for your own invoices.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Cannot accept bid for paid or void invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.BIDDING) {
    return { success: false, error: 'This invoice is not in a state where bids can be accepted.' };
  }

  const { data: bid, error: bidFetchError } = await supabase
    .from('factoring_bids')
    .select('id, status')
    .eq('id', bidId)
    .eq('invoice_id', invoiceId)
    .single();

  if (bidFetchError || !bid) {
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error fetching bid or bid not found:', bidFetchError);
    return { success: false, error: 'Bid not found or invalid.' };
  }

  if (bid.status !== FactoringStatus.PENDING) {
    return { success: false, error: 'This bid has already been processed.' };
  }

  const { error: bidUpdateError } = await supabase
    .from('factoring_bids')
    .update({
      status: FactoringStatus.ACCEPTED,
      updated_at: new Date().toISOString()
    })
    .eq('id', bidId);

  if (bidUpdateError) {
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error updating bid status:', bidUpdateError);
    return { success: false, error: bidUpdateError.message || 'Failed to accept bid.' };
  }

  const { error: invoiceUpdateError } = await supabase
    .from('invoices')
    .update({
      factoring_status: FactoringStatus.FINANCED,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (invoiceUpdateError) {
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error updating invoice status:', invoiceUpdateError);
    return { success: false, error: invoiceUpdateError.message || 'Failed to update invoice status.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}

export async function rejectFactoringBidAction(invoiceId: string, bidId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME) {
    return { success: false, error: 'Only MSME owners can reject factoring bids.' };
  }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, status, factoring_status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [rejectFactoringBidAction] Error fetching invoice or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  if (invoice.user_id !== user.id) {
    return { success: false, error: 'You can only reject bids for your own invoices.' };
  }

  if (invoice.status !== InvoiceStatus.SENT) {
    return { success: false, error: 'Cannot reject bid for paid or void invoices.' };
  }

  if (invoice.factoring_status !== FactoringStatus.BIDDING) {
    return { success: false, error: 'This invoice is not in a state where bids can be rejected.' };
  }

  const { data: bid, error: bidFetchError } = await supabase
    .from('factoring_bids')
    .select('id, status')
    .eq('id', bidId)
    .eq('invoice_id', invoiceId)
    .single();

  if (bidFetchError || !bid) {
    console.error('SERVER ACTION LOG: [rejectFactoringBidAction] Error fetching bid or bid not found:', bidFetchError);
    return { success: false, error: 'Bid not found or invalid.' };
  }

  if (bid.status !== FactoringStatus.PENDING) {
    return { success: false, error: 'This bid has already been processed.' };
  }

  const { error: bidUpdateError } = await supabase
    .from('factoring_bids')
    .update({
      status: FactoringStatus.REJECTED,
      updated_at: new Date().toISOString()
    })
    .eq('id', bidId);

  if (bidUpdateError) {
    console.error('SERVER ACTION LOG: [rejectFactoringBidAction] Error updating bid status:', bidUpdateError);
    return { success: false, error: bidUpdateError.message || 'Failed to reject bid.' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/invoices/${invoiceId}/view`);
  return { success: true };
}
