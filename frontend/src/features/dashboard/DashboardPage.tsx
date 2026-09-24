import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ClipboardList, FolderKanban, ListChecks, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationTrendChart, StatusPieChart } from "../analytics/charts";
import { getDashboardTrend } from "../analytics/api";
import type { DashboardOverview } from "@/types/api";
import { useAuth } from "@/app/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiFetch<DashboardOverview>("/dashboard/overview"),
  });
  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ["dashboard-analytics-trend"],
    queryFn: () => getDashboardTrend(30),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, <span className="gradient-text">{user?.name.split(" ")[0]}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Here's what's happening across your programs.</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading dashboard...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Total programs" value={data.totalPrograms} icon={FolderKanban} />
            <StatCard label="Active programs" value={data.activePrograms} icon={ListChecks} />
            <StatCard label="Total registrations" value={data.totalRegistrations} icon={ClipboardList} />
            <StatCard label="Registrations today" value={data.registrationsToday} icon={CalendarDays} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="This week" value={data.registrationsThisWeek} />
            <StatCard label="This month" value={data.registrationsThisMonth} />
            <StatCard label="Approved" value={data.byStatus.approved ?? 0} icon={CheckCircle2} />
            <StatCard label="Rejected" value={data.byStatus.rejected ?? 0} icon={XCircle} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Registrations in the last 30 days</CardTitle>
              </CardHeader>
              <CardContent>
                {trendLoading || !trend ? (
                  <p className="text-sm text-muted-foreground">Loading trend...</p>
                ) : (
                  <RegistrationTrendChart data={trend} />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPieChart byStatus={data.byStatus} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
