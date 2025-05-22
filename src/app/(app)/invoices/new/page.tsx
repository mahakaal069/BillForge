
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { createInvoiceAction } from '@/app/(app)/invoices/actions';
import { useToast } from "@/hooks/use-toast";

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);

  const handleCreateInvoice = async (data: InvoiceFormValues) => {
    setIsSubmittingPage(true);
    try {
      const result = await createInvoiceAction(data);
      if (result.success) {
        toast({
          title: "Invoice Created!",
          description: `Invoice ${result.invoiceId ? '#' + result.invoiceId.substring(0,8) : ''} has been successfully created and sent.`,
          variant: "default",
        });
        router.push('/dashboard'); // Redirect after successful creation
      } else {
        toast({
          title: "Error Creating Invoice",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to submit invoice:', error);
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
      <InvoiceForm onSubmit={handleCreateInvoice} isSubmittingForm={isSubmittingPage} />
    </div>
  );
}
