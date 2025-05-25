
'use client';

import type { FactoringBid } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CircleSlash, Hourglass, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BidListProps {
  bids: FactoringBid[];
  onAcceptBid: (bidId: string) => Promise<void>;
  canAccept: boolean;
  isAcceptingBidId: string | null; // ID of bid currently being processed for acceptance
  acceptedBidId?: string | null; // ID of the bid that has been accepted for this invoice
}

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getBidStatusBadge(status: FactoringBid['status'], isAccepted: boolean) {
    if (isAccepted) {
        return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3.5 w-3.5" />Accepted</Badge>;
    }
    switch (status) {
        case 'PENDING':
            return <Badge variant="secondary"><Hourglass className="mr-1 h-3.5 w-3.5" />Pending</Badge>;
        case 'ACCEPTED_BY_MSME': // Should be covered by isAccepted
            return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3.5 w-3.5" />Accepted</Badge>;
        case 'REJECTED_BY_MSME':
            return <Badge variant="destructive"><CircleSlash className="mr-1 h-3.5 w-3.5" />Rejected</Badge>;
        case 'WITHDRAWN_BY_FINANCIER':
            return <Badge variant="outline">Withdrawn</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}


export function BidList({ bids, onAcceptBid, canAccept, isAcceptingBidId, acceptedBidId }: BidListProps) {
  if (!bids || bids.length === 0) {
    return <p className="text-muted-foreground">No bids have been placed on this invoice yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Financier</TableHead>
            <TableHead>Bid Amount</TableHead>
            <TableHead>Discount Fee (%)</TableHead>
            <TableHead>Net to MSME</TableHead>
            <TableHead>Date Placed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids.map((bid) => {
            const netToMSME = bid.bid_amount - (bid.bid_amount * bid.discount_fee_percentage / 100);
            const isThisBidAccepted = bid.id === acceptedBidId;
            const isProcessingThisBid = isAcceptingBidId === bid.id;
            const disableAcceptButton = !canAccept || !!acceptedBidId || bid.status !== 'PENDING' || isProcessingThisBid;
            const financierDisplayName = bid.financier_profile?.full_name || `Financier (${bid.financier_id?.substring(0, 8) || 'N/A'}...)`;

            return (
              <TableRow key={bid.id} className={cn({"bg-green-50 hover:bg-green-100": isThisBidAccepted})}>
                <TableCell className="font-medium">{financierDisplayName}</TableCell>
                <TableCell>{formatCurrency(bid.bid_amount)}</TableCell>
                <TableCell>{bid.discount_fee_percentage.toFixed(2)}%</TableCell>
                <TableCell>{formatCurrency(netToMSME)}</TableCell>
                <TableCell>{format(new Date(bid.created_at), 'PPp')}</TableCell>
                <TableCell>{getBidStatusBadge(bid.status, isThisBidAccepted)}</TableCell>
                <TableCell className="text-right">
                  {canAccept && bid.status === 'PENDING' && !acceptedBidId && (
                    <Button
                      size="sm"
                      onClick={() => onAcceptBid(bid.id)}
                      disabled={disableAcceptButton}
                      variant={isProcessingThisBid ? "secondary" : "default"}
                      className={cn("bg-green-600 hover:bg-green-700", {"opacity-50 cursor-not-allowed": disableAcceptButton && !isProcessingThisBid})}
                    >
                      <Landmark className="mr-2 h-4 w-4" />
                      {isProcessingThisBid ? 'Accepting...' : 'Accept Bid'}
                    </Button>
                  )}
                  {isThisBidAccepted && (
                     <span className="text-sm font-semibold text-green-700">Financed</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
