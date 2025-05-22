
"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CalendarIcon, Lightbulb, Download, Send } from 'lucide-react';
import { format } from 'date-fns';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import type { Invoice, InvoiceItem as InvoiceItemType } from '@/types/invoice'; // Renamed to avoid conflict
import { InvoiceStatus, type ClientHistoryOption } from '@/types/invoice';
import { CLIENT_HISTORY_OPTIONS, DEFAULT_INDUSTRY_STANDARDS } from '@/lib/constants';
import React, { useState } from 'react';
import { suggestPaymentTermsAction } from '@/app/(app)/invoices/new/actions';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  quantity: z.number().min(0.01, 'Quantity must be positive.'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative.'),
  total: z.number(),
});

const invoiceFormSchema = z.object({
  clientName: z.string().min(1, 'Client name is required.'),
  clientEmail: z.string().email('Invalid email address.'),
  clientAddress: z.string().min(1, 'Client address is required.'),
  invoiceDate: z.date({ required_error: 'Invoice date is required.' }),
  dueDate: z.date({ required_error: 'Due date is required.' }),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required.'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  // Fields for Smart Terms
  clientHistory: z.string().optional(),
  industryStandards: z.string().optional(),
  // Calculated fields (not directly editable in main form, but part of schema for calculations)
  subtotal: z.number().default(0),
  taxAmount: z.number().default(0), // Assuming taxRate is handled to calculate this
  totalAmount: z.number().default(0),
  // taxRate: z.string().optional().default("0"), // Example tax rate string
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  initialData?: Partial<Invoice>;
  onSubmit: (data: InvoiceFormValues) => Promise<void>;
}

export function InvoiceForm({ initialData, onSubmit }: InvoiceFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [suggestedTermsResult, setSuggestedTermsResult] = useState<{ suggestedTerms: string; reasoning: string } | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);


  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: initialData?.clientName || '',
      clientEmail: initialData?.clientEmail || '',
      clientAddress: initialData?.clientAddress || '',
      invoiceDate: initialData?.invoiceDate ? new Date(initialData.invoiceDate) : new Date(),
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(new Date().setDate(new Date().getDate() + 30)),
      items: initialData?.items?.map(item => ({...item})) || [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
      paymentTerms: initialData?.paymentTerms || '',
      notes: initialData?.notes || '',
      clientHistory: CLIENT_HISTORY_OPTIONS[0].value,
      industryStandards: DEFAULT_INDUSTRY_STANDARDS,
      subtotal: initialData?.subtotal || 0,
      taxAmount: initialData?.taxAmount || 0,
      totalAmount: initialData?.totalAmount || 0,
    },
  });

  React.useEffect(() => { // Initialize totals on mount if initialData is provided
    if (initialData?.items) {
        const items = form.getValues('items');
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxAmount = 0; // Simplified
        const totalAmount = subtotal + taxAmount;
        form.setValue('subtotal', subtotal);
        form.setValue('taxAmount', taxAmount);
        form.setValue('totalAmount', totalAmount);
    }
  }, [initialData, form]);


  const handleSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast({
        title: "Invoice Saved!",
        description: "Your invoice has been successfully saved.",
        variant: "default",
      });
      // Optionally reset form or redirect
      // form.reset(); 
    } catch (error) {
      toast({
        title: "Error Saving Invoice",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSuggestTerms = async () => {
    setIsLoadingTerms(true);
    setSuggestedTermsResult(null);
    const invoiceAmount = form.getValues('totalAmount') || 0;
    const clientHistory = form.getValues('clientHistory') || CLIENT_HISTORY_OPTIONS[0].value;
    const industryStandards = form.getValues('industryStandards') || DEFAULT_INDUSTRY_STANDARDS;

    const clientHistoryLabel = CLIENT_HISTORY_OPTIONS.find(opt => opt.value === clientHistory)?.label || clientHistory;

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
        description: "Could not fetch AI-powered suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTerms(false);
    }
  };

  const applySuggestedTerms = () => {
    if (suggestedTermsResult) {
      form.setValue('paymentTerms', suggestedTermsResult.suggestedTerms);
      toast({ title: "Terms Applied", description: "Suggested payment terms have been applied." });
    }
    setShowTermsDialog(false);
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData?.id ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
        <CardDescription>
          {initialData?.id ? `Editing invoice ${initialData.invoiceNumber}` : 'Fill in the details to create a new invoice.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp" {...field} />
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
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. contact@acme.com" {...field} />
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
                  <FormLabel>Client Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. 123 Main St, Anytown, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <InvoiceItemsTable 
              control={form.control} 
              errors={form.formState.errors} 
              setValue={form.setValue} 
              getValues={form.getValues} 
            />

            <div className="space-y-4 p-4 border rounded-md bg-secondary/50">
                <h3 className="text-md font-semibold flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    Smart Payment Terms (Optional)
                </h3>
                <FormField
                    control={form.control}
                    name="clientHistory"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Client Payment History</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select client payment history" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {CLIENT_HISTORY_OPTIONS.map((option: ClientHistoryOption) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormDescription>How has this client paid in the past?</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="industryStandards"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Industry Standards for Payment Terms</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="e.g., Net 30 for SaaS, 50% upfront for large projects"
                            {...field}
                            rows={3}
                        />
                        </FormControl>
                        <FormDescription>What are typical payment terms in this industry?</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <Button type="button" variant="outline" onClick={handleSuggestTerms} disabled={isLoadingTerms} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {isLoadingTerms ? "Suggesting..." : "Suggest Optimal Terms with AI"}
                </Button>
            </div>
            
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Net 30 Days, Due on Receipt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Additional Information</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes for the client." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
               <Send className="mr-2 h-4 w-4" /> {isSubmitting ? 'Saving...' : (initialData?.id ? 'Update Invoice' : 'Create & Send Invoice')}
            </Button>
            <Button type="button" variant="secondary" className="ml-auto" disabled>
               <Download className="mr-2 h-4 w-4" /> Export as PDF
            </Button>
          </CardFooter>
        </form>
      </Form>

      {suggestedTermsResult && (
        <AlertDialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                AI Suggested Payment Terms
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left whitespace-pre-wrap">
                <p className="font-semibold mt-2">Suggested Terms:</p>
                <p className="p-2 bg-muted rounded-md my-1">{suggestedTermsResult.suggestedTerms}</p>
                <p className="font-semibold mt-2">Reasoning:</p>
                <p className="p-2 bg-muted rounded-md my-1 text-sm">{suggestedTermsResult.reasoning}</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applySuggestedTerms} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Apply Suggestion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
