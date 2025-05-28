"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  InvoiceForm,
  type InvoiceFormValues,
} from "@/components/invoice/InvoiceForm";
import { createInvoiceAction } from "@/app/(app)/invoices/actions";
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatus } from "@/types/invoice";
import { IconFileInvoice } from "@tabler/icons-react";

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmittingPage, setIsSubmittingPage] = useState(false);

  const handleCreateAndSend = async (data: InvoiceFormValues) => {
    setIsSubmittingPage(true);
    try {
      const result = await createInvoiceAction(data, InvoiceStatus.SENT);
      if (result.success && result.invoiceId) {
        toast({
          title: "Invoice Created & Sent!",
          description: `Invoice #${result.invoiceId.substring(
            0,
            8
          )} has been successfully created and sent.`,
          variant: "default",
        });
        router.push(`/invoices/${result.invoiceId}/view`);
      } else {
        toast({
          title: "Error Sending Invoice",
          description:
            result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to send invoice:", error);
      toast({
        title: "Submission Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  const handleSaveAsDraft = async (data: InvoiceFormValues) => {
    setIsSubmittingPage(true);
    try {
      const result = await createInvoiceAction(data, InvoiceStatus.DRAFT);
      if (result.success && result.invoiceId) {
        toast({
          title: "Draft Saved!",
          description: `Invoice #${result.invoiceId.substring(
            0,
            8
          )} has been saved as a draft.`,
          variant: "default",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "Error Saving Draft",
          description:
            result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast({
        title: "Submission Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPage(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <IconFileInvoice className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Create New Invoice</h1>
          <p className="text-muted-foreground">
            Fill out the form below to create a new invoice.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <InvoiceForm
          onSubmitSend={handleCreateAndSend}
          onSubmitDraft={handleSaveAsDraft}
          isSubmitting={isSubmittingPage}
          formMode="create"
        />
      </motion.div>
    </div>
  );
}
