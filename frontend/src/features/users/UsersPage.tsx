import * as React from "react";
import { ExportButtons } from "@/components/ExportButtons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { useCreateUser, useUsersList } from "./hooks";
import { ManageAccessDialog } from "./AccessDialog";
import type { UserRole } from "@/types/api";
import { usePageMeta } from "@/lib/seo";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["program_admin", "viewer"]),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

function CreateUserDialog() {
  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
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
            <Label htmlFor="invitePassword">Temporary password</Label>
            <div className="relative">
              <Input
                id="invitePassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            <Button type="submit" loading={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  usePageMeta({ title: "Users" });
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input placeholder="Search users..." aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <ExportButtons path="/users/export" params={{ search }} fileLabel="Users" />
      </div>

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
