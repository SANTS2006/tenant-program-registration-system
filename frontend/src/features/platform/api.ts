import { apiFetch } from "@/lib/api";
import type { PaginatedResult } from "@/types/api";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  userCount: number;
  programCount: number;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string | null;
  createdAt: string;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TenantProgram {
  id: string;
  name: string;
  slug: string;
  status: string;
  registrationEnabled: boolean;
  createdAt: string;
}

export interface ListTenantsParams {
  page?: number;
  pageSize?: number;
}

export function listTenants(params: ListTenantsParams) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const str = query.toString();
  return apiFetch<PaginatedResult<TenantSummary>>(`/platform/tenants${str ? `?${str}` : ""}`);
}

export function getTenant(tenantId: string) {
  return apiFetch<TenantDetail>(`/platform/tenants/${tenantId}`);
}

export function listTenantUsers(tenantId: string) {
  return apiFetch<TenantUser[]>(`/platform/tenants/${tenantId}/users`);
}

export function updateUserStatus(userId: string, status: "active" | "suspended") {
  return apiFetch<TenantUser>(`/platform/users/${userId}/status`, { method: "PATCH", body: { status } });
}

export function listTenantPrograms(tenantId: string) {
  return apiFetch<TenantProgram[]>(`/platform/tenants/${tenantId}/programs`);
}
