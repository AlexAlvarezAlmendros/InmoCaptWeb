import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
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
    <div className="min-h-screen overflow-x-hidden bg-surface-light dark:bg-surface-dark">
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
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
            Accede a listados de{" "}
            <span className="text-primary">particulares</span> exclusivos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            La plataforma que conecta agentes inmobiliarios con propietarios
            particulares. Datos actualizados, contactos directos y gestión
            profesional de tus captaciones.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Button size="lg" variant="accent" onClick={handleGetStarted}>
              Empezar ahora
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
      <section className="border-t border-border-light bg-white py-12 sm:py-20 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            ¿Cómo funciona?
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Suscríbete a listas",
                description:
                  "Elige las zonas que te interesan y accede a listados actualizados de propietarios.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                ),
              },
              {
                title: "Contacta propietarios",
                description:
                  "Accede a datos de contacto directo y gestiona el estado de cada inmueble.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                ),
              },
              {
                title: "Cierra operaciones",
                description:
                  "Convierte leads en captaciones con información precisa y actualizada.",
                icon: (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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

      {/* Notifications Section */}
      <section className="border-t border-border-light py-12 sm:py-20 dark:border-border-dark overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Mobile centered header */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Notificaciones automáticas
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              No te pierdas ningún inmueble nuevo
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-600 dark:text-slate-400">
              Recibe alertas por email cada vez que se actualicen tus listas.
              Sin tener que estar pendiente — te avisamos cuando hay novedades.
            </p>
          </div>

          <div className="grid min-w-0 items-center gap-8 sm:gap-12 lg:grid-cols-2">
            {/* Text — hidden on mobile (shown above centered), visible on lg */}
            <div className="hidden min-w-0 lg:block">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                Notificaciones automáticas
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                No te pierdas ningún inmueble nuevo
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Recibe alertas por email cada vez que se actualicen tus listas.
                Sin tener que estar pendiente — te avisamos cuando hay
                novedades.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  {
                    title: "Nuevos inmuebles",
                    description:
                      "Recibe un email cuando se añadan nuevas propiedades a tus listas suscritas.",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Confirmación de suscripciones",
                    description:
                      "Confirmación instantánea al activar o cancelar una suscripción.",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Solicitudes de lista",
                    description:
                      "Te notificamos cuando tu solicitud de nueva lista sea aprobada y esté lista para usar.",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Control total",
                    description:
                      "Activa o desactiva las notificaciones desde tu cuenta en cualquier momento.",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features list — mobile only (compact 2x2 grid) */}
            <div className="min-w-0 lg:hidden">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  {
                    title: "Nuevos inmuebles",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Suscripciones",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Solicitudes",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ),
                  },
                  {
                    title: "Control total",
                    icon: (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border-light p-2 sm:gap-3 sm:p-3 dark:border-border-dark"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-8 sm:w-8">
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white sm:text-sm">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email preview mockup */}
            <div className="relative min-w-0 w-full sm:mx-auto sm:max-w-md lg:mx-0">
              <div className="rounded-xl border border-border-light bg-card-light p-1 shadow-xl dark:border-border-dark dark:bg-card-dark">
                {/* Email client header */}
                <div className="flex items-center gap-2 border-b border-border-light px-3 py-2.5 sm:px-4 sm:py-3 dark:border-border-dark">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400 sm:h-3 sm:w-3" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 sm:h-3 sm:w-3" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400 sm:h-3 sm:w-3" />
                  </div>
                  <span className="ml-2 text-xs text-slate-400">
                    Bandeja de entrada
                  </span>
                </div>
                {/* Email items */}
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {[
                    {
                      subject: "Barcelona Eixample — 12 nuevos inmuebles",
                      preview:
                        "La lista Barcelona Eixample tiene 12 nuevos inmuebles disponibles para ti.",
                      time: "Hace 5 min",
                      unread: true,
                    },
                    {
                      subject: "¡Suscripción activada!",
                      preview:
                        "Tu suscripción a Madrid Centro está activa. Ya puedes acceder a todos los inmuebles.",
                      time: "Hace 2h",
                      unread: true,
                    },
                    {
                      subject: "¡Bienvenido a InmoCapt!",
                      preview:
                        "Tu cuenta ha sido creada correctamente. Ya puedes suscribirte a listas.",
                      time: "Ayer",
                      unread: false,
                    },
                  ].map((email, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2.5 sm:px-4 sm:py-3 transition-colors ${
                        email.unread ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {email.unread && (
                            <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                          <span
                            className={`text-xs sm:text-sm ${
                              email.unread
                                ? "font-semibold text-slate-900 dark:text-white"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            InmoCapt
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {email.time}
                        </span>
                      </div>
                      <p
                        className={`mt-1 truncate text-xs sm:text-sm ${
                          email.unread
                            ? "font-medium text-slate-800 dark:text-slate-200"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {email.subject}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {email.preview}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative glow */}
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-t border-border-light bg-white py-12 sm:py-20 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 md:grid-cols-3">
            {[
              {
                name: "Jordi Puig",
                role: "Agente inmobiliario, Igualada",
                quote:
                  "He triplicado mis captaciones desde que uso InmoCapt. Los datos están siempre actualizados y el sistema de gestión es muy intuitivo.",
              },
              {
                name: "Laura Martín",
                role: "Directora de oficina, Barcelona",
                quote:
                  "La mejor herramienta para encontrar propietarios particulares. Mi equipo no puede trabajar sin ella.",
              },
              {
                name: "Marc Ferrer",
                role: "Agente independiente, Tarragona",
                quote:
                  "Excelente relación calidad-precio. El soporte es rápido y las actualizaciones constantes.",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-lg border border-border-light bg-card-light p-6 dark:border-border-dark dark:bg-card-dark"
              >
                <div className="mb-4 flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                    >
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
      <section className="bg-primary py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            ¿Listo para empezar?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
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
      <footer className="border-t border-border-light bg-card-light py-8 sm:py-10 dark:border-border-dark dark:bg-card-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4">
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm sm:gap-x-6 text-slate-500 dark:text-slate-400">
              <Link
                to="/legal/aviso-legal"
                className="hover:text-primary transition-colors"
              >
                Aviso Legal
              </Link>
              <Link
                to="/legal/privacidad"
                className="hover:text-primary transition-colors"
              >
                Política de Privacidad
              </Link>
              <Link
                to="/legal/cookies"
                className="hover:text-primary transition-colors"
              >
                Política de Cookies
              </Link>
              <Link
                to="/legal/terminos"
                className="hover:text-primary transition-colors"
              >
                Términos y Condiciones
              </Link>
            </nav>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} InmoCapt. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
