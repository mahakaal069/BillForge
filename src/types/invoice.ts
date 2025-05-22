export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  invoiceDate: string; // ISO string date
  dueDate: string; // ISO string date
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number; // Added for completeness, can be 0
  totalAmount: number;
  status: InvoiceStatus;
  paymentTerms?: string;
  notes?: string;
}

export interface ClientHistoryOption {
  value: string;
  label: string;
}
