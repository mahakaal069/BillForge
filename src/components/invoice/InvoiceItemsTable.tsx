
"use client";

import type { Control, FieldErrors, UseFormGetValues } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle } from 'lucide-react';
import type { InvoiceFormValues } from './InvoiceForm'; // Assume InvoiceFormValues is defined in InvoiceForm.tsx
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

interface InvoiceItemsTableProps {
  control: Control<InvoiceFormValues>;
  errors: FieldErrors<InvoiceFormValues>;
  setValue: (name: any, value: any, config?: Object) => void;
  getValues: UseFormGetValues<InvoiceFormValues>;
}

function formatCurrency(amount: number | undefined) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function InvoiceItemsTable({ control, errors, setValue, getValues }: InvoiceItemsTableProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', value: string) => {
    const quantity = field === 'quantity' ? parseFloat(value) : parseFloat(getValues(`items.${index}.quantity` as any) || '0');
    const unitPrice = field === 'unitPrice' ? parseFloat(value) : parseFloat(getValues(`items.${index}.unitPrice` as any) || '0');
    
    if (!isNaN(quantity) && !isNaN(unitPrice)) {
      setValue(`items.${index}.total` as any, quantity * unitPrice, { shouldValidate: true });
    } else {
       setValue(`items.${index}.total` as any, 0, { shouldValidate: true });
    }

    // Update overall totals
    const items = getValues('items');
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    // const taxRate = parseFloat(getValues('taxRate') || '0') / 100; // Assuming taxRate is a percentage string
    // const taxAmount = subtotal * taxRate;
    const taxAmount = 0; // Simplified: no tax for now
    const totalAmount = subtotal + taxAmount;

    setValue('subtotal' as any, subtotal);
    setValue('taxAmount' as any, taxAmount);
    setValue('totalAmount' as any, totalAmount);
  };

  const addNewItem = () => {
    append({ description: '', quantity: 1, unitPrice: 0, total: 0 });
  };

  return (
    <div className="space-y-4">
      <Label className="text-lg font-semibold">Invoice Items</Label>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>
                <Input
                  {...control.register(`items.${index}.description` as const)}
                  placeholder="Item description"
                  className={cn(errors.items?.[index]?.description && 'border-destructive')}
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-destructive mt-1">{errors.items[index]?.description?.message}</p>
                )}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  {...control.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                  placeholder="1"
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className={cn("w-20", errors.items?.[index]?.quantity && 'border-destructive')}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  {...control.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                  placeholder="0.00"
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  className={cn("w-28", errors.items?.[index]?.unitPrice && 'border-destructive')}
                />
              </TableCell>
              <TableCell>
                {formatCurrency(getValues(`items.${index}.total` as any))}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove item">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" onClick={addNewItem} className="mt-2">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
      </Button>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(getValues('subtotal'))}</span>
          </div>
          {/* <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tax (%):</span>
            <Input 
              type="number" 
              {...control.register('taxRate' as const)} 
              className="w-20 h-8" 
              placeholder="0"
              onChange={(e) => {
                 const items = getValues('items');
                 const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
                 const taxRate = parseFloat(e.target.value || '0') / 100;
                 const taxAmount = subtotal * taxRate;
                 const totalAmount = subtotal + taxAmount;
                 setValue('taxAmount' as any, taxAmount);
                 setValue('totalAmount' as any, totalAmount);
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax Amount:</span>
            <span>{formatCurrency(getValues('taxAmount'))}</span>
          </div> */}
          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-lg">Total Amount:</span>
            <span className="font-semibold text-lg">{formatCurrency(getValues('totalAmount'))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
