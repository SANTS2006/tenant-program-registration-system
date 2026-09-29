import { NavLink, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { LazyOutlet } from "@/components/PageLoading";
import { LinkButton } from "@/components/ui/link-button";
import { ApiError } from "@/lib/api";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Program } from "@/types/api";
import { useProgram } from "../programs/hooks";
import { ORDER_TERMS } from "../programs/ProgramDetailLayout";
import { getBusiness, type Business } from "./api";
import { businessKeys } from "./BusinessesListPage";

export function useBusinessOutletContext() {
  return useOutletContext<{ business: Business; program: Program | undefined }>();
}

export function useBusiness(businessId: string | undefined) {
  return useQuery({ queryKey: businessKeys.detail(businessId ?? ""), queryFn: () => getBusiness(businessId!), enabled: !!businessId });
}

const tabs = [
  { to: "", label: "Overview", end: true },
  { to: "order-form", label: "Order Form", end: false },
  { to: "orders", label: "Orders", end: false },
  { to: "invoices", label: "Invoices", end: false },
  { to: "receipts", label: "Receipts", end: false },
  { to: "analytics", label: "Analytics", end: false },
];

/**
 * A business and its tabs. The order form is a program underneath, so the program pages (form
 * builder, orders list and detail, analytics) are reused here with order wording.
 */
export function BusinessLayout() {
  const { businessId } = useParams<{ businessId: string }>();
  const { data: business, isLoading, error } = useBusiness(businessId);
  const { data: program } = useProgram(business?.orderForm?.id);
  usePageMeta({ title: business?.name ?? "Business" });

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          {error instanceof ApiError && error.statusCode === 403 ? "You do not have access to this business." : "This business could not be found."}
        </p>
        <LinkButton to="/admin/businesses" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to businesses
        </LinkButton>
      </div>
    );
  }
  if (isLoading || !business) return <p className="text-sm text-muted-foreground">Loading business...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-border/70 p-5 text-white shadow-glow sm:p-6"
        style={{ background: `linear-gradient(135deg, ${business.brandColor}, #0f172a)` }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <Store className="h-8 w-8" style={{ color: business.brandColor }} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{business.name}</h1>
            <p className="truncate text-sm text-white/80">{[business.phone, business.email].filter(Boolean).join(" · ") || "Add contact details on the Overview tab"}</p>
          </div>
        </div>
      </div>

      <nav aria-label="Business sections" className="-mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-border/70 bg-card/60 p-1.5 backdrop-blur-sm sm:mx-0">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/admin/businesses/${business.id}${tab.to ? `/${tab.to}` : ""}`}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive ? "bg-gradient-brand text-white shadow-glow" : "text-muted-foreground hover:bg-gradient-brand-soft hover:text-primary",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <LazyOutlet
        context={{
          business,
          program,
          submissionPath: (id: string) => `/admin/businesses/${business.id}/orders/${id}`,
          terms: ORDER_TERMS,
        }}
      />
    </div>
  );
}

/** Pages built for programs only render once the business's order form has loaded. */
export function OrderFormGate({ children }: { children: React.ReactNode }) {
  const { program } = useBusinessOutletContext();
  if (!program) return <p className="text-sm text-muted-foreground">Loading order form...</p>;
  return <>{children}</>;
}
