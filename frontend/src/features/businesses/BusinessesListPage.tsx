import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, Search, ShoppingBag, Store, FileText } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardInteractive } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { usePageMeta } from "@/lib/seo";
import { listTenants } from "../platform/api";
import { createBusiness, listBusinesses } from "./api";

export const businessKeys = {
  all: ["businesses"] as const,
  list: (params: object) => ["businesses", "list", params] as const,
  detail: (id: string) => ["businesses", "detail", id] as const,
};

function CreateBusinessDialog() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", email: "", phone: "", address: "" });
  const [tenantId, setTenantId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const choosesAccount = user?.role === "super_admin";
  const { data: accounts } = useQuery({
    queryKey: ["platform-tenants", "all-for-select"],
    queryFn: () => listTenants({ page: 1, pageSize: 100 }),
    enabled: choosesAccount && open,
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Give the business a name");
    if (choosesAccount && !tenantId) return toast.error("Choose the account this business belongs to");
    setSaving(true);
    try {
      const business = await createBusiness({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        ...(choosesAccount ? { tenantId } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: businessKeys.all });
      toast.success("Business created");
      setOpen(false);
      navigate(`/admin/businesses/${business.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create the business");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Business
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a business</DialogTitle>
          <DialogDescription>These details appear on its order page, invoices, receipts, and emails. You can change them later.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          {choosesAccount && (
            <div className="flex flex-col gap-1.5">
              <Label>Account</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the account this business belongs to" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.items.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business-name">Business name</Label>
            <Input id="business-name" value={form.name} onChange={set("name")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="business-email">Email</Label>
              <Input id="business-email" type="email" value={form.email} onChange={set("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="business-phone">Phone</Label>
              <Input id="business-phone" value={form.phone} onChange={set("phone")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business-address">Address</Label>
            <Input id="business-address" value={form.address} onChange={set("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business-description">Description (optional)</Label>
            <Textarea id="business-description" rows={2} value={form.description} onChange={set("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={saving}>
              Create business
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessesListPage() {
  usePageMeta({ title: "Businesses" });
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const params = { page, pageSize: 12, search: search || undefined };
  const { data, isLoading } = useQuery({ queryKey: businessKeys.list(params), queryFn: () => listBusinesses(params) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Businesses</h1>
          <p className="text-sm text-muted-foreground">Order forms, invoices, and receipts for each business.</p>
        </div>
        {user?.role !== "viewer" && <CreateBusinessDialog />}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search businesses..."
          aria-label="Search businesses"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading businesses...</p>}
      {!isLoading && data?.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Store className="h-8 w-8 text-primary/50" aria-hidden="true" />
            No businesses yet. Add one to take orders and send invoices and receipts.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((business) => (
          <Link key={business.id} to={`/admin/businesses/${business.id}`}>
            <CardInteractive className="flex h-full flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white">
                  {business.logoUrl ? (
                    <img src={business.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Store className="h-6 w-6 text-primary" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{business.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{business.email ?? business.phone ?? "No contact details yet"}</p>
                </div>
              </div>
              <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{business.description ?? "No description."}</p>
              <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-xs text-muted-foreground">
                <span className="flex flex-col items-center gap-0.5">
                  <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{business.orderCount ?? 0}</span> orders
                </span>
                <span className="flex flex-col items-center gap-0.5">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{business.invoiceCount ?? 0}</span> invoices
                </span>
                <span className="flex flex-col items-center gap-0.5">
                  <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{business.receiptCount ?? 0}</span> receipts
                </span>
              </div>
            </CardInteractive>
          </Link>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
