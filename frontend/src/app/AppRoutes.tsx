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
const ProgramPaymentsPage = lazyPage(() => import("@/features/payments/ProgramPaymentsPage"), "ProgramPaymentsPage");
const FundsPage = lazyPage(() => import("@/features/payments/FundsPage"), "FundsPage");
const PlatformPaymentsPage = lazyPage(() => import("@/features/payments/PlatformPaymentsPage"), "PlatformPaymentsPage");
const PublicPaymentPage = lazyPage(() => import("@/features/payments/PublicPaymentPage"), "PublicPaymentPage");
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
const PollsListPage = lazyPage(() => import("@/features/polls/PollsListPage"), "PollsListPage");
const PollDetailLayout = lazyPage(() => import("@/features/polls/PollDetailLayout"), "PollDetailLayout");
const PollOverviewPage = lazyPage(() => import("@/features/polls/PollOverviewPage"), "PollOverviewPage");
const BallotBuilderPage = lazyPage(() => import("@/features/polls/BallotBuilderPage"), "BallotBuilderPage");
const PollResultsPage = lazyPage(() => import("@/features/polls/PollResultsPage"), "PollResultsPage");
const PollVotersPage = lazyPage(() => import("@/features/polls/PollVotersPage"), "PollVotersPage");
const VotePage = lazyPage(() => import("@/features/vote/VotePage"), "VotePage");
const BusinessesListPage = lazyPage(() => import("@/features/businesses/BusinessesListPage"), "BusinessesListPage");
const BusinessLayout = lazyPage(() => import("@/features/businesses/BusinessLayout"), "BusinessLayout");
const BusinessOverviewPage = lazyPage(() => import("@/features/businesses/BusinessOverviewPage"), "BusinessOverviewPage");
const QuotationsPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "QuotationsPage");
const NewQuotationPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "NewQuotationPage");
const QuotationDetailPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "QuotationDetailPage");
const QuotationSettingsPage = lazyPage(() => import("@/features/businesses/DocumentSettingsPage"), "QuotationSettingsPage");
const CardsListPage = lazyPage(() => import("@/features/businesses/CardPages"), "CardsListPage");
const NewCardPage = lazyPage(() => import("@/features/businesses/CardPages"), "NewCardPage");
const CardDetailPage = lazyPage(() => import("@/features/businesses/CardPages"), "CardDetailPage");
const InvoicesPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "InvoicesPage");
const ReceiptsPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "ReceiptsPage");
const NewInvoicePage = lazyPage(() => import("@/features/businesses/DocumentPages"), "NewInvoicePage");
const NewReceiptPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "NewReceiptPage");
const InvoiceDetailPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "InvoiceDetailPage");
const ReceiptDetailPage = lazyPage(() => import("@/features/businesses/DocumentPages"), "ReceiptDetailPage");
const InvoiceSettingsPage = lazyPage(() => import("@/features/businesses/DocumentSettingsPage"), "InvoiceSettingsPage");
const ReceiptSettingsPage = lazyPage(() => import("@/features/businesses/DocumentSettingsPage"), "ReceiptSettingsPage");
const BusinessOrderFormPage = lazyPage(() => import("@/features/businesses/OrderPages"), "BusinessOrderFormPage");
const BusinessOrdersPage = lazyPage(() => import("@/features/businesses/OrderPages"), "BusinessOrdersPage");
const BusinessOrderDetailPage = lazyPage(() => import("@/features/businesses/OrderPages"), "BusinessOrderDetailPage");
const BusinessAnalyticsTab = lazyPage(() => import("@/features/businesses/OrderPages"), "BusinessAnalyticsTab");
const PublicOrderPage = lazyPage(() => import("@/features/public-registration/PublicRegistrationPage"), "PublicOrderPage");
const OrderConfirmationPage = lazyPage(() => import("@/features/public-registration/ConfirmationPage"), "OrderConfirmationPage");
const VoterLoginPage = lazyPage(() => import("@/features/vote/VoterAuthPage"), "VoterLoginPage");
const VoterForgotPasswordPage = lazyPage(() => import("@/features/vote/VoterPasswordPages"), "VoterForgotPasswordPage");
const VoterResetPasswordPage = lazyPage(() => import("@/features/vote/VoterPasswordPages"), "VoterResetPasswordPage");
const VoterRegisterPage = lazyPage(() => import("@/features/vote/VoterAuthPage"), "VoterRegisterPage");

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

          {/* Voting pages have their own frame, branded with the poll. */}
          <Route path="/vote/:slug/login" element={<VoterLoginPage />} />
          <Route path="/vote/:slug/register" element={<VoterRegisterPage />} />
          <Route path="/vote/:slug/forgot-password" element={<VoterForgotPasswordPage />} />
          <Route path="/vote/:slug/reset-password" element={<VoterResetPasswordPage />} />
          <Route path="/vote/:slug" element={<VotePage />} />
          <Route path="/vote/:slug/:positionId" element={<VotePage />} />

          <Route element={<PublicLayout />}>
            <Route path="/programs/:slug" element={<PublicProgramPage />} />
            <Route path="/verify/:slug/:registrationNumber" element={<VerifyPage />} />
          </Route>

          {/* No navbar/footer chrome: these are meant to be opened as standalone shared links. */}
          <Route element={<BareLayout />}>
            <Route path="/programs/:slug/register" element={<PublicRegistrationPage />} />
            <Route path="/programs/:slug/confirmation" element={<ConfirmationPage />} />
            {/* Where a payer lands after Monime's page, and where an unfinished payment is picked up again. */}
            <Route path="/payment/:token" element={<PublicPaymentPage />} />
            {/* A business's live order page and its confirmation. */}
            <Route path="/order/:slug" element={<PublicOrderPage />} />
            <Route path="/order/:slug/confirmation" element={<OrderConfirmationPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/programs" element={<ProgramsListPage />} />
              <Route path="/admin/businesses" element={<BusinessesListPage />} />
              <Route path="/admin/businesses/:businessId" element={<BusinessLayout />}>
                <Route index element={<BusinessOverviewPage />} />
                <Route path="order-form" element={<BusinessOrderFormPage />} />
                <Route path="orders" element={<BusinessOrdersPage />} />
                <Route path="orders/:registrationId" element={<BusinessOrderDetailPage />} />
                <Route path="cards" element={<CardsListPage />} />
                <Route path="cards/new" element={<NewCardPage />} />
                <Route path="cards/:cardId" element={<CardDetailPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="quotations/new" element={<NewQuotationPage />} />
                <Route path="quotations/settings" element={<QuotationSettingsPage />} />
                <Route path="quotations/:documentId" element={<QuotationDetailPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/new" element={<NewInvoicePage />} />
                <Route path="invoices/settings" element={<InvoiceSettingsPage />} />
                <Route path="invoices/:documentId" element={<InvoiceDetailPage />} />
                <Route path="receipts" element={<ReceiptsPage />} />
                <Route path="receipts/new" element={<NewReceiptPage />} />
                <Route path="receipts/settings" element={<ReceiptSettingsPage />} />
                <Route path="receipts/:documentId" element={<ReceiptDetailPage />} />
                <Route path="analytics" element={<BusinessAnalyticsTab />} />
              </Route>
              <Route path="/admin/polls" element={<PollsListPage />} />
              <Route path="/admin/polls/:pollId" element={<PollDetailLayout />}>
                <Route index element={<PollOverviewPage />} />
                <Route path="ballot" element={<BallotBuilderPage />} />
                <Route path="results" element={<PollResultsPage />} />
                <Route path="voters" element={<PollVotersPage />} />
              </Route>
              <Route path="/admin/programs/:programId" element={<ProgramDetailLayout />}>
                <Route index element={<ProgramOverviewPage />} />
                <Route path="form" element={<FormBuilderPage />} />
                <Route path="analytics" element={<ProgramAnalyticsPage />} />
                <Route path="registrations" element={<RegistrationsListPage />} />
                <Route path="verifications" element={<VerificationsPage />} />
                <Route path="payments" element={<ProgramPaymentsPage />} />
                <Route path="registrations/:registrationId" element={<RegistrationDetailPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/funds" element={<FundsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["super_admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/tenants" element={<TenantsListPage />} />
              <Route path="/admin/tenants/:tenantId" element={<TenantDetailPage />} />
              <Route path="/admin/inbox" element={<InboxPage />} />
              <Route path="/admin/platform-payments" element={<PlatformPaymentsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </>
  );
}
