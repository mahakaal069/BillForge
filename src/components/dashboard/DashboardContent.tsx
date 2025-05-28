"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/ui/InvoiceStatusBadge";
import { DeleteInvoiceDialog } from "@/components/invoice/DeleteInvoiceDialog";
import { AnimatedCard } from "@/components/dashboard/AnimatedCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import {
  IconCash,
  IconClock,
  IconAlertTriangle,
  IconFileInvoice,
  IconEdit,
  IconEye,
  IconPlus,
  IconArrowUpRight,
  IconBuildingBank,
  IconBuildingStore,
  IconChecks,
  IconTrendingUp,
  IconHandOff,
  IconX,
} from "@tabler/icons-react";
import type { Invoice } from "@/types/invoice";
import { FactoringStatus, InvoiceStatus } from "@/types/invoice";
import type { Profile } from "@/types/user";
import { UserRole } from "@/types/user";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

interface DashboardContentProps {
  profile: Profile;
  invoices: Invoice[];
  metrics: {
    totalRevenue: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  filteredInvoices: {
    paidInvoices: Invoice[];
    outstandingInvoices: Invoice[];
    overdueInvoices: Invoice[];
    draftInvoices: Invoice[];
  };
}

export default function DashboardContent({
  profile,
  invoices,
  metrics,
  filteredInvoices,
}: DashboardContentProps) {
  const isMSME = profile.role === UserRole.MSME;
  const isBuyer = profile.role === UserRole.BUYER;
  const isFinancier = profile.role === UserRole.FINANCIER;

  const { totalRevenue, totalOutstanding, totalOverdue } = metrics;
  const { paidInvoices, outstandingInvoices, overdueInvoices, draftInvoices } =
    filteredInvoices;

  const chartData = [
    { name: "Paid", value: totalRevenue },
    { name: "Outstanding", value: totalOutstanding },
    { name: "Overdue", value: totalOverdue },
  ];

  return (
    <div className="space-y-8 p-8 max-w-[2000px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <motion.h1
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            Welcome back
          </motion.h1>
          <motion.p
            className="text-muted-foreground mt-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Here's what's happening with your{" "}
            {isMSME ? "invoices" : isBuyer ? "purchases" : "opportunities"}
          </motion.p>
        </div>
        {isMSME && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              asChild
              size="lg"
              className="shadow-lg hover:shadow-xl transition-shadow"
            >
              <Link href="/invoices/new">
                <IconPlus className="mr-2 h-5 w-5" />
                Create New Invoice
              </Link>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnimatedCard
          delay={0.1}
          className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Total Outstanding
            </CardTitle>
            <IconCash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {outstandingInvoices.length} invoices pending
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard
          delay={0.2}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              Total Paid
            </CardTitle>
            <IconChecks className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidInvoices.length} invoices paid
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard
          delay={0.3}
          className="bg-gradient-to-br from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20 border border-red-200/50 dark:border-red-800/50 hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Overdue
            </CardTitle>
            <IconAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueInvoices.length} invoices overdue
            </p>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard
          delay={0.4}
          className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-800/50 hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Factoring Requests
            </CardTitle>
            <IconTrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {
                invoices.filter(
                  (inv) => inv.factoring_status === FactoringStatus.REQUESTED
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending your review
            </p>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Factoring Requests Section */}
      {isBuyer && (
        <AnimatedCard
          delay={0.5}
          className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300"
        >
          <CardHeader className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IconBuildingStore className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-blue-600 dark:text-blue-400">
                Invoices Requiring Your Attention
              </CardTitle>
              <CardDescription className="mt-1">
                Review and manage invoices from your suppliers. Take action on
                factoring requests.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.filter(
                (inv) => inv.factoring_status === FactoringStatus.REQUESTED
              ).length > 0 ? (
                <div className="grid gap-4">
                  {invoices
                    .filter(
                      (inv) =>
                        inv.factoring_status === FactoringStatus.REQUESTED
                    )
                    .map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-blue-100 dark:border-blue-800/50 hover:shadow-md transition-all duration-300"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            From: {invoice.sellerName}
                          </p>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(invoice.totalAmount)}
                          </p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-300"
                          asChild
                        >
                          <Link href={`/invoices/${invoice.id}/view`}>
                            Review Request
                            <IconArrowUpRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 w-fit mx-auto mb-4">
                    <IconHandOff className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-muted-foreground">
                    No pending factoring requests
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      )}

      {/* Recent Invoices Table */}
      <AnimatedCard
        delay={0.6}
        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-800/50 hover:shadow-lg transition-all duration-300"
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IconFileInvoice className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-blue-600 dark:text-blue-400">
                Your Invoices
              </CardTitle>
              <CardDescription className="mt-1">
                {invoices.length > 0
                  ? "A list of your invoices and their current status."
                  : "No invoices found."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 w-fit mx-auto mb-4">
                <IconFileInvoice className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-muted-foreground">
                You haven't received any invoices yet.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Factoring Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const isBuyerReviewNeeded =
                      isBuyer &&
                      invoice.factoring_status === FactoringStatus.REQUESTED;
                    return (
                      <TableRow
                        key={invoice.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                      >
                        <TableCell className="font-medium text-blue-900 dark:text-blue-100">
                          {invoice.invoiceNumber || "N/A"}
                        </TableCell>
                        <TableCell>{invoice.sellerName || "N/A"}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate
                            ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              invoice.factoring_status ===
                                FactoringStatus.REQUESTED &&
                                "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
                              invoice.factoring_status ===
                                FactoringStatus.ACCEPTED &&
                                "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                              invoice.factoring_status ===
                                FactoringStatus.REJECTED &&
                                "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                            )}
                          >
                            {invoice.factoring_status ? (
                              invoice.factoring_status.charAt(0).toUpperCase() + 
                              invoice.factoring_status.slice(1).toLowerCase()
                            ) : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant={
                                isBuyerReviewNeeded ? "default" : "outline"
                              }
                              size="sm"
                              asChild
                              className={cn(
                                "transition-all duration-300",
                                isBuyerReviewNeeded
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
                              )}
                            >
                              <Link href={`/invoices/${invoice.id}/view`}>
                                {isBuyerReviewNeeded ? (
                                  <>
                                    <IconChecks className="mr-2 h-4 w-4" />
                                    Review Request
                                  </>
                                ) : (
                                  <>
                                    View Details
                                    <IconArrowUpRight className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {invoices.length > 0 && (
          <CardFooter className="border-t border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/50">
            <p className="text-xs text-muted-foreground">
              Showing <strong>{invoices.length}</strong> invoices.
            </p>
          </CardFooter>
        )}
      </AnimatedCard>
    </div>
  );
}
