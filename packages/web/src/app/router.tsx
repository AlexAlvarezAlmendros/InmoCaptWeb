import { Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/Landing";
import { PricingPage } from "@/pages/Pricing";
import { DashboardPage } from "@/pages/Dashboard";
import { ListDetailPage } from "@/pages/ListDetail";
import { SubscriptionsPage } from "@/pages/Subscriptions";
import { PlansPage } from "@/pages/Plans";
import { CreditsPage } from "@/pages/Credits";
import { AccountPage } from "@/pages/Account";
import { AdminListsPage } from "@/pages/admin/Lists";
import { AdminRequestsPage } from "@/pages/admin/Requests";
import { AdminUsersPage } from "@/pages/admin/Users";
import { AdminMaintenancePage } from "@/pages/admin/Maintenance";
import {
  PrivacyPolicyPage,
  TermsPage,
  CookiesPolicyPage,
  LegalNoticePage,
} from "@/pages/legal";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import { AdminRoute } from "./guards/AdminRoute";
import { AppLayout } from "@/components/layouts/AppLayout";
import { AdminLayout } from "@/components/layouts/AdminLayout";

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Legal routes */}
      <Route path="/legal/aviso-legal" element={<LegalNoticePage />} />
      <Route path="/legal/privacidad" element={<PrivacyPolicyPage />} />
      <Route path="/legal/cookies" element={<CookiesPolicyPage />} />
      <Route path="/legal/terminos" element={<TermsPage />} />

      {/* Protected agent routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="lists/:listId" element={<ListDetailPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/app/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminListsPage />} />
        <Route path="lists" element={<AdminListsPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="maintenance" element={<AdminMaintenancePage />} />
      </Route>
    </Routes>
  );
}
