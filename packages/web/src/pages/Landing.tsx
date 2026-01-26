import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";

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
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver demo
            </Button>
          </div>
        </div>

        {/* Interactive Demo */}
        <div id="demo" className="mt-16 scroll-mt-8">
          <div className="mx-auto max-w-5xl">
            <InteractiveDemo />
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
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                title: "Contacta propietarios",
                description:
                  "Accede a datos de contacto directo y gestiona el estado de cada inmueble.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
              },
              {
                title: "Cierra operaciones",
                description:
                  "Convierte leads en captaciones con información precisa y actualizada.",
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-light p-6 transition-all hover:border-primary/50 hover:shadow-md dark:border-border-dark"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
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

      {/* Testimonials Section */}
      <section className="border-t border-border-light py-20 dark:border-border-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Carlos Rodríguez",
                role: "Agente inmobiliario, Madrid",
                quote: "He triplicado mis captaciones desde que uso InmoCapt. Los datos están siempre actualizados y el sistema de gestión es muy intuitivo.",
              },
              {
                name: "Laura Martín",
                role: "Directora de oficina, Barcelona",
                quote: "La mejor herramienta para encontrar propietarios particulares. Mi equipo no puede trabajar sin ella.",
              },
              {
                name: "Miguel Ángel Torres",
                role: "Agente independiente, Valencia",
                quote: "Excelente relación calidad-precio. El soporte es rápido y las actualizaciones constantes.",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-light bg-card-light p-6 dark:border-border-dark dark:bg-card-dark"
              >
                <div className="mb-4 flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic">
                  "{testimonial.quote}"
                </p>
                <div className="mt-4 border-t border-border-light pt-4 dark:border-border-dark">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
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
