
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
    : new Date(new Date().setDate(new Date(formattedInvoiceDate).getDate() + 30)).toISOString().split('T')[0]; // Default to 30 days from invoiceDate


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
      // Rollback invoice creation if items fail
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
  bids?: FactoringBid[];
}

export async function getInvoiceWithItemsById(id: string): Promise<InvoiceWithItems | null> {
  console.log("SERVER ACTION LOG: [getInvoiceWithItemsById START] User trying to fetch Invoice ID:", id);

  const supabase = createSupabaseServerClient();
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
  const userRole = profileData.role;
  console.log(`SERVER ACTION LOG: [getInvoiceWithItemsById] User Role: ${userRole}. Fetching invoice details for Invoice ID: ${id}`);
  
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
    const rlsHintForMSME = `MSME (Role: ${userRole}, ID: ${user.id}): Ensure RLS policy on 'public.invoices' allows SELECT for 'user_id' == auth.uid(). Also check 'public.invoice_items' (via invoice_id and user_id) and 'public.factoring_bids' (via invoice_id and user_id).`;
    const rlsHintForBUYER = `BUYER (Role: ${userRole}, Email: ${user.email}): Ensure RLS policy on 'public.invoices' allows SELECT for 'client_email' == auth.email(). Also check 'public.invoice_items' (via invoice_id and client_email) and 'public.factoring_bids' (via invoice_id and client_email). Crucially, ensure the BUYER can also SELECT from 'public.profiles' to get financier names (this join happens within the bids fetch).`;
    const rlsHintForFINANCIER = `FINANCIER (Role: ${userRole}): Ensure RLS on 'public.invoices' allows SELECT for relevant 'factoring_status'. Also check 'public.invoice_items' and 'public.factoring_bids'. The join for MSME/Buyer names also requires SELECT on 'public.profiles'.`;
    let specificRLSHint = "RLS Hint: Please verify RLS policies. Unknown role or context.";
    if (userRole === UserRole.MSME) specificRLSHint = rlsHintForMSME;
    else if (userRole === UserRole.BUYER) specificRLSHint = rlsHintForBUYER;
    else if (userRole === UserRole.FINANCIER) specificRLSHint = rlsHintForFINANCIER;

    console.warn(`SERVER ACTION LOG: [getInvoiceWithItemsById INVOICE DATA NULL POST-QUERY] For Invoice ID ${id}, User: ${user.id}, Role: ${userRole}.`);
    console.warn(`  This usually means Row Level Security (RLS) policies are blocking read access for this user/role combination for this specific invoice or its related items/bids, or the join to profiles for financier names.`);
    console.warn(`  ${specificRLSHint}`);
    console.warn(`  Also, double-check that an invoice with ID '${id}' actually exists.`);
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
    : new Date(new Date().setDate(new Date(formattedInvoiceDate).getDate() + 30)).toISOString().split('T')[0];


  let newFactoringStatus = existingInvoice.factoring_status;
  let newIsFactoringRequested = existingInvoice.is_factoring_requested;

  // Logic to reset factoring status if invoice is moved to DRAFT, or finalized as PAID/VOID
  // unless it's already fully FINANCED/REPAID.
  if (status === InvoiceStatus.DRAFT) {
    // If moving to draft, and not yet fully financed/repaid, reset factoring flags
    if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
        newFactoringStatus = FactoringStatus.NONE;
        newIsFactoringRequested = false;
    }
  } else if (status === InvoiceStatus.SENT) {
    // If moving to sent from draft, and it was previously in a factoring flow (but not FINANCED/REPAID), reset.
    // If it was never in factoring or was reset, it remains NONE.
    if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
      if(existingInvoice.status === InvoiceStatus.DRAFT && existingInvoice.factoring_status !== FactoringStatus.NONE){
         newFactoringStatus = FactoringStatus.NONE; // Reset if it was DRAFT and had some factoring status
         newIsFactoringRequested = false;
      } else {
        // Keep existing factoring status if it was already SENT and in a flow (e.g. REQUESTED)
        // This part might need refinement based on exact desired UX when re-sending
        newFactoringStatus = existingInvoice.factoring_status === FactoringStatus.NONE ? FactoringStatus.NONE : existingInvoice.factoring_status;
        newIsFactoringRequested = existingInvoice.is_factoring_requested === false ? false : existingInvoice.is_factoring_requested;
      }
    }
  } else if (status === InvoiceStatus.PAID || status === InvoiceStatus.VOID) {
      // If paid or void, and not yet fully financed/repaid, cancel any active factoring
      if (existingInvoice.factoring_status !== FactoringStatus.FINANCED && existingInvoice.factoring_status !== FactoringStatus.REPAID) {
        newFactoringStatus = FactoringStatus.NONE; // Or a specific "CANCELLED" status if you add one
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
    .eq('user_id', user.id); // Ensure only owner can update

  if (invoiceUpdateError) {
    console.error('SERVER ACTION LOG: [updateInvoiceAction] Error updating invoice:', invoiceUpdateError);
    return { success: false, error: invoiceUpdateError.message || 'Failed to update invoice.' };
  }

  // Delete existing items and re-insert new ones
  // This is simpler than diffing and updating/inserting/deleting individual items
  const { error: deleteItemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteItemsError) {
    console.error('SERVER ACTION LOG: [updateInvoiceAction] Error deleting old invoice items:', deleteItemsError);
    // Potentially rollback invoice update or handle more gracefully
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
      // Potentially rollback or handle
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

  // Fetch the invoice to check ownership and other conditions if necessary
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, user_id, factoring_status') // Add other fields if needed for conditions
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error fetching invoice for deletion or invoice not found:', fetchError);
    return { success: false, error: 'Invoice not found or you do not have permission for this action on it.' };
  }

  // Verify user role and ownership
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== UserRole.MSME || invoice.user_id !== user.id) {
      console.warn(`SERVER ACTION LOG: [deleteInvoiceAction] User ${user.id} (Role: ${profile?.role}) attempted to delete invoice ${invoiceId} not owned by them or not an MSME.`);
      return { success: false, error: 'Only the MSME owner can delete this invoice.' };
  }

  // Optional: Add conditions based on factoring_status (e.g., cannot delete if FINANCED)
  // if (invoice.factoring_status === FactoringStatus.FINANCED) {
  //   return { success: false, error: 'Cannot delete an invoice that has been financed.' };
  // }

  // Delete associated factoring bids first (if any)
  // This is important if ON DELETE CASCADE is not set or if you want to log this step
  const { error: deleteBidsError } = await supabase
    .from('factoring_bids')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteBidsError) {
      // Log the error but proceed, as invoice_items might be set to cascade delete
      console.error('SERVER ACTION LOG: [deleteInvoiceAction] Error deleting associated factoring bids:', deleteBidsError);
      // Depending on strictness, you might return an error here
  }

  // Invoice items should be deleted by ON DELETE CASCADE from the invoices table.
  // If not, you would delete them explicitly here:
  // await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

  const { error: deleteError } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', user.id); // Final check to ensure only owner deletes

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
    .select('id, user_id, status, factoring_status, total_amount') 
    .eq('id', invoiceId)
    .eq('user_id', user.id) // Ensure MSME owns this invoice
    .single();

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found or you do not have permission.' };
  }

  // Add checks for invoice status and amount
  if (invoice.status !== InvoiceStatus.SENT && invoice.status !== InvoiceStatus.OVERDUE) {
    return { success: false, error: 'Factoring can only be requested for Sent or Overdue invoices.' };
  }
  if (invoice.total_amount <= 0) {
     return { success: false, error: 'Factoring cannot be requested for invoices with zero or negative amount.'};
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
    console.error('SERVER ACTION LOG: [requestInvoiceFactoringAction] Error updating invoice for factoring:', updateError);
    return { success: false, error: 'Failed to request factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

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

  if (invoice.client_email?.toLowerCase() !== user.email?.toLowerCase()) {
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
    console.error('SERVER ACTION LOG: [acceptFactoringByBuyerAction] Error accepting factoring:', updateError);
    return { success: false, error: 'Failed to accept factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

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

  if (invoice.client_email?.toLowerCase() !== user.email?.toLowerCase()) {
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
    console.error('SERVER ACTION LOG: [rejectFactoringByBuyerAction] Error rejecting factoring:', updateError);
    return { success: false, error: 'Failed to reject factoring for the invoice.' };
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

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
      status: 'PENDING', // Initial status of a new bid
    })
    .select('id')
    .single();

  if (bidInsertError || !newBid) {
    console.error('SERVER ACTION LOG: [placeFactoringBidAction] Error inserting bid:', bidInsertError);
    return { success: false, error: 'Failed to place bid.' };
  }

  // If this is the first bid, change invoice status to PENDING_FINANCING
  if (invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED) {
    const { error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({ factoring_status: FactoringStatus.PENDING_FINANCING, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (updateInvoiceError) {
      // Log warning, but don't fail the bid placement because of this secondary update
      console.warn('SERVER ACTION LOG: [placeFactoringBidAction] Failed to update invoice status to PENDING_FINANCING after first bid:', updateInvoiceError);
    }
  }

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard'); // So MSME/Financier dashboards update
  return { success: true, bidId: newBid.id };
}

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

  // Transaction block starts (conceptual, Supabase doesn't have explicit client-side transactions for multiple operations like this without edge functions)
  // 1. Fetch the invoice and bid to ensure validity
  const { data: invoice, error: fetchInvoiceError } = await supabase
    .from('invoices')
    .select('id, user_id, factoring_status, accepted_bid_id')
    .eq('id', invoiceId)
    .single();

  if (fetchInvoiceError || !invoice) return { success: false, error: 'Invoice not found.' };
  if (invoice.user_id !== user.id) return { success: false, error: 'You do not own this invoice.' };
  if (invoice.factoring_status !== FactoringStatus.PENDING_FINANCING && invoice.factoring_status !== FactoringStatus.BUYER_ACCEPTED) {
    return { success: false, error: 'Invoice is not in a state to accept bids.' };
  }
  if (invoice.accepted_bid_id) {
    return { success: false, error: 'A bid has already been accepted for this invoice.' };
  }

  const { data: bid, error: fetchBidError } = await supabase
    .from('factoring_bids')
    .select('id, financier_id, status')
    .eq('id', bidId)
    .eq('invoice_id', invoiceId) // Ensure bid belongs to this invoice
    .single();

  if (fetchBidError || !bid) return { success: false, error: 'Bid not found.' };
  if (bid.status !== 'PENDING') return { success: false, error: 'This bid is not pending and cannot be accepted.' };

  // 2. Update the accepted bid's status
  const { error: updateBidError } = await supabase
    .from('factoring_bids')
    .update({ status: 'ACCEPTED_BY_MSME', updated_at: new Date().toISOString() })
    .eq('id', bidId);

  if (updateBidError) {
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error updating accepted bid status:', updateBidError);
    return { success: false, error: 'Failed to update accepted bid status.' };
  }

  // 3. Update the invoice status and link the accepted bid
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
    console.error('SERVER ACTION LOG: [acceptFactoringBidAction] Error updating invoice to FINANCED:', updateInvoiceError);
    // Rollback bid status update if invoice update fails
    await supabase.from('factoring_bids').update({ status: 'PENDING', updated_at: new Date().toISOString() }).eq('id', bidId);
    return { success: false, error: 'Failed to update invoice to financed state.' };
  }
  
  // 4. Update other pending bids for this invoice to 'REJECTED_BY_MSME'
  const { error: updateOtherBidsError } = await supabase
    .from('factoring_bids')
    .update({ status: 'REJECTED_BY_MSME', updated_at: new Date().toISOString() })
    .eq('invoice_id', invoiceId) // For this invoice
    .neq('id', bidId)             // Not the accepted bid
    .eq('status', 'PENDING');     // Only if they were still pending

  if (updateOtherBidsError) {
    console.warn('SERVER ACTION LOG: [acceptFactoringBidAction] Error updating other pending bids to REJECTED_BY_MSME:', updateOtherBidsError);
    // This is not a critical failure for the primary action, so just log it.
  }
  // Transaction block ends (conceptual)

  revalidatePath(`/invoices/${invoiceId}/view`);
  revalidatePath('/dashboard');
  return { success: true };
}

