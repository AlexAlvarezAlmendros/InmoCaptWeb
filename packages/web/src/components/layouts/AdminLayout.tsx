import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui";
import { useState } from "react";

export function AdminLayout() {
  const { logout, user } = useAuth0();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              onClick={() => navigate("/app/admin")}
              className="text-xl font-bold text-primary"
            >
              InmoCapt{" "}
              <span className="text-sm font-normal text-slate-500">Admin</span>
            </button>

            {/* Desktop navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/app/admin/lists" className={navLinkClass}>
                Listas
              </NavLink>
              <NavLink to="/app/admin/requests" className={navLinkClass}>
                Solicitudes
              </NavLink>
              <NavLink to="/app/dashboard" className={navLinkClass}>
                ← Panel Agente
              </NavLink>
            </nav>
          </div>

          {/* User menu + mobile hamburger */}
          <div className="flex items-center gap-3">
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
                to="/app/admin/lists"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Listas
              </NavLink>
              <NavLink
                to="/app/admin/requests"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                Solicitudes
              </NavLink>
              <NavLink
                to="/app/dashboard"
                className={mobileNavLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                ← Panel Agente
              </NavLink>
              <div className="mt-2 border-t border-border-light pt-3 dark:border-border-dark">
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
