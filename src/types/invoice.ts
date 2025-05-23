
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
  PENDING_FINANCING = 'PENDING_FINANCING', // Open for financier bids
  FINANCED = 'FINANCED', // A bid was accepted, funds disbursed
  REPAID = 'REPAID', // Buyer repaid financier
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
  msme?: { full_name: string | null }; // For joining MSME name on dashboard
  assigned_financier_id?: string | null;
  accepted_bid_id?: string | null;
}

export interface ClientHistoryOption {
  value: string;
  label: string;
}

export interface FactoringBid {
  id: string;
  invoice_id: string;
  financier_id: string;
  financier_name?: string; // For display
  bid_amount: number;
  discount_fee_percentage: number;
  status: 'PENDING' | 'ACCEPTED_BY_MSME' | 'REJECTED_BY_MSME' | 'WITHDRAWN_BY_FINANCIER';
  created_at: string;
}
