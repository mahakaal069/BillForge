
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export interface InvoiceItem {
  id: string; // This will be the DB generated UUID when fetched, or a temp ID in forms
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string; // DB generated UUID
  user_id?: string; // Foreign key to auth.users
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  invoiceDate: string; // ISO string date 'YYYY-MM-DD'
  dueDate: string; // ISO string date 'YYYY-MM-DD'
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paymentTerms?: string;
  notes?: string;
  created_at?: string; // ISO string timestamp
  updated_at?: string; // ISO string timestamp
}

export interface ClientHistoryOption {
  value: string;
  label: string;
}
