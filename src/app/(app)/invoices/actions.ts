
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { InvoiceStatus } from '@/types/invoice';

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

export async function createInvoiceAction(data: InvoiceFormValues): Promise<CreateInvoiceResult> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in.' };
  }

  const { items, clientName, clientEmail, clientAddress, invoiceDate, dueDate, paymentTerms, notes, subtotal, taxAmount, totalAmount } = data;

  // 1. Create the main invoice record
  const invoiceToInsert = {
    user_id: user.id,
    // Generate invoiceNumber on server-side if needed, or use a placeholder/sequence
    // For now, let's use a timestamp-based one for simplicity until a proper sequence is set up
    invoice_number: `INV-${Date.now().toString().slice(-6)}`, 
    client_name: clientName,
    client_email: clientEmail,
    client_address: clientAddress,
    invoice_date: invoiceDate ? invoiceDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    due_date: dueDate ? dueDate.toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: paymentTerms,
    notes: notes,
    status: InvoiceStatus.SENT, // Or DRAFT based on how you want to handle the "Create & Send" button
    subtotal: subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
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

  // 2. Create invoice items
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
      // Potentially delete the main invoice if items fail (transactional behavior desirable)
      // For now, we'll report the error.
      await supabase.from('invoices').delete().eq('id', invoiceId); // Attempt to rollback
      return { success: false, error: itemsError.message || 'Failed to create invoice items.' };
    }
  }

  revalidatePath('/dashboard');
  // No explicit redirect here, the page calling this action can handle it.
  return { success: true, invoiceId };
}
