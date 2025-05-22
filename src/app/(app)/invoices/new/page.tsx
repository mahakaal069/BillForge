import { InvoiceForm, type InvoiceFormValues } from '@/components/invoice/InvoiceForm';
import { MOCK_INVOICES } from '@/lib/mock-data'; // For demo save
import type { Invoice } from '@/types/invoice';
import { InvoiceStatus } from '@/types/invoice';

export default function NewInvoicePage() {
  const handleCreateInvoice = async (data: InvoiceFormValues) => {
    "use server"; // This function will be a server action if called directly from client, or just a server-side func
    console.log('Creating new invoice with data:', data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // This is where you'd typically save to a database
    // For demo, we can "add" to a mock list (won't persist across requests)
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: `INV-${String(MOCK_INVOICES.length + 1).padStart(3, '0')}`,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      invoiceDate: data.invoiceDate.toISOString(),
      dueDate: data.dueDate.toISOString(),
      items: data.items.map((item, index) => ({
        ...item,
        id: `item-${index}-${Date.now()}`,
      })),
      subtotal: data.items.reduce((sum, item) => sum + item.total, 0),
      taxAmount: 0, // Assuming no tax for now, or calculate based on a taxRate field
      totalAmount: data.items.reduce((sum, item) => sum + item.total, 0), // Add taxAmount if applicable
      status: InvoiceStatus.SENT, // Or DRAFT based on button clicked
      paymentTerms: data.paymentTerms,
      notes: data.notes,
    };
    console.log("New Invoice to be 'saved':", newInvoice);
    // MOCK_INVOICES.push(newInvoice); // This won't work as expected on server due to statelessness

    // In a real app, handle success/error from API
  };

  return (
    <div className="max-w-4xl mx-auto">
      <InvoiceForm onSubmit={handleCreateInvoice} />
    </div>
  );
}
