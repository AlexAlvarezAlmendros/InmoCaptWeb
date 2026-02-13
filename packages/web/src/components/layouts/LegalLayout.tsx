import { Link } from "react-router-dom";

/**
 * Shared layout wrapper for all legal / policy pages.
 */
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      {/* Header */}
      <header className="border-b border-border-light bg-card-light/80 backdrop-blur-sm dark:border-border-dark dark:bg-card-dark/80">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-xl font-bold text-primary">
            InmoCapt
          </Link>
          <Link
            to="/"
            className="text-sm text-slate-600 hover:text-primary dark:text-slate-400"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mb-10 text-sm text-slate-500">
          Última actualización: {lastUpdated}
        </p>

        <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-li:text-slate-600 dark:prose-li:text-slate-400 prose-strong:text-slate-900 dark:prose-strong:text-white">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light bg-card-light py-8 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-4 px-4 text-xs text-slate-500 sm:px-6">
          <Link to="/legal/aviso-legal" className="hover:text-primary">
            Aviso Legal
          </Link>
          <span>•</span>
          <Link to="/legal/privacidad" className="hover:text-primary">
            Política de Privacidad
          </Link>
          <span>•</span>
          <Link to="/legal/cookies" className="hover:text-primary">
            Política de Cookies
          </Link>
          <span>•</span>
          <Link to="/legal/terminos" className="hover:text-primary">
            Términos y Condiciones
          </Link>
        </div>
      </footer>
    </div>
  );
}
