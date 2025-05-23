
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
  BUYER_ACCEPTED = 'BUYER_ACCEPTED', // Buyer accepted, ready for financier bids or first bid
  BUYER_REJECTED = 'BUYER_REJECTED', // Buyer rejected
  PENDING_FINANCING = 'PENDING_FINANCING', // Open for financier bids (at least one bid placed)
  FINANCED = 'FINANCED', // A bid was accepted, funds disbursed (conceptually)
  REPAID = 'REPAID', // Buyer repaid financier (conceptually)
}

export interface InvoiceItem {
  id: string; // This will be the DB generated UUID when fetched, or a temp ID in forms
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface FactoringBid {
  id: string;
  invoice_id: string;
  financier_id: string;
  financier_name?: string; // For display, joined from profiles
  bid_amount: number;
  discount_fee_percentage: number;
  status: 'PENDING' | 'ACCEPTED_BY_MSME' | 'REJECTED_BY_MSME' | 'WITHDRAWN_BY_FINANCIER';
  created_at: string;
  // Optional: for joining profile data
  financier?: {
    full_name: string | null;
  } | null;
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
  bids?: FactoringBid[]; // For displaying bids on the invoice view page
}

export interface ClientHistoryOption {
  value: string;
  label: string;
}

// Note: InvoiceWithItems from actions.ts essentially becomes the main Invoice type now
// as we are adding bids directly to it.
