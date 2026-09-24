import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./PublicLayout";
import { BareLayout } from "./BareLayout";
import { AdminLayout } from "./AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { PublicProgramsListPage } from "@/features/public-registration/PublicProgramsListPage";
import { PublicProgramPage } from "@/features/public-registration/PublicProgramPage";
import { PublicRegistrationPage } from "@/features/public-registration/PublicRegistrationPage";
import { ConfirmationPage } from "@/features/public-registration/ConfirmationPage";
import { VerifyPage } from "@/features/public-registration/VerifyPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProgramsListPage } from "@/features/programs/ProgramsListPage";
import { ProgramDetailLayout } from "@/features/programs/ProgramDetailLayout";
import { ProgramOverviewPage } from "@/features/programs/ProgramOverviewPage";
import { FormBuilderPage } from "@/features/form-builder/FormBuilderPage";
import { RegistrationsListPage } from "@/features/registrations/RegistrationsListPage";
import { RegistrationDetailPage } from "@/features/registrations/RegistrationDetailPage";
import { UsersPage } from "@/features/users/UsersPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ProgramAnalyticsPage } from "@/features/programs/ProgramAnalyticsPage";
import { TenantsListPage } from "@/features/platform/TenantsListPage";
import { TenantDetailPage } from "@/features/platform/TenantDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/programs" replace />} />
        <Route path="/programs" element={<PublicProgramsListPage />} />
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/programs" replace />} />
    </Routes>
  );
}
