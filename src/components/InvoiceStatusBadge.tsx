
import { InvoiceStatus } from '@/types/invoice';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Send, FileEdit, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

const statusConfig = {
  [InvoiceStatus.PAID]: {
    label: 'Paid',
    icon: CheckCircle2,
    variant: 'default', // Will use accent color if default is configured that way or green
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  [InvoiceStatus.SENT]: {
    label: 'Sent',
    icon: Send,
    variant: 'default', // Blue
    className: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  [InvoiceStatus.OVERDUE]: {
    label: 'Overdue',
    icon: AlertTriangle,
    variant: 'destructive', // Red
  },
  [InvoiceStatus.DRAFT]: {
    label: 'Draft',
    icon: FileEdit,
    variant: 'secondary', // Gray
  },
  [InvoiceStatus.VOID]: {
    label: 'Void',
    icon: XCircle,
    variant: 'outline', // Muted
    className: 'text-muted-foreground border-muted-foreground',
  },
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status.toString(),
    icon: Clock,
    variant: 'outline',
    className: 'text-muted-foreground',
  };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant as any} className={cn("flex items-center gap-1.5", config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
}
