import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant, useTenantPrograms, useTenantUsers } from "./hooks";

export function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { data: tenant, isLoading: tenantLoading } = useTenant(tenantId);
  const { data: users, isLoading: usersLoading } = useTenantUsers(tenantId);
  const { data: programs, isLoading: programsLoading } = useTenantPrograms(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <LinkButton to="/admin/tenants" variant="outline" size="sm" className="mb-3">
            &larr; Back to accounts
          </LinkButton>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {tenantLoading ? "Loading..." : (tenant?.name ?? "Account")}
          </h1>
          <p className="text-sm text-muted-foreground">
            Read-only view for platform oversight &mdash; {tenant?.slug}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gradient-brand-soft">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "success" : "secondary"}>{user.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gradient-brand-soft">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Registration</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {programs?.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>{program.name}</TableCell>
                  <TableCell className="capitalize">{program.status}</TableCell>
                  <TableCell>{program.registrationEnabled ? "Open" : "Closed"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(program.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
