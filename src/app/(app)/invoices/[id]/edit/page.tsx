
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { getInvoiceWithItemsById, updateInvoiceAction, type InvoiceWithItems } from '@/app/(app)/invoices/actions';
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatus } from '@/types/invoice';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const invoiceId = params.id as string;

  const [initialData, setInitialData] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError("No invoice ID provided.");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const data = await getInvoiceWithItemsById(invoiceId);
        if (data) {
          setInitialData(data);
        } else {
          setError("Invoice not found or you don't have permission to edit it.");
        }
      } catch (err) {
        console.error("Failed to fetch invoice for editing:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching the invoice.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handleUpdateAndSend = async (data: InvoiceFormValues) => {
    if (!initialData) return;
    setIsSubmittingPage(true);
    try {
      const result = await updateInvoiceAction(initialData.id, data, InvoiceStatus.SENT);
      if (result.success && result.invoiceId) {
        toast({
          title: "Invoice Updated & Sent!",
          description: `Invoice #${result.invoiceId.substring(0,8)} has been successfully updated and sent.`,
        });
        router.push(`/invoices/${result.invoiceId}/view`);
      } else {
        toast({
          title: "Error Updating Invoice",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update and send invoice:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  const handleSaveDraftChanges = async (data: InvoiceFormValues) => {
    if (!initialData) return;
    setIsSubmittingPage(true);
    try {
      // Determine if the status is changing from DRAFT to something else, or just updating a DRAFT
      const newStatus = data.status || initialData.status; // If form has status field, use it. Else keep old.
      const result = await updateInvoiceAction(initialData.id, data, newStatus);
      if (result.success && result.invoiceId) {
        toast({
          title: "Draft Updated!",
          description: `Invoice #${result.invoiceId.substring(0,8)} draft has been successfully updated.`,
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Error Updating Draft",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update draft:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Error Loading Invoice
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!initialData) {
     return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Invoice Not Found
          </CardTitle>
          <CardDescription>The invoice you are trying to edit could not be found.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // The Invoice type from Supabase might have invoice_date and due_date as strings.
  // InvoiceForm expects Date objects for these if they are present.
  const transformedInitialData = {
    ...initialData,
    invoiceDate: initialData.invoiceDate ? new Date(initialData.invoiceDate) : undefined,
    dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
    items: initialData.items.map(item => ({
        id: item.id,
        description: item.description || '',
        quantity: Number(item.quantity) || 0, // ensure number
        unitPrice: Number(item.unitPrice) || 0, // ensure number
        total: Number(item.total) || 0 // ensure number
    }))
  };


  return (
    <div className="max-w-4xl mx-auto">
      <InvoiceForm
        initialData={transformedInitialData as any} // Cast needed due to date transformation
        onSubmitSend={handleUpdateAndSend}
        onSubmitDraft={handleSaveDraftChanges}
        isSubmitting={isSubmittingPage}
        formMode="edit"
      />
    </div>
  );
}
