
import type { Invoice } from '@/types/invoice';
import { InvoiceStatus } from '@/types/invoice';

// Using fixed static dates to avoid hydration issues with new Date() at module level.
// Format: YYYY-MM-DD
const STATIC_DATES = {
  inv1_invoice: '2023-10-01',
  inv1_due: '2023-10-31',
  inv2_invoice: '2023-11-05',
  inv2_due: '2023-12-05',
  inv3_invoice: '2023-09-15',
  inv3_due: '2023-10-15', // Overdue
  inv4_invoice: '2023-11-25',
  inv4_due: '2023-12-25',
};


const createMockItem = (id: number, quantity: number, unitPrice: number) => ({
  id: `item-${id}-${Math.random().toString(36).substring(7)}`,
  description: `Service or Product ${id}`,
  quantity,
  unitPrice,
  total: quantity * unitPrice,
});

const calculateTotals = (items: Invoice['items']) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.07; // 7% tax, example
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
};

const items1 = [createMockItem(1, 2, 150), createMockItem(2, 1, 300)];
const totals1 = calculateTotals(items1);

const items2 = [createMockItem(3, 5, 50), createMockItem(4, 10, 25)];
const totals2 = calculateTotals(items2);

const items3 = [createMockItem(5, 1, 1200)];
const totals3 = calculateTotals(items3);

const items4 = [createMockItem(6, 3, 80), createMockItem(7, 1, 200)];
const totals4 = calculateTotals(items4);


export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'INV-001',
    clientName: 'Alpha Corp',
    clientEmail: 'alpha@example.com',
    clientAddress: '123 Alpha St, Alphacity, AL 12345',
    invoiceDate: STATIC_DATES.inv1_invoice,
    dueDate: STATIC_DATES.inv1_due,
    items: items1,
    ...totals1,
    status: InvoiceStatus.PAID,
    paymentTerms: 'Net 30 Days',
  },
  {
    id: 'INV-002',
    invoiceNumber: 'INV-002',
    clientName: 'Beta Solutions',
    clientEmail: 'beta@example.com',
    clientAddress: '456 Beta Ave, Betatown, BT 67890',
    invoiceDate: STATIC_DATES.inv2_invoice,
    dueDate: STATIC_DATES.inv2_due,
    items: items2,
    ...totals2,
    status: InvoiceStatus.SENT,
    paymentTerms: 'Net 30 Days',
  },
  {
    id: 'INV-003',
    invoiceNumber: 'INV-003',
    clientName: 'Gamma Inc',
    clientEmail: 'gamma@example.com',
    clientAddress: '789 Gamma Rd, Gammaville, GA 54321',
    invoiceDate: STATIC_DATES.inv3_invoice,
    dueDate: STATIC_DATES.inv3_due,
    items: items3,
    ...totals3,
    status: InvoiceStatus.OVERDUE,
    paymentTerms: 'Net 30 Days',
    notes: 'Followed up on payment.',
  },
  {
    id: 'INV-004',
    invoiceNumber: 'INV-004',
    clientName: 'Delta Services',
    clientEmail: 'delta@example.com',
    clientAddress: '101 Delta Blvd, Deltaport, DL 09876',
    invoiceDate: STATIC_DATES.inv4_invoice,
    dueDate: STATIC_DATES.inv4_due,
    items: items4,
    ...totals4,
    status: InvoiceStatus.DRAFT,
  },
];

export const getMockAnalyticsData = () => {
  const revenueOverTime = [
    { month: 'Jan', total: 2500, paid: 2000 },
    { month: 'Feb', total: 3000, paid: 2800 },
    { month: 'Mar', total: 2200, paid: 1800 },
    { month: 'Apr', total: 3500, paid: 3200 },
    { month: 'May', total: 4000, paid: 3800 },
    { month: 'Jun', total: MOCK_INVOICES.reduce((sum, inv) => sum + (inv.status === InvoiceStatus.PAID ? inv.totalAmount : 0) ,0) , paid: MOCK_INVOICES.reduce((sum, inv) => sum + (inv.status === InvoiceStatus.PAID ? inv.totalAmount : 0) ,0) },
  ];

  const statusDistribution = MOCK_INVOICES.reduce((acc, inv) => {
    const existing = acc.find(s => s.name === inv.status);
    if (existing) {
      existing.value += 1;
      existing.amount += inv.totalAmount;
    } else {
      acc.push({ name: inv.status, value: 1, amount: inv.totalAmount, fill: `var(--chart-${acc.length + 1})` });
    }
    return acc;
  }, [] as { name: string; value: number; amount: number; fill: string }[]);


  const topClients = MOCK_INVOICES.reduce((acc, inv) => {
    if (inv.status === InvoiceStatus.PAID) {
      const existing = acc.find(c => c.name === inv.clientName);
      if (existing) {
        existing.revenue += inv.totalAmount;
      } else {
        acc.push({ name: inv.clientName, revenue: inv.totalAmount });
      }
    }
    return acc;
  }, [] as { name: string; revenue: number }[])
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5);

  return { revenueOverTime, statusDistribution, topClients };
};
