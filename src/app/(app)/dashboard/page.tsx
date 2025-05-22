
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Invoice } from '@/types/invoice';
import { InvoiceStatus } from '@/types/invoice';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { ArrowUpRight, PlusCircle, FileText, AlertTriangle, Edit } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: invoicesData, error: invoicesError } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      client_name,
      total_amount,
      due_date,
      status,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (invoicesError) {
    console.error('Error fetching invoices:', invoicesError);
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Fetching Invoices</h2>
            <p className="text-muted-foreground">Could not load your invoice data. Please try again later.</p>
            <p className="text-xs text-muted-foreground mt-2">{invoicesError.message}</p>
        </div>
    );
  }

  const invoices: Invoice[] = (invoicesData || []).map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    clientName: inv.client_name,
    clientEmail: '',
    clientAddress: '',
    invoiceDate: '',
    dueDate: inv.due_date,
    items: [],
    subtotal: 0,
    taxAmount: 0,
    totalAmount: inv.total_amount ?? 0,
    status: inv.status as InvoiceStatus,
    created_at: inv.created_at,
  }));

  const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PAID);
  const outstandingInvoices = invoices.filter(inv => inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE);
  const overdueInvoices = invoices.filter(inv => inv.status === InvoiceStatus.OVERDUE);
  const draftInvoices = invoices.filter(inv => inv.status === InvoiceStatus.DRAFT);

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/invoices/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Paid)</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Across {outstandingInvoices.length} invoices</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">{overdueInvoices.length} invoices overdue</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Invoices in draft</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            {invoices.length > 0 ? 'A list of your recent invoices.' : 'No invoices found. Create your first one!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You haven&apos;t created any invoices yet.</p>
              <Button asChild className="mt-4">
                <Link href="/invoices/new">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create New Invoice
                </Link>
              </Button>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {invoice.status === InvoiceStatus.DRAFT && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/invoices/${invoice.id}/view`}>
                          View
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
        {invoices.length > 0 && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">Showing <strong>{invoices.length}</strong> invoices.</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
