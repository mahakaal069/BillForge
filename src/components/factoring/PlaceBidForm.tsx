
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Landmark } from 'lucide-react';

const placeBidSchema = z.object({
  bidAmount: z.coerce
    .number()
    .positive('Bid amount must be positive.')
    .max(10000000, 'Bid amount seems too high.'), // Example max
  discountFeePercentage: z.coerce
    .number()
    .min(0.01, 'Discount fee must be at least 0.01%.')
    .max(50, 'Discount fee cannot exceed 50%.'), // Example max
});

type PlaceBidFormValues = z.infer<typeof placeBidSchema>;

interface PlaceBidFormProps {
  invoiceId: string;
  invoiceAmount: number;
  onSubmitBid: (bidAmount: number, discountFeePercentage: number) => Promise<boolean>; // Returns true on success
}

export function PlaceBidForm({ invoiceId, invoiceAmount, onSubmitBid }: PlaceBidFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<PlaceBidFormValues>({
    resolver: zodResolver(placeBidSchema),
    defaultValues: {
      bidAmount: invoiceAmount * 0.9, // Default to 90% of invoice amount
      discountFeePercentage: 2.5, // Default to 2.5%
    },
  });

  const handleSubmit: SubmitHandler<PlaceBidFormValues> = async (data) => {
    setIsLoading(true);
    const success = await onSubmitBid(data.bidAmount, data.discountFeePercentage);
    if (success) {
      form.reset(); // Reset form on successful submission
    }
    setIsLoading(false);
  };
  
  const calculatedDiscountAmount = (form.watch('bidAmount') * form.watch('discountFeePercentage')) / 100;
  const netAmountToSeller = form.watch('bidAmount') - calculatedDiscountAmount;


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="bidAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Bid Amount (Upfront Payment)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 900.00" {...field} />
              </FormControl>
              <FormDescription>
                The amount you will pay to the MSME upfront. Max: {invoiceAmount.toFixed(2)}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discountFeePercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Discount Fee (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 2.5" {...field} />
              </FormControl>
              <FormDescription>
                Your percentage fee, calculated on the bid amount.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
            <div className="flex justify-between">
                <span>Bid Amount Offered:</span>
                <span className="font-medium">${form.watch('bidAmount')?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
                <span>Discount Fee ({form.watch('discountFeePercentage') || 0}% of Bid):</span>
                <span className="font-medium">${calculatedDiscountAmount?.toFixed(2) || '0.00'}</span>
            </div>
             <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Net Amount to Seller (MSME):</span>
                <span>${netAmountToSeller?.toFixed(2) || '0.00'}</span>
            </div>
        </div>


        <Button type="submit" disabled={isLoading} className="w-full">
          <Landmark className="mr-2 h-4 w-4" />
          {isLoading ? 'Submitting Bid...' : 'Submit Bid'}
        </Button>
      </form>
    </Form>
  );
}
