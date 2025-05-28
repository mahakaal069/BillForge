import { InvoiceStatus } from "@/types/invoice";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  FileEdit,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  variant: BadgeVariant;
  className?: string;
}

const statusConfig: Record<InvoiceStatus, StatusConfig> = {
  [InvoiceStatus.PAID]: {
    label: "Paid",
    icon: CheckCircle2,
    variant: "default",
    className: "bg-green-500 text-white hover:bg-green-600",
  },
  [InvoiceStatus.SENT]: {
    label: "Sent",
    icon: Send,
    variant: "default",
    className: "bg-blue-500 text-white hover:bg-blue-600",
  },
  [InvoiceStatus.PENDING]: {
    label: "Pending",
    icon: Clock,
    variant: "secondary",
    className: "bg-yellow-500 text-white hover:bg-yellow-600",
  },
  [InvoiceStatus.OVERDUE]: {
    label: "Overdue",
    icon: AlertTriangle,
    variant: "destructive",
  },
  [InvoiceStatus.DRAFT]: {
    label: "Draft",
    icon: FileEdit,
    variant: "secondary",
  },
  [InvoiceStatus.VOID]: {
    label: "Void",
    icon: XCircle,
    variant: "outline",
    className: "text-muted-foreground border-muted-foreground",
  },
};

export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status.toString(),
    icon: Clock,
    variant: "outline" as BadgeVariant,
    className: "text-muted-foreground",
  };

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1.5", config.className, className)}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Badge>
  );
}
