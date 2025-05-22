
'use client'; // Make this a client component to handle dialog state

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useRouter for redirect
import Link from 'next/link';
import { getInvoiceWithItemsById, type InvoiceWithItems } from '@/app/(app)/invoices/actions';
import { AlertTriangle, FileWarning, Edit, Trash2 } from 'lucide-react'; // Added Trash2
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { InvoiceStatus } from '@/types/invoice';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
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
import { deleteInvoiceAction } from '@/app/(app)/invoices/actions';
import { useToast } from '@/hooks/use-toast';


function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError("No invoice ID provided.");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInvoiceWithItemsById(invoiceId);
        if (data) {
          setInvoice(data);
        } else {
          setError("Invoice not found or you don't have permission to view it.");
        }
      } catch (err) {
        console.error("Failed to fetch invoice:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      const result = await deleteInvoiceAction(invoice.id);
      if (result.success) {
        toast({
          title: 'Invoice Deleted',
          description: `Invoice #${invoice.invoiceNumber} has been successfully deleted.`,
        });
        router.push('/dashboard'); // Redirect to dashboard after deletion
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


  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Error Loading Invoice
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileWarning className="mr-2 h-6 w-6 text-destructive" />
            Invoice Not Found
          </CardTitle>
          <CardDescription>
            The invoice you are looking for could not be found or you do not have permission to view it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please check the ID or go back to the dashboard.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} className="mt-1"/>
        </div>
        <div className="flex items-center space-x-2">
            {invoice.status === InvoiceStatus.DRAFT && (
                <Button variant="outline" asChild>
                    <Link href={`/invoices/${invoice.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Invoice
                    </Link>
                </Button>
            )}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Invoice
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete invoice <strong>#{invoice.invoiceNumber}</strong>.
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
            <Button variant="outline" asChild>
                 <Link href={`/dashboard`}>Back to Dashboard</Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Client & Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold text-muted-foreground">Client</h3>
                    <p>{invoice.clientName}</p>
                    <p>{invoice.clientEmail}</p>
                    <p className="whitespace-pre-wrap">{invoice.clientAddress}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-muted-foreground">Invoice Date</h3>
                    <p>{invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'PPP') : 'N/A'}</p>
                    <h3 className="font-semibold text-muted-foreground mt-2">Due Date</h3>
                    <p>{invoice.dueDate ? format(new Date(invoice.dueDate), 'PPP') : 'N/A'}</p>
                </div>
            </div>
            <Separator />
             <div>
                <h3 className="font-semibold text-muted-foreground">Payment Terms</h3>
                <p>{invoice.paymentTerms || 'N/A'}</p>
            </div>
            {invoice.notes && (
                <>
                    <Separator />
                    <div>
                        <h3 className="font-semibold text-muted-foreground">Notes</h3>
                        <p className="whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                </>
            )}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {invoice.items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatCurrency(item.unitPrice)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax:</span>
                        <span>{formatCurrency(invoice.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                        <span>Total Amount:</span>
                        <span>{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
