import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui";
import { useUserRoles } from "@/hooks/useUserRoles";

export function AppLayout() {
  const { logout, user } = useAuth0();
  const { isAdmin } = useUserRoles();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-base ${
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

            {/* Navigation */}
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/app/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/app/subscriptions" className={navLinkClass}>
                Suscripciones
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

          {/* User menu */}
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 dark:text-slate-400 sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
