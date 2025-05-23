
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export enum FactoringStatus {
  NONE = 'NONE', // Not involved in factoring
  REQUESTED = 'REQUESTED', // Seller requested, pending buyer acceptance
  BUYER_ACCEPTED = 'BUYER_ACCEPTED', // Buyer accepted, ready for financiers
  BUYER_REJECTED = 'BUYER_REJECTED', // Buyer rejected
  PENDING_FINANCING = 'PENDING_FINANCING', // Financiers are bidding (future)
  FINANCED = 'FINANCED', // A bid was accepted, funds disbursed (future)
  REPAID = 'REPAID', // Buyer repaid financier (future)
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
  user_id?: string; // Foreign key to auth.users (MSME who created it)
  invoiceNumber: string;
  clientName: string; // Buyer's name
  clientEmail: string; // Buyer's email
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
  is_factoring_requested?: boolean;
  factoring_status?: FactoringStatus;
  created_at?: string; // ISO string timestamp
  updated_at?: string; // ISO string timestamp
  sellerName?: string; // Added for buyer's dashboard view (MSME's name)
}

export interface ClientHistoryOption {
  value: string;
  label: string;
}
