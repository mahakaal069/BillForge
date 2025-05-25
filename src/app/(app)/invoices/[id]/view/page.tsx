
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getInvoiceWithItemsById, type InvoiceWithItems, deleteInvoiceAction, requestInvoiceFactoringAction, acceptFactoringByBuyerAction, rejectFactoringByBuyerAction, placeFactoringBidAction, acceptFactoringBidAction } from '@/app/(app)/invoices/actions';
import { AlertTriangle, FileWarning, Edit, Trash2, TrendingUp, Send, CheckCircle, XCircle, ShieldCheck, ShieldX, Handshake, Landmark } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { InvoiceStatus, FactoringStatus, type FactoringBid } from '@/types/invoice';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/(app)/layout';
import { UserRole } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlaceBidForm } from '@/components/factoring/PlaceBidForm';
import { BidList } from '@/components/factoring/BidList';


function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getFactoringStatusDisplayName(status: FactoringStatus | undefined | null): string {
  if (!status || status === FactoringStatus.NONE) return 'Not Requested';
  switch (status) {
    case FactoringStatus.REQUESTED: return 'Factoring Requested';
    case FactoringStatus.BUYER_ACCEPTED: return 'Buyer Accepted - Awaiting Bids';
    case FactoringStatus.BUYER_REJECTED: return 'Buyer Rejected';
    case FactoringStatus.PENDING_FINANCING: return 'Pending Financing - Bids Open';
    case FactoringStatus.FINANCED: return 'Financed';
    case FactoringStatus.REPAID: return 'Repaid to Financier';
    default: return status.replace(/_/g, ' ');
  }
}


export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRequestingFactoring, setIsRequestingFactoring] = useState(false);
  const [isBuyerActionLoading, setIsBuyerActionLoading] = useState(false);
  const [isAcceptingBid, setIsAcceptingBid] = useState<string | null>(null); 

  const fetchInvoiceData = async () => {
      if (!invoiceId) {
        setError("No invoice ID provided.");
        setLoading(false);
        return;
      }
      console.log(`CLIENT LOG: [ViewInvoicePage] Attempting to call getInvoiceWithItemsById with ID: ${invoiceId}`);
      setLoading(true);
      setError(null);
      try {
        const data = await getInvoiceWithItemsById(invoiceId);
        console.log("CLIENT LOG: [ViewInvoicePage] Data received from getInvoiceWithItemsById:", data);
        if (data) {
          setInvoice(data);
        } else {
          setError("Invoice not found or you don't have permission to view it.");
        }
      } catch (err) {
        console.error("CLIENT LOG: [ViewInvoicePage] Failed to fetch invoice:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (authLoading) return; 

    if (!invoiceId) {
        setError("No invoice ID provided in URL.");
        setLoading(false);
        return;
    }
    if (!user) { 
        setError("User not authenticated. Cannot fetch invoice.");
        setLoading(false);
        return;
    }
    fetchInvoiceData();
  }, [invoiceId, user, authLoading]); 

  const handleDeleteInvoice = async () => {
    if (!invoice || !user || profile?.role !== UserRole.MSME || invoice.user_id !== user.id) return;
    setIsDeleting(true);
    try {
      const result = await deleteInvoiceAction(invoice.id);
      if (result.success) {
        toast({
          title: 'Invoice Deleted',
          description: `Invoice #${invoice.invoiceNumber} has been successfully deleted.`,
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

  const handleRequestFactoring = async () => {
    if (!invoice || !user || profile?.role !== UserRole.MSME || invoice.user_id !== user.id) return;
    setIsRequestingFactoring(true);
    try {
      const result = await requestInvoiceFactoringAction(invoice.id);
      if (result.success) {
        toast({
          title: 'Factoring Requested',
          description: `Invoice #${invoice.invoiceNumber} has been submitted for factoring. Buyer acceptance is pending.`,
        });
        fetchInvoiceData(); 
      } else {
        toast({
          title: 'Error Requesting Factoring',
          description: result.error || 'Could not request factoring for this invoice.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Factoring Request Failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingFactoring(false);
    }
  };

  const handleBuyerFactoringAction = async (actionType: 'accept' | 'reject') => {
    if (!invoice || !user || profile?.role !== UserRole.BUYER || invoice.clientEmail?.toLowerCase() !== user.email?.toLowerCase()) return;
    setIsBuyerActionLoading(true);
    try {
      const actionFn = actionType === 'accept' ? acceptFactoringByBuyerAction : rejectFactoringByBuyerAction;
      const result = await actionFn(invoice.id);
      if (result.success) {
        toast({
          title: `Factoring ${actionType === 'accept' ? 'Accepted' : 'Rejected'}`,
          description: `Factoring for invoice #${invoice.invoiceNumber} has been ${actionType === 'accept' ? 'accepted' : 'rejected'}.`,
        });
        fetchInvoiceData(); 
      } else {
        toast({
          title: `Error ${actionType === 'accept' ? 'Accepting' : 'Rejecting'} Factoring`,
          description: result.error || `Could not ${actionType} factoring.`,
          variant: 'destructive',
        });
      }
    } catch (err) {
       toast({
        title: `Factoring Action Failed`,
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsBuyerActionLoading(false);
    }
  };

  const handlePlaceBid = async (bidAmount: number, discountFeePercentage: number) => {
    if (!invoice || !user || profile?.role !== UserRole.FINANCIER) return false;
    try {
      const result = await placeFactoringBidAction(invoice.id, bidAmount, discountFeePercentage);
      if (result.success) {
        toast({
          title: 'Bid Placed Successfully!',
          description: `Your bid for invoice #${invoice.invoiceNumber} has been submitted.`,
        });
        fetchInvoiceData(); 
        return true;
      } else {
        toast({
          title: 'Error Placing Bid',
          description: result.error || 'Could not place bid for this invoice.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (err) {
      toast({
        title: 'Bid Placement Failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    if (!invoice || !user || profile?.role !== UserRole.MSME || invoice.user_id !== user.id) return;
    setIsAcceptingBid(bidId);
    try {
      const result = await acceptFactoringBidAction(invoice.id, bidId);
      if (result.success) {
        toast({
          title: 'Bid Accepted!',
          description: `You have accepted a bid for invoice #${invoice.invoiceNumber}. The invoice is now marked as Financed.`,
        });
        fetchInvoiceData(); 
      } else {
        toast({
          title: 'Error Accepting Bid',
          description: result.error || 'Could not accept this bid.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Bid Acceptance Failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsAcceptingBid(null);
    }
  };


  if (loading || authLoading) {
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

  const isMSMEOwner = user && profile?.role === UserRole.MSME && invoice.user_id === user.id;
  const isBuyerRecipient = user && profile?.role === UserRole.BUYER && invoice.clientEmail && user.email && invoice.clientEmail.toLowerCase() === user.email.toLowerCase();
  const isFinancier = user && profile?.role === UserRole.FINANCIER;

  const canRequestFactoring = isMSMEOwner &&
                              (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE) && 
                              invoice.factoring_status === FactoringStatus.NONE;

  const canBuyerActOnFactoring = isBuyerRecipient && invoice.factoring_status === FactoringStatus.REQUESTED;
  
  const canFinancierBid = isFinancier && 
                          (invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED || invoice.factoring_status === FactoringStatus.PENDING_FINANCING) &&
                          invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID;

  const canMSMEViewBids = isMSMEOwner && invoice.bids && invoice.bids.length > 0;
  const canMSMEAcceptBids = canMSMEViewBids && (invoice.factoring_status === FactoringStatus.PENDING_FINANCING || invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED);


  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
                <InvoiceStatusBadge status={invoice.status} />
                {invoice.factoring_status && invoice.factoring_status !== FactoringStatus.NONE && (
                    <Badge variant={
                        invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED || invoice.factoring_status === FactoringStatus.PENDING_FINANCING ? "default" :
                        invoice.factoring_status === FactoringStatus.BUYER_REJECTED ? "destructive" :
                        invoice.factoring_status === FactoringStatus.FINANCED ? "default" : 
                        "secondary"
                       } className={cn("flex items-center gap-1.5", {
                        "bg-green-500 text-white hover:bg-green-600": invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED || invoice.factoring_status === FactoringStatus.PENDING_FINANCING,
                        "bg-accent text-accent-foreground hover:bg-accent/90": invoice.factoring_status === FactoringStatus.FINANCED,
                       })}>
                         {invoice.factoring_status === FactoringStatus.REQUESTED && <TrendingUp className="h-3.5 w-3.5" /> }
                         {(invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED || invoice.factoring_status === FactoringStatus.PENDING_FINANCING) && <Handshake className="h-3.5 w-3.5" /> }
                         {invoice.factoring_status === FactoringStatus.BUYER_REJECTED && <XCircle className="h-3.5 w-3.5" /> }
                         {invoice.factoring_status === FactoringStatus.FINANCED && <Landmark className="h-3.5 w-3.5" /> }
                         {getFactoringStatusDisplayName(invoice.factoring_status)}
                       </Badge>
                )}
            </div>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
            {isMSMEOwner && invoice.status === InvoiceStatus.DRAFT && (
                <Button variant="outline" asChild>
                    <Link href={`/invoices/${invoice.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Invoice
                    </Link>
                </Button>
            )}
             {canRequestFactoring && (
              <Button
                variant="outline"
                onClick={handleRequestFactoring}
                disabled={isRequestingFactoring}
                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                {isRequestingFactoring ? 'Requesting...' : 'Request Factoring'}
              </Button>
            )}
            {canBuyerActOnFactoring && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleBuyerFactoringAction('accept')}
                  disabled={isBuyerActionLoading}
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isBuyerActionLoading ? 'Processing...' : 'Accept Factoring'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBuyerFactoringAction('reject')}
                  disabled={isBuyerActionLoading}
                  className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <ShieldX className="mr-2 h-4 w-4" />
                  {isBuyerActionLoading ? 'Processing...' : 'Reject Factoring'}
                </Button>
              </>
            )}
            {isMSMEOwner && (
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
            )}
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
                    <h3 className="font-semibold text-muted-foreground">Client (Buyer)</h3>
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

      {canFinancierBid && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Place Your Bid</CardTitle>
            <CardDescription>Submit your bid for financing this invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlaceBidForm invoiceId={invoice.id} invoiceAmount={invoice.totalAmount} onSubmitBid={handlePlaceBid} />
          </CardContent>
        </Card>
      )}

      {canMSMEViewBids && (
         <Card className="mt-6">
          <CardHeader>
            <CardTitle>Factoring Bids Received</CardTitle>
             <CardDescription>
                {invoice.factoring_status === FactoringStatus.FINANCED 
                    ? `This invoice has been financed. Accepted Bid ID: ${invoice.accepted_bid_id?.substring(0,8) || 'N/A'}`
                    : "Review the bids below. You can accept one bid to proceed with financing."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BidList 
                bids={invoice.bids || []} 
                onAcceptBid={handleAcceptBid} 
                canAccept={canMSMEAcceptBids && invoice.factoring_status !== FactoringStatus.FINANCED}
                isAcceptingBidId={isAcceptingBid}
                acceptedBidId={invoice.accepted_bid_id}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
