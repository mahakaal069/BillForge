
import { getInvoiceWithItemsById, type InvoiceWithItems } from '@/app/(app)/invoices/actions';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { AlertTriangle, FileWarning } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function ViewInvoicePage({ params }: { params: { id: string } }) {
  const invoice = await getInvoiceWithItemsById(params.id);

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

  // For the view page, we don't need actual submit handlers for the form.
  // We can pass dummy functions or disable submission capabilities in InvoiceForm for 'view' mode.
  // The InvoiceForm has been updated to handle a 'formMode="view"' prop.
  const dummySubmit = async () => { /* no-op for view mode */ };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} className="mt-1"/>
        </div>
        <Button variant="outline" asChild>
            {/* Later, this could be an "Edit" button: <Link href={`/invoices/${invoice.id}/edit`}>Edit Invoice</Link> */}
             <Link href={`/dashboard`}>Back to Dashboard</Link>
        </Button>
      </div>

      {/* Displaying key details directly, InvoiceForm can be used for a consistent layout if complex */}
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
                    <p>{format(new Date(invoice.invoiceDate), 'PPP')}</p>
                    <h3 className="font-semibold text-muted-foreground mt-2">Due Date</h3>
                    <p>{format(new Date(invoice.dueDate), 'PPP')}</p>
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

      {/* Alternative: Using InvoiceForm in "view" mode */}
      {/* <InvoiceForm
        initialData={invoice}
        onSubmitSend={dummySubmit} // Not used in view mode
        onSubmitDraft={dummySubmit} // Not used in view mode
        formMode="view"
      /> */}
    </div>
  );
}

// Optional: Add a loading.tsx file in the same directory for a loading skeleton
// src/app/(app)/invoices/[id]/view/loading.tsx
// export default function LoadingInvoiceView() {
//   return <div>Loading invoice details...</div>;
// }
