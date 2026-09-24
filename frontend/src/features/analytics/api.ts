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

export function getDashboardTrend(days = 30) {
  return apiFetch<TrendPoint[]>(`/dashboard/analytics/trend?days=${days}`);
}
