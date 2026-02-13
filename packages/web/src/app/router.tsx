import { Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/Landing";
import { DashboardPage } from "@/pages/Dashboard";
import { ListDetailPage } from "@/pages/ListDetail";
import { SubscriptionsPage } from "@/pages/Subscriptions";
import { AccountPage } from "@/pages/Account";
import { AdminListsPage } from "@/pages/admin/Lists";
import { AdminRequestsPage } from "@/pages/admin/Requests";
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
      </Route>
    </Routes>
  );
}
