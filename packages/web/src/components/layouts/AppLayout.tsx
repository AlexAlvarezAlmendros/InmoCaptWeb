import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUserPlan } from "@/hooks/usePlan";
import { useSEO } from "@/hooks/useSEO";
import { useState } from "react";

function PlanBadge({ className = "" }: { className?: string }) {
  const { data: userPlan, isLoading } = useUserPlan();
  if (isLoading || !userPlan) return null;

  const isTrial = userPlan.planId === "trial";
  const isInactive = !userPlan.isActive;

  const tone = isInactive
    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    : isTrial
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-white";

  return (
    <Link
      to="/app/plans"
      title={`${userPlan.credits.total} créditos disponibles`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-base hover:opacity-80 ${tone} ${className}`}
    >
      {userPlan.planName}
      <span className="opacity-60">·</span>
      <span>{userPlan.credits.total}</span>
      <svg
        className="h-3 w-3 opacity-70"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M11.3 1.046A1 1 0 0 1 12 2v5h4a1 1 0 0 1 .82 1.573l-7 10A1 1 0 0 1 8 18v-5H4a1 1 0 0 1-.82-1.573l7-10a1 1 0 0 1 1.12-.38z" />
      </svg>
    </Link>
  );
}

export function AppLayout() {
  const { logout, user } = useAuth0();
  const { isAdmin } = useUserRoles();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSEO({ title: "Panel de Agente | InmoCapt", noindex: true });

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-base ${
      isActive
        ? "bg-primary text-white"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-base ${
      isActive
        ? "bg-primary text-white"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-light bg-card-light/80 backdrop-blur-sm dark:border-border-dark dark:bg-card-dark/80">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={() => navigate("/app")}
              className="text-xl font-bold text-primary"
            >
              InmoCapt
            </button>

            {/* Desktop navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/app/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/app/plans" className={navLinkClass}>
                Planes
              </NavLink>
              <NavLink to="/app/credits" className={navLinkClass}>
                Créditos
              </NavLink>
              <NavLink to="/app/account" className={navLinkClass}>
                Cuenta
              </NavLink>
              {isAdmin && (
                <NavLink to="/app/admin/lists" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          {/* User menu + mobile hamburger */}
          <div className="flex items-center gap-3">
            <PlanBadge className="hidden sm:inline-flex" />
            <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:inline-flex"
            >
              Cerrar sesión
            </Button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <nav className="border-t border-border-light px-4 pb-4 pt-2 dark:border-border-dark md:hidden">
            <div className="flex flex-col gap-1">
              <NavLink
                to="/app/dashboard"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/app/plans"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Planes
              </NavLink>
              <NavLink
                to="/app/credits"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Créditos
              </NavLink>
              <NavLink
                to="/app/account"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Cuenta
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/app/admin/lists"
                  className={mobileNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </NavLink>
              )}
              <div className="mt-2 border-t border-border-light pt-3 dark:border-border-dark">
                <div className="mb-2 px-3">
                  <PlanBadge />
                </div>
                <p className="mb-2 truncate px-3 text-xs text-slate-400">
                  {user?.email}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
