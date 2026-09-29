import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./PublicLayout";
import { BareLayout } from "./BareLayout";
import { AdminLayout } from "./AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LandingPage } from "@/features/landing/LandingPage";
import { PageLoading } from "@/components/PageLoading";
import { SkipLink } from "@/components/SkipLink";

/** A page whose code downloads the first time it's opened. */
function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return React.lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));
}

// Every page but the landing page loads on demand, so visitors only download what they open.
const LoginPage = lazyPage(() => import("@/features/auth/LoginPage"), "LoginPage");
const RegisterPage = lazyPage(() => import("@/features/auth/RegisterPage"), "RegisterPage");
const VerifyEmailPage = lazyPage(() => import("@/features/auth/VerifyEmailPage"), "VerifyEmailPage");
const ForgotPasswordPage = lazyPage(() => import("@/features/auth/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyPage(() => import("@/features/auth/ResetPasswordPage"), "ResetPasswordPage");
const LegalLayout = lazyPage(() => import("@/features/legal/LegalLayout"), "LegalLayout");
const AcceptableUsePage = lazyPage(() => import("@/features/legal/policies"), "AcceptableUsePage");
const CookiePolicyPage = lazyPage(() => import("@/features/legal/policies"), "CookiePolicyPage");
const PrivacyPage = lazyPage(() => import("@/features/legal/policies"), "PrivacyPage");
const TermsPage = lazyPage(() => import("@/features/legal/policies"), "TermsPage");
const ContactPage = lazyPage(() => import("@/features/legal/ContactPage"), "ContactPage");
const ReportPage = lazyPage(() => import("@/features/legal/ReportPage"), "ReportPage");
const PublicProgramPage = lazyPage(() => import("@/features/public-registration/PublicProgramPage"), "PublicProgramPage");
const PublicRegistrationPage = lazyPage(() => import("@/features/public-registration/PublicRegistrationPage"), "PublicRegistrationPage");
const ConfirmationPage = lazyPage(() => import("@/features/public-registration/ConfirmationPage"), "ConfirmationPage");
const VerifyPage = lazyPage(() => import("@/features/public-registration/VerifyPage"), "VerifyPage");
const DashboardPage = lazyPage(() => import("@/features/dashboard/DashboardPage"), "DashboardPage");
const ProgramsListPage = lazyPage(() => import("@/features/programs/ProgramsListPage"), "ProgramsListPage");
const ProgramDetailLayout = lazyPage(() => import("@/features/programs/ProgramDetailLayout"), "ProgramDetailLayout");
const ProgramOverviewPage = lazyPage(() => import("@/features/programs/ProgramOverviewPage"), "ProgramOverviewPage");
const FormBuilderPage = lazyPage(() => import("@/features/form-builder/FormBuilderPage"), "FormBuilderPage");
const RegistrationsListPage = lazyPage(() => import("@/features/registrations/RegistrationsListPage"), "RegistrationsListPage");
const VerificationsPage = lazyPage(() => import("@/features/verifications/VerificationsPage"), "VerificationsPage");
const RegistrationDetailPage = lazyPage(() => import("@/features/registrations/RegistrationDetailPage"), "RegistrationDetailPage");
const UsersPage = lazyPage(() => import("@/features/users/UsersPage"), "UsersPage");
const SettingsPage = lazyPage(() => import("@/features/settings/SettingsPage"), "SettingsPage");
const ProgramAnalyticsPage = lazyPage(() => import("@/features/programs/ProgramAnalyticsPage"), "ProgramAnalyticsPage");
const TenantsListPage = lazyPage(() => import("@/features/platform/TenantsListPage"), "TenantsListPage");
const TenantDetailPage = lazyPage(() => import("@/features/platform/TenantDetailPage"), "TenantDetailPage");
const InboxPage = lazyPage(() => import("@/features/support/InboxPage"), "InboxPage");

export function AppRoutes() {
  return (
    <>
      <SkipLink />
      <React.Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<LegalLayout />}>
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/acceptable-use" element={<AcceptableUsePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path="/programs/:slug" element={<PublicProgramPage />} />
            <Route path="/verify/:slug/:registrationNumber" element={<VerifyPage />} />
          </Route>

          {/* No navbar/footer chrome: these are meant to be opened as standalone shared links. */}
          <Route element={<BareLayout />}>
            <Route path="/programs/:slug/register" element={<PublicRegistrationPage />} />
            <Route path="/programs/:slug/confirmation" element={<ConfirmationPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/programs" element={<ProgramsListPage />} />
              <Route path="/admin/programs/:programId" element={<ProgramDetailLayout />}>
                <Route index element={<ProgramOverviewPage />} />
                <Route path="form" element={<FormBuilderPage />} />
                <Route path="analytics" element={<ProgramAnalyticsPage />} />
                <Route path="registrations" element={<RegistrationsListPage />} />
                <Route path="verifications" element={<VerificationsPage />} />
                <Route path="registrations/:registrationId" element={<RegistrationDetailPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["super_admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/tenants" element={<TenantsListPage />} />
              <Route path="/admin/tenants/:tenantId" element={<TenantDetailPage />} />
              <Route path="/admin/inbox" element={<InboxPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </>
  );
}
