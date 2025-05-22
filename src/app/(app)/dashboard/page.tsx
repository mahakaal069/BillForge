import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_INVOICES } from '@/lib/mock-data';
import type { Invoice } from '@/types/invoice';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { format } from 'date-fns';
import { ArrowUpRight, PlusCircle, FileText } from 'lucide-react';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function DashboardPage() {
  const invoices = MOCK_INVOICES; // In a real app, fetch this data

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

      {/* Quick Stats Cards - Example */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0))}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.totalAmount, 0))}</div>
            <p className="text-xs text-muted-foreground">Across {invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE').length} invoices</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.totalAmount, 0))}</div>
            <p className="text-xs text-muted-foreground">{invoices.filter(inv => inv.status === 'OVERDUE').length} invoices overdue</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.filter(inv => inv.status === 'DRAFT').length}</div>
            <p className="text-xs text-muted-foreground">Invoices in draft</p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>A list of your recent invoices.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="#"> {/* Placeholder for view/edit invoice */}
                        View
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Showing <strong>{invoices.length}</strong> invoices.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
