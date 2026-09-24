import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { useProgramsList } from "../programs/hooks";
import { useAddMembership, useCreateUser, useMemberships, useRemoveMembership, useUsersList } from "./hooks";
import type { UserRole } from "@/types/api";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["program_admin", "viewer"]),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

function CreateUserDialog() {
  const [open, setOpen] = React.useState(false);
  const createUser = useCreateUser();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "viewer" },
  });

  const onSubmit = async (values: CreateUserForm) => {
    try {
      await createUser.mutateAsync(values);
      toast.success(`Invitation emailed to ${values.email}`);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Invite teammate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite teammate</DialogTitle>
          <p className="text-sm text-muted-foreground">
            They&apos;ll receive an email with their role, this temporary password, and a link to sign in.
          </p>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Temporary password</Label>
            <Input type="password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              {...register("role")}
            >
              <option value="viewer">Viewer</option>
              <option value="program_admin">Program Admin</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageAccessDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = React.useState(false);
  const [programId, setProgramId] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "viewer">("viewer");
  const { data: memberships } = useMemberships(open ? userId : null);
  const { data: programsPage } = useProgramsList({ page: 1, pageSize: 100 });
  const addMembership = useAddMembership(userId);
  const removeMembership = useRemoveMembership(userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Program access &middot; {userName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {memberships?.map((m) => (
            <div key={m.programId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{m.programName}</p>
                <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                  {m.roleOnProgram}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeMembership.mutate(m.programId)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {memberships?.length === 0 && <p className="text-sm text-muted-foreground">No program access yet.</p>}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose program" />
              </SelectTrigger>
              <SelectContent>
                {programsPage?.items.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "viewer")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={!programId}
              onClick={() => {
                addMembership.mutate({ programId, roleOnProgram: role });
                setProgramId("");
              }}
            >
              Grant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useUsersList({ page: 1, pageSize: 50, search: search || undefined });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team</h1>
          <p className="text-sm text-muted-foreground">Invite teammates and manage their program access.</p>
        </div>
        <CreateUserDialog />
      </div>

      <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-gradient-brand-soft">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {data?.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role.replace("_", " ")}</TableCell>
                <TableCell>
                  <Badge variant={user.status === "active" ? "success" : "secondary"}>{user.status}</Badge>
                </TableCell>
                <TableCell>
                  {user.role !== "admin" && <ManageAccessDialog userId={user.id} userName={user.name} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export type { UserRole };
