
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { getInvoiceWithItemsById, updateInvoiceAction, deleteInvoiceAction, type InvoiceWithItems } from '@/app/(app)/invoices/actions';
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatus } from '@/types/invoice';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2 } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/app/(app)/layout'; // Import useAuth
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const invoiceId = params.id as string;

  const [initialData, setInitialData] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);


  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user) {
      setError("User not authenticated. Cannot fetch invoice for editing.");
      setLoading(false);
      return;
    }

    if (!invoiceId) {
      setError("No invoice ID provided.");
      setLoading(false);
      return;
    }
    
    console.log(`CLIENT LOG: [EditInvoicePage] Attempting to call getInvoiceWithItemsById with ID: ${invoiceId}`);
    const fetchInvoice = async () => {
      setLoading(true);
      setError(null); 
      try {
        const data = await getInvoiceWithItemsById(invoiceId);
        console.log("CLIENT LOG: [EditInvoicePage] Data received from getInvoiceWithItemsById:", data);
        if (data) {
          // Additional check to ensure only the owner (MSME) can edit
          if (data.user_id === user.id) {
            setInitialData(data);
          } else {
            setError("You do not have permission to edit this invoice.");
          }
        } else {
          setError("Invoice not found or you don't have permission to edit it.");
        }
      } catch (err) {
        console.error("CLIENT LOG: [EditInvoicePage] Failed to fetch invoice for editing:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching the invoice.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, user, authLoading]); // Add user and authLoading to dependencies

  const handleUpdateAndSend = async (data: InvoiceFormValues) => {
    if (!initialData?.id) return;
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
    if (!initialData?.id) return;
    setIsSubmittingPage(true);
    try {
      const result = await updateInvoiceAction(initialData.id, data, InvoiceStatus.DRAFT);
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

  const handleDeleteInvoice = async () => {
    if (!initialData?.id) return;
    setIsDeleting(true);
    try {
      const result = await deleteInvoiceAction(initialData.id);
      if (result.success) {
        toast({
          title: 'Invoice Deleted',
          description: `Invoice #${initialData.invoiceNumber} has been successfully deleted.`,
        });
        router.push('/dashboard');
      } else {
        toast({
          title: 'Error Deleting Invoice',
          description: result.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast({
        title: 'Deletion Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading || authLoading) { // Show skeleton if auth is loading too
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
          <CardDescription>The invoice you are trying to edit could not be found or you do not have permission.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const transformedInitialData = {
    ...initialData,
    invoiceDate: initialData.invoiceDate ? new Date(initialData.invoiceDate) : undefined,
    dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
    items: initialData.items.map(item => ({
        id: item.id,
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0
    }))
  };

  return (
    <div className="max-w-4xl mx-auto">
       <div className="mb-4 flex justify-end">
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
            </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete invoice <strong>#{initialData.invoiceNumber}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                {isDeleting ? 'Deleting...' : 'Yes, delete invoice'}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
      <InvoiceForm
        key={invoiceId} 
        initialData={transformedInitialData as any} 
        onSubmitSend={handleUpdateAndSend}
        onSubmitDraft={handleSaveDraftChanges}
        isSubmitting={isSubmittingPage}
        formMode="edit"
      />
    </div>
  );
}
