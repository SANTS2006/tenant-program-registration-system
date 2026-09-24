import { useQuery } from "@tanstack/react-query";
import * as platformApi from "./api";

export const platformKeys = {
  all: ["platform-tenants"] as const,
  list: (params: platformApi.ListTenantsParams) => ["platform-tenants", "list", params] as const,
  detail: (tenantId: string) => ["platform-tenants", "detail", tenantId] as const,
  users: (tenantId: string) => ["platform-tenants", tenantId, "users"] as const,
  programs: (tenantId: string) => ["platform-tenants", tenantId, "programs"] as const,
};

export function useTenantsList(params: platformApi.ListTenantsParams) {
  return useQuery({
    queryKey: platformKeys.list(params),
    queryFn: () => platformApi.listTenants(params),
  });
}

export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: platformKeys.detail(tenantId ?? ""),
    queryFn: () => platformApi.getTenant(tenantId!),
    enabled: !!tenantId,
  });
}

export function useTenantUsers(tenantId: string | undefined) {
  return useQuery({
    queryKey: platformKeys.users(tenantId ?? ""),
    queryFn: () => platformApi.listTenantUsers(tenantId!),
    enabled: !!tenantId,
  });
}

export function useTenantPrograms(tenantId: string | undefined) {
  return useQuery({
    queryKey: platformKeys.programs(tenantId ?? ""),
    queryFn: () => platformApi.listTenantPrograms(tenantId!),
    enabled: !!tenantId,
  });
}
