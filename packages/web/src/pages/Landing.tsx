import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui";

export function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = "/app/dashboard";
    } else {
      loginWithRedirect({ appState: { returnTo: "/app/dashboard" } });
    }
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      {/* Header */}
      <header className="border-b border-border-light bg-card-light/80 backdrop-blur-sm dark:border-border-dark dark:bg-card-dark/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-xl font-bold text-primary">InmoCapt</span>
          <Button onClick={handleGetStarted}>
            {isAuthenticated ? "Ir al panel" : "Empezar ahora"}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
            Accede a listados <span className="text-primary">FSBO</span>{" "}
            exclusivos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            La plataforma que conecta agentes inmobiliarios con propietarios
            particulares. Datos actualizados, contactos directos y gestión
            profesional de tus captaciones.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" variant="accent" onClick={handleGetStarted}>
              Empezar ahora
            </Button>
            <Button size="lg" variant="secondary">
              Ver demo
            </Button>
          </div>
        </div>

        {/* Demo placeholder */}
        <div className="mt-16">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-border-light bg-card-light shadow-card dark:border-border-dark dark:bg-card-dark">
            <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <span className="text-slate-500">Vista previa del panel</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border-light bg-white py-20 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
            ¿Cómo funciona?
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Suscríbete a listas",
                description:
                  "Elige las zonas que te interesan y accede a listados actualizados de propietarios.",
              },
              {
                title: "Contacta propietarios",
                description:
                  "Accede a datos de contacto directo y gestiona el estado de cada inmueble.",
              },
              {
                title: "Cierra operaciones",
                description:
                  "Convierte leads en captaciones con información precisa y actualizada.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-light p-6 dark:border-border-dark"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            ¿Listo para empezar?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-light">
            Únete a cientos de agentes que ya están captando con InmoCapt.
          </p>
          <Button
            size="lg"
            variant="accent"
            className="mt-8"
            onClick={handleGetStarted}
          >
            Crear cuenta gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-light bg-card-light py-8 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} InmoCapt. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
