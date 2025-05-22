
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { deleteInvoiceAction } from '@/app/(app)/invoices/actions';
import { useToast } from '@/hooks/use-toast';

interface DeleteInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  onDeleted?: () => void; // Optional: callback after successful deletion
}

export function DeleteInvoiceDialog({ invoiceId, invoiceNumber, onDeleted }: DeleteInvoiceDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteInvoiceAction(invoiceId);
      if (result.success) {
        toast({
          title: 'Invoice Deleted',
          description: `Invoice #${invoiceNumber} has been successfully deleted.`,
        });
        setIsOpen(false); // Close dialog
        if (onDeleted) {
          onDeleted();
        } else {
          // Default behavior if no onDeleted callback is provided
          router.refresh(); // Refresh current page (e.g. dashboard)
        }
      } else {
        toast({
          title: 'Error Deleting Invoice',
          description: result.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast({
        title: 'Deletion Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete invoice <strong>#{invoiceNumber}</strong> and all its associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete invoice'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
