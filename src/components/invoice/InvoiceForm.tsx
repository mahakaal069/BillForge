"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FormStepIndicator } from "./FormStepIndicator";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import type { Invoice } from "@/types/invoice";
import { type ClientHistoryOption, InvoiceStatus } from "@/types/invoice";
import {
  CLIENT_HISTORY_OPTIONS,
  DEFAULT_INDUSTRY_STANDARDS,
} from "@/lib/constants";
import React, { useState, useEffect } from "react";
import { suggestPaymentTermsAction } from "@/app/(app)/invoices/new/actions";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IconUser,
  IconMail,
  IconMapPin,
  IconCalendar,
  IconClock,
  IconClipboard,
  IconNotes,
  IconBuildingStore,
  IconChartBar,
  IconSend,
  IconDeviceFloppy,
  IconArrowLeft,
  IconArrowRight,
  IconBulb,
  IconReceipt,
} from "@tabler/icons-react";

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.number().min(0.01, "Quantity must be positive."),
  unitPrice: z.number().min(0, "Unit price must be non-negative."),
  total: z.number(),
});

const invoiceFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required."),
  clientEmail: z.string().email("Invalid email address."),
  clientAddress: z.string().min(1, "Client address is required."),
  invoiceDate: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  clientHistory: z.string().optional(),
  industryStandards: z.string().optional(),
  subtotal: z.number().default(0),
  taxAmount: z.number().default(0),
  totalAmount: z.number().default(0),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  initialData?: Partial<
    Invoice & { items: Array<Partial<Invoice["items"][0]>> }
  >; // Allow partial items for initialData
  onSubmitSend: (data: InvoiceFormValues) => Promise<void>;
  onSubmitDraft: (data: InvoiceFormValues) => Promise<void>;
  isSubmitting?: boolean;
  formMode?: "create" | "edit" | "view";
}

const FORM_STEPS = [
  "Client Details",
  "Invoice Items",
  "Terms & Notes",
  "Review",
];

export function InvoiceForm({
  initialData,
  onSubmitSend,
  onSubmitDraft,
  isSubmitting = false,
  formMode = "create",
}: InvoiceFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [suggestedTermsResult, setSuggestedTermsResult] = useState<{
    suggestedTerms: string;
    reasoning: string;
  } | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: initialData?.clientName || "",
      clientEmail: initialData?.clientEmail || "",
      clientAddress: initialData?.clientAddress || "",
      invoiceDate: initialData?.invoiceDate
        ? new Date(initialData.invoiceDate)
        : new Date(),
      dueDate: initialData?.dueDate
        ? new Date(initialData.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: initialData?.items?.length
        ? initialData.items
        : [
            {
              description: "",
              quantity: 1,
              unitPrice: 0,
              total: 0,
              id: `temp-${Math.random().toString(36).substring(7)}`,
            },
          ],
      paymentTerms: initialData?.paymentTerms || "",
      notes: initialData?.notes || "",
      clientHistory:
        initialData?.clientHistory || CLIENT_HISTORY_OPTIONS[0].value,
      industryStandards:
        initialData?.industryStandards || DEFAULT_INDUSTRY_STANDARDS,
      subtotal: initialData?.subtotal || 0,
      taxAmount: initialData?.taxAmount || 0,
      totalAmount: initialData?.totalAmount || 0,
    },
  });

  useEffect(() => {
    if (formMode === "edit" && initialData) {
      form.reset({
        clientName: initialData.clientName || "",
        clientEmail: initialData.clientEmail || "",
        clientAddress: initialData.clientAddress || "",
        invoiceDate: initialData.invoiceDate
          ? new Date(initialData.invoiceDate)
          : new Date(),
        dueDate: initialData.dueDate
          ? new Date(initialData.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: initialData.items?.map((item) => ({
          id: item.id || `temp-${Math.random().toString(36).substring(7)}`,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
        })) || [
          {
            description: "",
            quantity: 1,
            unitPrice: 0,
            total: 0,
            id: `temp-${Math.random().toString(36).substring(7)}`,
          },
        ],
        paymentTerms: initialData.paymentTerms || "",
        notes: initialData.notes || "",
        clientHistory:
          form.getValues("clientHistory") || CLIENT_HISTORY_OPTIONS[0].value,
        industryStandards:
          form.getValues("industryStandards") || DEFAULT_INDUSTRY_STANDARDS,
        subtotal: Number(initialData.subtotal) || 0,
        taxAmount: Number(initialData.taxAmount) || 0,
        totalAmount: Number(initialData.totalAmount) || 0,
      });
    } else if (formMode === "create") {
      if (!form.getValues("invoiceDate")) {
        form.setValue("invoiceDate", new Date(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
      if (!form.getValues("dueDate")) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        form.setValue("dueDate", thirtyDaysFromNow, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
      if (!form.getValues("items") || form.getValues("items").length === 0) {
        form.setValue("items", [
          {
            description: "",
            quantity: 1,
            unitPrice: 0,
            total: 0,
            id: `temp-${Math.random().toString(36).substring(7)}`,
          },
        ]);
      }
    }
  }, [initialData, formMode, form]);

  const handleSuggestTerms = async () => {
    setIsLoadingTerms(true);
    setSuggestedTermsResult(null);
    const invoiceAmount = form.getValues("totalAmount") || 0;
    const clientHistory =
      form.getValues("clientHistory") || CLIENT_HISTORY_OPTIONS[0].value;
    const industryStandards =
      form.getValues("industryStandards") || DEFAULT_INDUSTRY_STANDARDS;
    const clientHistoryLabel =
      CLIENT_HISTORY_OPTIONS.find((opt) => opt.value === clientHistory)
        ?.label || clientHistory;

    try {
      const result = await suggestPaymentTermsAction({
        invoiceAmount,
        clientHistory: clientHistoryLabel,
        industryStandards,
      });
      setSuggestedTermsResult(result);
      setShowTermsDialog(true);
    } catch (error) {
      console.error("Error suggesting terms:", error);
      toast({
        title: "Error Suggesting Terms",
        description:
          "Could not fetch AI-powered suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const applySuggestedTerms = () => {
    if (suggestedTermsResult) {
      form.setValue("paymentTerms", suggestedTermsResult.suggestedTerms);
      toast({
        title: "Terms Applied",
        description: "Suggested payment terms have been applied.",
      });
    }
    setShowTermsDialog(false);
  };

  const isViewMode = formMode === "view";

  const formSections = [
    // Client Details Section
    <motion.div
      key="client-details"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IconUser className="w-4 h-4" />
                Client Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter client name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="clientEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IconMail className="w-4 h-4" />
                Client Email
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="clientAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              <IconMapPin className="w-4 h-4" />
              Client Address
            </FormLabel>
            <FormControl>
              <Textarea placeholder="Enter client's full address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="invoiceDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="flex items-center gap-2">
                <IconCalendar className="w-4 h-4" />
                Invoice Date
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <IconCalendar className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="flex items-center gap-2">
                <IconClock className="w-4 h-4" />
                Due Date
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <IconCalendar className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </motion.div>,

    // Invoice Items Section
    <motion.div
      key="invoice-items"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconReceipt className="w-5 h-5" />
            Invoice Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceItemsTable form={form} />
        </CardContent>
      </Card>
    </motion.div>,

    // Terms & Notes Section
    <motion.div
      key="terms-notes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="grid gap-4">
        <FormField
          control={form.control}
          name="paymentTerms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IconClipboard className="w-4 h-4" />
                Payment Terms
              </FormLabel>
              <div className="flex gap-2">
                <FormControl className="flex-1">
                  <Textarea
                    placeholder="Specify payment terms and conditions"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={async () => {
                    setIsLoadingTerms(true);
                    try {
                      const result = await suggestPaymentTermsAction({
                        clientHistory:
                          form.getValues("clientHistory") ??
                          CLIENT_HISTORY_OPTIONS[0].value,
                        industryStandards:
                          form.getValues("industryStandards") ??
                          DEFAULT_INDUSTRY_STANDARDS,
                        invoiceAmount: form.getValues("totalAmount") ?? 0,
                      });
                      if (result.suggestedTerms) {
                        setSuggestedTermsResult(result);
                        setShowTermsDialog(true);
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description:
                          "Failed to generate payment terms suggestion.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsLoadingTerms(false);
                    }
                  }}
                >
                  <IconBulb className="w-4 h-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IconNotes className="w-4 h-4" />
                Additional Notes
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes or comments"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="clientHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <IconBuildingStore className="w-4 h-4" />
                  Client History
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client history" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CLIENT_HISTORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industryStandards"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <IconChartBar className="w-4 h-4" />
                  Industry Standards
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </motion.div>,

    // Review Section
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Review Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Client Information</h4>
              <p>{form.getValues("clientName")}</p>
              <p className="text-sm text-muted-foreground">
                {form.getValues("clientEmail")}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {form.getValues("clientAddress")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Invoice Details</h4>
              <p>
                Invoice Date: {format(form.getValues("invoiceDate"), "PPP")}
              </p>
              <p>Due Date: {format(form.getValues("dueDate"), "PPP")}</p>
              <p className="font-semibold mt-2">
                Total Amount: {formatCurrency(form.getValues("totalAmount"))}
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">
              Items ({form.getValues("items").length})
            </h4>
            <div className="max-h-40 overflow-y-auto border rounded-md">
              <table className="min-w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {form.getValues("items").map((item, index) => (
                    <tr key={item.id || index} className="border-t">
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>,
  ];

  const handleSubmit = async (
    data: InvoiceFormValues,
    action: "send" | "draft"
  ) => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields correctly.",
          variant: "destructive",
        });
        return;
      }

      if (action === "send") {
        await onSubmitSend(data);
      } else {
        await onSubmitDraft(data);
      }
    } catch (error) {
      console.error(
        `Error ${action === "send" ? "sending" : "saving draft"}:`,
        error
      );
      toast({
        title: `Error ${action === "send" ? "Sending" : "Saving Draft"}`,
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = form.getValues();
          await handleSubmit(formData, "send");
        }}
        className="space-y-8"
      >
        <FormStepIndicator
          steps={FORM_STEPS}
          currentStep={currentStep}
          className="mb-8"
        />

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {formSections[currentStep]}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0 || isSubmitting}
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === FORM_STEPS.length - 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const formData = form.getValues();
                    await handleSubmit(formData, "draft");
                  }}
                  disabled={isSubmitting}
                >
                  <IconDeviceFloppy className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <IconSend className="w-4 h-4 mr-2" />
                  Send Invoice
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() =>
                  setCurrentStep((prev) =>
                    Math.min(FORM_STEPS.length - 1, prev + 1)
                  )
                }
                disabled={isSubmitting}
              >
                Next
                <IconArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suggested Payment Terms</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span className="space-y-4 block">
                {suggestedTermsResult?.suggestedTerms}
                <br />
                <span className="text-sm text-muted-foreground block mt-4">
                  Reasoning: {suggestedTermsResult?.reasoning}
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applySuggestedTerms}>
              Use Suggested Terms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
