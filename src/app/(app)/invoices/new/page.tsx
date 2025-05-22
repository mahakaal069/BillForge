
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { createInvoiceAction } from '@/app/(app)/invoices/actions';
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatus } from '@/types/invoice';

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);

  const handleCreateAndSend = async (data: InvoiceFormValues) => {
    setIsSubmittingPage(true);
    try {
      const result = await createInvoiceAction(data, InvoiceStatus.SENT);
      if (result.success && result.invoiceId) {
        toast({
          title: "Invoice Created & Sent!",
          description: `Invoice #${result.invoiceId.substring(0,8)} has been successfully created and sent.`,
          variant: "default",
        });
        router.push(`/invoices/${result.invoiceId}/view`); 
      } else {
        toast({
          title: "Error Sending Invoice",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  const handleSaveAsDraft = async (data: InvoiceFormValues) => {
    setIsSubmittingPage(true);
    try {
      const result = await createInvoiceAction(data, InvoiceStatus.DRAFT);
      if (result.success) {
        toast({
          title: "Invoice Saved as Draft!",
          description: `Invoice ${result.invoiceId ? '#' + result.invoiceId.substring(0,8) : ''} has been successfully saved as a draft.`,
          variant: "default",
        });
        router.push('/dashboard'); 
      } else {
        toast({
          title: "Error Saving Draft",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <InvoiceForm 
        onSubmitSend={handleCreateAndSend} 
        onSubmitDraft={handleSaveAsDraft}
        isSubmitting={isSubmittingPage} 
        formMode="create"
      />
    </div>
  );
}
