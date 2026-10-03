import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import type { Registration } from "@/types/api";
import type { RegistrationDetail } from "../registrations/api";
import { waivePayment } from "./api";
import { PaymentBadge } from "./PaymentBadge";

interface OrderSnapshot {
  lines?: { id: string; name: string; unitMinor: number; quantity: number; totalMinor: number }[];
  totalMinor?: number;
}

/** What an order contains, as it was when placed. Shown for orders from a form that sells items. */
export function OrderItemsCard({ registration }: { registration: Registration }) {
  const order = registration.responses?.__order as OrderSnapshot | undefined;
  if (!order?.lines?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Order items</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <ul className="flex flex-col gap-1">
          {order.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {line.quantity} x {line.name}
              </span>
              <span className="shrink-0 font-medium">{formatMinor(line.totalMinor)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-border/60 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatMinor(order.totalMinor ?? order.lines.reduce((sum, l) => sum + l.totalMinor, 0))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Where a registration's payment stands, every attempt made, and (for admins) letting it through without payment. */
export function RegistrationPaymentCard({ programId, detail, canEdit }: { programId: string; detail: RegistrationDetail; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { registration, payments = [] } = detail;
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!registration.paymentStatus || registration.paymentStatus === "none") return null;
  const unpaid = registration.paymentStatus === "pending" || registration.paymentStatus === "review";

  const waive = async () => {
    setBusy(true);
    try {
      await waivePayment(programId, registration.id);
      await queryClient.invalidateQueries({ queryKey: ["registrations", programId] });
      toast.success("Payment waived. Their ID card and ticket are now available.");
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not waive the payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Payment
          </span>
          <PaymentBadge status={registration.paymentStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">{formatMinor(registration.amountDueMinor ?? 0)}</span>
        </div>
        {registration.paidAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>{new Date(registration.paidAt).toLocaleString()}</span>
          </div>
        )}
        {payments.length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.channel?.provider ? ` · ${p.channel.provider}` : ""}
                  {p.failureReason ? ` · ${p.failureReason}` : ""}
                </span>
                <PaymentBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
        {unpaid && canEdit && (
          <>
            <p className="text-xs text-muted-foreground">
              Their ID card and ticket stay locked until this is paid. If they paid you another way, or you want to let them through, you can waive the payment.
            </p>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setConfirming(true)}>
              Waive payment
            </Button>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Waive this payment?"
        description="They will no longer be asked to pay, and their ID card and ticket become available. This is recorded in the audit log and can't be undone."
        confirmLabel="Waive payment"
        busy={busy}
        onConfirm={waive}
      />
    </Card>
  );
}
