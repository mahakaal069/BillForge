"use client";

import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, PlusCircle } from "lucide-react";
import type { InvoiceFormValues } from "./InvoiceForm";
import { cn } from "@/lib/utils";

interface InvoiceItemsTableProps {
  form: UseFormReturn<InvoiceFormValues>;
}

function formatCurrency(amount: number | undefined | null) {
  if (typeof amount !== "number" || isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function InvoiceItemsTable({ form }: InvoiceItemsTableProps) {
  const {
    formState: { errors },
    control,
    register,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleItemChange = (
    index: number,
    field: "quantity" | "unitPrice",
    value: string
  ) => {
    const items = [...fields];
    const currentItem = items[index];

    if (field === "quantity") {
      currentItem.quantity = parseFloat(value) || 0;
    } else {
      currentItem.unitPrice = parseFloat(value) || 0;
    }

    currentItem.total =
      (currentItem.quantity || 0) * (currentItem.unitPrice || 0);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    form.setValue(`items.${index}.total`, currentItem.total);
    form.setValue("subtotal", subtotal);
    form.setValue("taxAmount", taxAmount);
    form.setValue("totalAmount", totalAmount);
  };

  return (
    <div className="space-y-4">
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
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell>
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Item description"
                  className={cn(
                    errors.items?.[index]?.description && "border-destructive"
                  )}
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.items[index]?.description?.message}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                    onChange: (e) =>
                      handleItemChange(index, "quantity", e.target.value),
                  })}
                  placeholder="1"
                  className={cn(
                    "w-20",
                    errors.items?.[index]?.quantity && "border-destructive"
                  )}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.unitPrice`, {
                    valueAsNumber: true,
                    onChange: (e) =>
                      handleItemChange(index, "unitPrice", e.target.value),
                  })}
                  placeholder="0.00"
                  className={cn(
                    "w-28",
                    errors.items?.[index]?.unitPrice && "border-destructive"
                  )}
                />
              </TableCell>
              <TableCell>{formatCurrency(field.total)}</TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    remove(index);
                    // Recalculate totals after removing an item
                    const remainingItems = fields.filter((_, i) => i !== index);
                    const subtotal = remainingItems.reduce(
                      (sum, item) => sum + (item.total || 0),
                      0
                    );
                    const taxAmount = 0;
                    const totalAmount = subtotal + taxAmount;
                    form.setValue("subtotal", subtotal);
                    form.setValue("taxAmount", taxAmount);
                    form.setValue("totalAmount", totalAmount);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove item</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => {
          append({
            description: "",
            quantity: 1,
            unitPrice: 0,
            total: 0,
            id: `temp-${Math.random().toString(36).substring(7)}`,
          });
        }}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Item
      </Button>
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Total Items: {fields.length}</p>
        <p>Subtotal: {formatCurrency(form.getValues("subtotal"))}</p>
        <p>Tax: {formatCurrency(form.getValues("taxAmount"))}</p>
        <p className="font-semibold text-foreground">
          Total Amount: {formatCurrency(form.getValues("totalAmount"))}
        </p>
      </div>
    </div>
  );
}
