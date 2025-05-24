
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Invoice } from '@/types/invoice';
import { InvoiceStatus, FactoringStatus } from '@/types/invoice';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { ArrowUpRight, PlusCircle, FileText, AlertTriangle, Edit, TrendingUp, Handshake, XCircle, Landmark, Briefcase, Building } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DeleteInvoiceDialog } from '@/components/invoice/DeleteInvoiceDialog';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types/user';
import { UserRole } from '@/types/user';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getFactoringStatusDisplayName(status: FactoringStatus | undefined | null): string {
  if (!status || status === FactoringStatus.NONE) return '';
  switch (status) {
    case FactoringStatus.REQUESTED: return 'Factoring Requested';
    case FactoringStatus.BUYER_ACCEPTED: return 'Buyer Accepted';
    case FactoringStatus.BUYER_REJECTED: return 'Buyer Rejected';
    case FactoringStatus.PENDING_FINANCING: return 'Pending Financing';
    case FactoringStatus.FINANCED: return 'Financed';
    case FactoringStatus.REPAID: return 'Repaid to Financier';
    default: return status.replace(/_/g, ' ');
  }
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    if (profileError && (profileError as any).message) {
      console.error('Dashboard: Error fetching profile - Supabase message:', (profileError as any).message, 'Full error object:', profileError);
    } else if (!profileData) {
      console.error(`Dashboard: Error fetching profile - No profile data found for user ID: ${user.id}. Raw profileError:`, profileError);
    } else {
      console.error('Dashboard: Error fetching profile - An unspecified issue occurred. Raw profileError:', profileError, 'ProfileData exists:', !!profileData);
    }
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Fetching User Profile</h2>
            <p className="text-muted-foreground">Could not load your user profile. Please try again later.</p>
        </div>
    );
  }
  const profile = profileData as Profile;


  let invoicesQuery;
  // This syntax tells Supabase:
  // "For the 'profiles' table, use the 'user_id' column from the current 'invoices' table
  // to match against the primary key of 'profiles' (which is 'id'). Then, retrieve 'full_name'."
  const msmeProfileJoinSyntax = 'profiles!user_id(full_name)';


  if (profile.role === UserRole.MSME) {
    invoicesQuery = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_name,
        total_amount,
        due_date,
        status,
        is_factoring_requested,
        factoring_status,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
  } else if (profile.role === UserRole.BUYER && user.email) {
    invoicesQuery = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_name,
        total_amount,
        due_date,
        status,
        is_factoring_requested,
        factoring_status,
        created_at,
        ${msmeProfileJoinSyntax}
      `)
      .eq('client_email', user.email)
      .order('created_at', { ascending: false });
  } else if (profile.role === UserRole.FINANCIER) {
    invoicesQuery = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_name,
        total_amount,
        due_date,
        status,
        factoring_status,
        created_at,
        ${msmeProfileJoinSyntax}
      `)
      .in('factoring_status', [FactoringStatus.BUYER_ACCEPTED, FactoringStatus.PENDING_FINANCING, FactoringStatus.FINANCED])
      .order('created_at', { ascending: false });
  } else {
    console.warn(`Dashboard: User ${user.id} has role '${profile.role}' and email '${user.email}', which doesn't match MSME, BUYER with email, or FINANCIER for invoice fetching. Returning empty set.`);
    invoicesQuery = supabase.from('invoices').select('*').limit(0);
  }


  const { data: invoicesData, error: invoicesError } = await invoicesQuery;


  if (invoicesError) {
    const errorMessage = (invoicesError as any).message || 'No specific error message. Error object might be empty or not an instance of Error.';
    const userContext = `User ID: ${user.id}, Role: ${profile.role}, Email for query (if buyer): ${profile.role === UserRole.BUYER ? user.email : 'N/A'}.`;
    console.error(`Error fetching invoices: ${errorMessage}. ${userContext}. Raw error object:`, invoicesError);

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Fetching Invoices</h2>
            <p className="text-muted-foreground">Could not load your invoice data. Please try again later.</p>
            <p className="text-xs text-muted-foreground mt-2">Details: {errorMessage}</p>
        </div>
    );
  }

  const invoices: Invoice[] = (invoicesData || []).map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    clientName: inv.client_name,
    sellerName: (profile.role === UserRole.BUYER || profile.role === UserRole.FINANCIER) && inv.profiles ? inv.profiles.full_name : undefined,
    clientEmail: '', // Not fetched for all roles, populated as needed
    clientAddress: '', // Not fetched for all roles
    invoiceDate: '', // Not fetched for all roles
    dueDate: inv.due_date,
    items: [], // Not fetched in dashboard list view
    subtotal: 0, // Not fetched
    taxAmount: 0, // Not fetched
    totalAmount: inv.total_amount ?? 0,
    status: inv.status as InvoiceStatus,
    is_factoring_requested: inv.is_factoring_requested,
    factoring_status: inv.factoring_status as FactoringStatus,
    created_at: inv.created_at,
  }));

  const isMSME = profile.role === UserRole.MSME;
  const isBuyer = profile.role === UserRole.BUYER;
  const isFinancier = profile.role === UserRole.FINANCIER;

  const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PAID);
  const outstandingInvoices = invoices.filter(inv => inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE);
  const overdueInvoices = invoices.filter(inv => inv.status === InvoiceStatus.OVERDUE);
  const draftInvoices = invoices.filter(inv => inv.status === InvoiceStatus.DRAFT && isMSME);

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {isMSME && (
          <Button asChild>
            <Link href="/invoices/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              New Invoice
            </Link>
          </Button>
        )}
      </div>

    {isMSME && (
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
    )}
    {isBuyer && (
        <Card>
            <CardHeader className="flex items-center gap-2">
                 <Building className="h-6 w-6 text-primary"/>
                <div>
                    <CardTitle>Invoices Sent To You</CardTitle>
                    <CardDescription>These are invoices where you are listed as the client.</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )}
    {isFinancier && (
        <Card>
            <CardHeader className="flex items-center gap-2">
                <Landmark className="h-6 w-6 text-primary"/>
                <div>
                    <CardTitle>Factoring Opportunities</CardTitle>
                    <CardDescription>Invoices accepted by buyers or pending financing bids.</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {isMSME ? <Briefcase className="mr-2 h-5 w-5 text-primary"/> : null}
            {isBuyer ? <Building className="mr-2 h-5 w-5 text-primary"/> : null}
            {isFinancier ? <Landmark className="mr-2 h-5 w-5 text-primary"/> : null}
            {isMSME ? 'Recent Invoices' : isBuyer ? 'Your Invoices' : 'Factoring Opportunities'}
          </CardTitle>
          <CardDescription>
            {invoices.length > 0 ? `A list of ${isMSME ? 'your recent' : isBuyer ? 'your' : 'available'} invoices.` : 'No invoices found.'}
            {invoices.length === 0 && isMSME && ' Create your first one!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isMSME ? "You haven't created any invoices yet." :
                 isBuyer ? "You haven't received any invoices yet." :
                 "There are currently no invoices available for factoring."}
              </p>
              {isMSME && (
                <Button asChild className="mt-4">
                  <Link href="/invoices/new">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Invoice
                  </Link>
                </Button>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>{isMSME ? 'Client (Buyer)' : 'Seller (MSME)'}</TableHead>
                {isFinancier && <TableHead>Buyer (Client)</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Factoring Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{isMSME ? invoice.clientName : (invoice.sellerName || 'N/A')}</TableCell>
                  {isFinancier && <TableCell>{invoice.clientName || 'N/A'}</TableCell>}
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    {invoice.factoring_status && invoice.factoring_status !== FactoringStatus.NONE ? (
                       <Badge variant={
                        invoice.factoring_status === FactoringStatus.BUYER_ACCEPTED ? "default" :
                        invoice.factoring_status === FactoringStatus.BUYER_REJECTED ? "destructive" :
                        invoice.factoring_status === FactoringStatus.PENDING_FINANCING ? "secondary" :
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
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {isMSME && invoice.status === InvoiceStatus.DRAFT && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/invoices/${invoice.id}/view`}>
                          {isFinancier ? 'View Details & Bid' : 'View'}
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                       {isMSME && <DeleteInvoiceDialog invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />}
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

    