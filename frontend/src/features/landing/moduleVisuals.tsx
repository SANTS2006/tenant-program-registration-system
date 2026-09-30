import { FileText, Receipt, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserFrame } from "./visuals";

/** A stylised poll: live results for one position. */
export function PollsMock() {
  const candidates = [
    { name: "Mariama Sesay", percent: 54, place: "1st", color: "bg-blue-600" },
    { name: "Ibrahim Kamara", percent: 31, place: "2nd", color: "bg-sky-500" },
    { name: "Fatmata Bangura", percent: 15, place: "3rd", color: "bg-slate-400" },
  ];
  return (
    <BrowserFrame>
      <div className="flex flex-col gap-4 p-4 sm:p-5" aria-hidden="true">
        <div className="relative h-24 overflow-hidden rounded-xl bg-gradient-brand">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-3 bottom-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white">
            <span className="rounded-full bg-black/60 px-2.5 py-1">Student Union Elections</span>
            <span className="rounded-full bg-black/60 px-2.5 py-1">2 positions</span>
            <span className="rounded-full bg-emerald-500 px-2.5 py-1">Open</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">President &middot; live results</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            1,204 votes
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {candidates.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.place} &middot; {c.percent}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", c.color)} style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="rounded-lg bg-gradient-brand-soft px-3 py-2 text-[11px] text-primary">One vote per email &middot; secret ballot &middot; only @school.edu addresses</p>
      </div>
    </BrowserFrame>
  );
}

/** A stylised business: its orders, an invoice, and a receipt. */
export function BusinessMock() {
  const orders = [
    { name: "Aminata K.", number: "ORD-2026-00018", status: "Processing", tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    { name: "Daniel O.", number: "ORD-2026-00017", status: "Ready", tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { name: "Grace M.", number: "ORD-2026-00016", status: "New", tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  ];
  return (
    <BrowserFrame>
      <div className="flex flex-col gap-4 p-4 sm:p-5" aria-hidden="true">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShoppingBag, label: "Orders", value: "128" },
            { icon: FileText, label: "Invoices", value: "64" },
            { icon: Receipt, label: "Receipts", value: "59" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl border border-border/70 bg-background/60 py-3">
              <stat.icon className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold tabular-nums">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/70">
          {orders.map((order) => (
            <div key={order.number} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{order.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{order.number}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", order.tone)}>{order.status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-gradient-brand-soft px-3 py-2.5 text-xs">
          <span className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-primary" />
            INV-0064 &middot; Le 2,450
          </span>
          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">Paid</span>
        </div>
      </div>
    </BrowserFrame>
  );
}
