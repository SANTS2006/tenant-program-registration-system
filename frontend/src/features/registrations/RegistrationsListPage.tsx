import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegistrationStatusBadge } from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import { useProgramOutletContext } from "../programs/ProgramDetailLayout";
import { exportRegistrations } from "./api";
import { useRegistrationsList } from "./hooks";
import type { Registration, RegistrationStatus } from "@/types/api";

const STATUS_OPTIONS: RegistrationStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled",
];

export function RegistrationsListPage() {
  const { program } = useProgramOutletContext();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "submittedAt", desc: true }]);
  const [exporting, setExporting] = React.useState<"csv" | "xlsx" | null>(null);

  const sort = sorting[0];
  const { data, isLoading } = useRegistrationsList(program.id, {
    page,
    pageSize: 20,
    search: search || undefined,
    status: status === "all" ? undefined : (status as RegistrationStatus),
    sortBy: (sort?.id as "submittedAt" | "registrationNumber" | "status") ?? "submittedAt",
    sortDir: sort?.desc ? "desc" : "asc",
  });

  const columns = React.useMemo<ColumnDef<Registration>[]>(
    () => [
      { accessorKey: "registrationNumber", header: "Registration #" },
      { accessorKey: "applicantName", header: "Name", cell: (c) => c.getValue<string>() ?? "—" },
      { accessorKey: "applicantEmail", header: "Email", cell: (c) => c.getValue<string>() ?? "—" },
      {
        accessorKey: "status",
        header: "Status",
        cell: (c) => <RegistrationStatusBadge status={c.getValue<string>()} />,
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted",
        cell: (c) => new Date(c.getValue<string>()).toLocaleString(),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(format);
    try {
      await exportRegistrations(program.id, {
        format,
        search: search || undefined,
        status: status === "all" ? undefined : (status as RegistrationStatus),
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to export registrations");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, #..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{data?.total ?? 0} total</span>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("csv")}
          >
            <FileText className="h-4 w-4" />
            {exporting === "csv" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "xlsx" ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-gradient-brand-soft">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none font-semibold"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  No registrations found.
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => navigate(`/admin/programs/${program.id}/registrations/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
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
