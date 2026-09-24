import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/api";

export function verifyEmail(code: string) {
  return apiFetch<AuthUser>("/auth/verify-email", { method: "POST", body: { code } });
}

export function resendVerificationCode() {
  return apiFetch<null>("/auth/verify-email/resend", { method: "POST" });
}

export function requestEmailChange(email: string) {
  return apiFetch<null>("/auth/me/email", { method: "POST", body: { email } });
}

export function confirmEmailChange(code: string) {
  return apiFetch<AuthUser>("/auth/me/email/confirm", { method: "POST", body: { code } });
}
