import { apiFetch } from "@/lib/api";

export interface TrendPoint {
  date: string;
  count: number;
}

export interface DemographicBreakdown {
  fieldKey: string;
  label: string;
  data: { value: string; count: number }[];
}

export function getProgramTrend(programId: string, days = 30) {
  return apiFetch<TrendPoint[]>(`/programs/${programId}/analytics/trend?days=${days}`);
}

export function getProgramDemographics(programId: string) {
  return apiFetch<DemographicBreakdown[]>(`/programs/${programId}/analytics/demographics`);
}

export interface CountEntry {
  value: string;
  count: number;
}

interface FieldAnalyticsBase {
  fieldKey: string;
  label: string;
  type: string;
  section: string | null;
  answered: number;
  total: number;
}

export type FieldAnalytics =
  | (FieldAnalyticsBase & { kind: "choice"; multiple: boolean; options: CountEntry[]; otherAnswers: CountEntry[] })
  | (FieldAnalyticsBase & {
      kind: "number";
      stats: { min: number; max: number; average: number; median: number } | null;
      distribution: CountEntry[];
    })
  | (FieldAnalyticsBase & { kind: "date"; grouping: "age" | "month" | "hour"; distribution: CountEntry[] })
  | (FieldAnalyticsBase & { kind: "text"; unique: number; top: CountEntry[] })
  | (FieldAnalyticsBase & { kind: "file" })
  | (FieldAnalyticsBase & { kind: "consent" });

export function getFieldAnalytics(programId: string) {
  return apiFetch<FieldAnalytics[]>(`/programs/${programId}/analytics/fields`);
}

export function getDashboardTrend(days = 30) {
  return apiFetch<TrendPoint[]>(`/dashboard/analytics/trend?days=${days}`);
}
