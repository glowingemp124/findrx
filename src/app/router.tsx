import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { lazyNamed } from "@/app/lazy-named";
import { paths } from "@/app/paths";
import { GuestOnly, RequireAuth } from "@/features/auth/auth-guards";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { SignInPage } from "@/features/auth/sign-in-page";
import { SignUpPage } from "@/features/auth/sign-up-page";
import { VerifyOtpPage } from "@/features/auth/verify-otp-page";
import { ClientLayout } from "@/features/client/components/client-layout";
import { ConnectedPage } from "@/features/client/pages/connected-page";
import { LandingPage } from "@/features/client/pages/landing-page";
import { PayPage } from "@/features/client/pages/pay-page";
import { RequestStatusPage } from "@/features/client/pages/request-status-page";
import { ClientTermsPage } from "@/features/client/pages/terms-page";
import { AdminGuestOnly, AdminIndexRedirect, RequireAdmin, RequireModule } from "@/features/admin/auth/admin-guards";
import { AdminLoginPage } from "@/features/admin/auth/admin-login-page";
import { AdminVerifyPage } from "@/features/admin/auth/admin-verify-page";

// The pharmacy and admin dashboards load on demand, so patients only download the public site.
const PharmacyLayout = lazyNamed(() => import("@/features/pharmacy/components/pharmacy-layout"), "PharmacyLayout");
const HistoryPage = lazyNamed(() => import("@/features/pharmacy/pages/history-page"), "HistoryPage");
const PharmacyDashboardPage = lazyNamed(() => import("@/features/pharmacy/pages/dashboard-page"), "PharmacyDashboardPage");
const LiveRequestsPage = lazyNamed(() => import("@/features/pharmacy/pages/live-requests-page"), "LiveRequestsPage");
const MyClaimsPage = lazyNamed(() => import("@/features/pharmacy/pages/my-claims-page"), "MyClaimsPage");
const SettingsPage = lazyNamed(() => import("@/features/pharmacy/pages/settings-page"), "SettingsPage");
const AdminLayout = lazyNamed(() => import("@/features/admin/components/admin-layout"), "AdminLayout");
const DashboardPage = lazyNamed(() => import("@/features/admin/pages/dashboard-page"), "DashboardPage");
const PharmaciesPage = lazyNamed(() => import("@/features/admin/pages/pharmacies-page"), "PharmaciesPage");
const PharmacyDetailPage = lazyNamed(() => import("@/features/admin/pages/pharmacy-detail-page"), "PharmacyDetailPage");
const AdminProfilePage = lazyNamed(() => import("@/features/admin/pages/profile-page"), "AdminProfilePage");
const AdminSettingsPage = lazyNamed(() => import("@/features/admin/pages/settings-page"), "AdminSettingsPage");
const StaffPage = lazyNamed(() => import("@/features/admin/pages/staff-page"), "StaffPage");
const TransactionsPage = lazyNamed(() => import("@/features/admin/pages/transactions-page"), "TransactionsPage");

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Client: public, no account. */}
        <Route element={<ClientLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="terms" element={<ClientTermsPage />} />
          <Route path="request/:requestId">
            <Route index element={<RequestStatusPage />} />
            <Route path="pay" element={<PayPage />} />
            <Route path="connected" element={<ConnectedPage />} />
          </Route>
        </Route>

        {/* Pharmacy auth. */}
        <Route element={<GuestOnly />}>
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="sign-up" element={<SignUpPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="verify-otp" element={<VerifyOtpPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Pharmacy dashboard. */}
        <Route element={<RequireAuth />}>
          <Route path="pharmacy" element={<PharmacyLayout />}>
            <Route index element={<Navigate to={paths.pharmacy.dashboard} replace />} />
            <Route path="dashboard" element={<PharmacyDashboardPage />} />
            <Route path="requests" element={<LiveRequestsPage />} />
            <Route path="claims/:tab?" element={<MyClaimsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings/:tab?" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to={paths.pharmacy.dashboard} replace />} />
          </Route>
        </Route>

        {/* FindRx admin and staff. */}
        <Route path="admin">
          <Route element={<AdminGuestOnly />}>
            <Route path="login" element={<AdminLoginPage />} />
            <Route path="verify" element={<AdminVerifyPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminIndexRedirect />} />
              <Route path="dashboard" element={<RequireModule module="dashboard"><DashboardPage /></RequireModule>} />
              <Route path="pharmacies" element={<RequireModule module="pharmacies"><PharmaciesPage /></RequireModule>} />
              <Route path="pharmacies/:pharmacyId" element={<RequireModule module="pharmacies"><PharmacyDetailPage /></RequireModule>} />
              <Route path="transactions" element={<RequireModule module="transactions"><TransactionsPage /></RequireModule>} />
              <Route path="staff" element={<RequireModule module="staff"><StaffPage /></RequireModule>} />
              <Route path="settings" element={<RequireModule module="settings"><AdminSettingsPage /></RequireModule>} />
              <Route path="profile/:tab?" element={<AdminProfilePage />} />
              <Route path="*" element={<AdminIndexRedirect />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={paths.client.home} replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
