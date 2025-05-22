import { LayoutDashboard, FilePlus2, BarChart3, type LucideIcon } from 'lucide-react';
import type { ClientHistoryOption } from '@/types/invoice';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  tooltip?: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tooltip: "Dashboard" },
  { href: '/invoices/new', label: 'New Invoice', icon: FilePlus2, tooltip: "Create New Invoice"},
  { href: '/analytics', label: 'Analytics', icon: BarChart3, tooltip: "Invoice Analytics"},
];

export const CLIENT_HISTORY_OPTIONS: ClientHistoryOption[] = [
  { value: 'new_client', label: 'New Client' },
  { value: 'good_payer', label: 'Good Payer (Consistently on time)' },
  { value: 'average_payer', label: 'Average Payer (Occasional minor delays)' },
  { value: 'late_payer', label: 'Late Payer (Frequently delayed)' },
  { value: 'unknown', label: 'Payment History Unknown' },
];

export const DEFAULT_INDUSTRY_STANDARDS = "Standard terms are Net 30. For new clients or large projects, consider 50% upfront. Small, quick projects might use Net 15.";
