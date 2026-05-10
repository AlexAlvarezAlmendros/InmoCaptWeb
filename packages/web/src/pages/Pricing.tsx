import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";

const C = {
  primary: "#1E3A5F",
  primaryDark: "#162B45",
  accent: "#3BB273",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  fg: "#0F172A",
  fgMuted: "#475569",
  fgSubtle: "#94A3B8",
};

type PlanId = "starter" | "pro" | "unlimited";

type Plan = {
  id: PlanId;
  name: string;
  price: number;
  desc: string;
  lists: number | null;
  credits: number;
  badge?: string;
  features: string[];
  notIncluded: string[];
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    desc: "Para el agente que está probando la plataforma.",
    lists: 1,
    credits: 30,
    features: [
      "1 lista activa",
      "30 créditos / mes",
      "Alertas por email",
      "Cambio de lista al siguiente ciclo",
    ],
    notIncluded: ["Acceso a múltiples zonas", "Soporte prioritario"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 69,
    desc: "Para el agente activo con zonas definidas.",
    lists: 2,
    credits: 100,
    badge: "Recomendado",
    features: [
      "2 listas activas",
      "100 créditos / mes",
      "Alertas por email",
      "Cambio de lista al siguiente ciclo",
      "Soporte prioritario",
    ],
    notIncluded: ["Acceso ilimitado a todas las zonas"],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: 149,
    desc: "Para agencias o agentes con alta actividad.",
    lists: null,
    credits: 300,
    features: [
      "Todas las listas disponibles",
      "300 créditos / mes",
      "Alertas por email",
      "Soporte prioritario",
      "Acceso a listas nuevas automáticamente",
    ],
    notIncluded: [],
  },
];

type Topup = {
  id: string;
  name: string;
  credits: number;
  price: number;
  unitPrice: string;
  popular: boolean;
};

const TOPUPS: Topup[] = [
  {
    id: "pack_s",
    name: "Pack S",
    credits: 20,
    price: 12,
    unitPrice: "0,60",
    popular: false,
  },
  {
    id: "pack_m",
    name: "Pack M",
    credits: 60,
    price: 30,
    unitPrice: "0,50",
    popular: true,
  },
  {
    id: "pack_l",
    name: "Pack L",
    credits: 150,
    price: 60,
    unitPrice: "0,40",
    popular: false,
  },
];

type CompareValue = string | boolean;

const COMPARISON_ROWS: {
  label: string;
  starter: CompareValue;
  pro: CompareValue;
  unlimited: CompareValue;
}[] = [
  { label: "Precio / mes", starter: "29 €", pro: "69 €", unlimited: "149 €" },
  { label: "Listas activas", starter: "1", pro: "2", unlimited: "Ilimitadas" },
  { label: "Créditos incluidos", starter: "30", pro: "100", unlimited: "300" },
  { label: "Créditos top-up", starter: true, pro: true, unlimited: true },
  { label: "Alertas por email", starter: true, pro: true, unlimited: true },
  {
    label: "Cambio de lista",
    starter: "Ciclo siguiente",
    pro: "Ciclo siguiente",
    unlimited: "N/A",
  },
  {
    label: "Soporte prioritario",
    starter: false,
    pro: true,
    unlimited: true,
  },
  {
    label: "Acceso a listas nuevas",
    starter: false,
    pro: false,
    unlimited: true,
  },
];

function IconCheck({
  size = 18,
  color = C.accent,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX({
  size = 18,
  color = "#94A3B8",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconLightning({
  size = 18,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function IconMinus({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="#CBD5E1"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlanCard({
  plan,
  onSelect,
}: {
  plan: Plan;
  onSelect: (planId: PlanId) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = plan.id === "pro";

  const bg = highlighted ? C.primary : "#fff";
  const border = highlighted
    ? C.primary
    : hovered
      ? "rgba(30,58,95,0.4)"
      : C.border;
  const textMain = highlighted ? "#fff" : "#0F172A";
  const textMuted = highlighted ? "rgba(255,255,255,0.7)" : "#475569";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 12,
        border: `${highlighted ? 2 : 1}px solid ${border}`,
        background: bg,
        padding: "32px 28px 28px",
        display: "flex",
        flexDirection: "column",
        transition: "all 120ms ease-in-out",
        boxShadow: highlighted
          ? "0 20px 40px -8px rgba(30,58,95,0.35)"
          : hovered
            ? "0 8px 20px -4px rgba(0,0,0,0.12)"
            : "0 1px 3px rgba(0,0,0,0.08)",
        transform: highlighted ? "translateY(-6px)" : "none",
        flex: 1,
        minWidth: 260,
      }}
    >
      {plan.badge && (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.accent,
            color: "#fff",
            padding: "4px 16px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(59,178,115,0.4)",
          }}
        >
          {plan.badge}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: textMain,
            marginBottom: 6,
          }}
        >
          {plan.name}
        </div>
        <div style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>
          {plan.desc}
        </div>
      </div>

      <div
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: highlighted ? "#fff" : C.primary,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {plan.price} €
        </span>
        <span style={{ fontSize: 14, color: textMuted, paddingBottom: 6 }}>
          /mes
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: highlighted
              ? "rgba(255,255,255,0.12)"
              : "rgba(30,58,95,0.07)",
            color: highlighted ? "#fff" : C.primary,
            padding: "4px 10px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <svg
            width="13"
            height="13"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {plan.lists === null
            ? "Listas ilimitadas"
            : `${plan.lists} lista${plan.lists > 1 ? "s" : ""}`}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: highlighted
              ? "rgba(255,255,255,0.12)"
              : "rgba(59,178,115,0.09)",
            color: highlighted ? "#fff" : C.accent,
            padding: "4px 10px",
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <IconLightning size={13} color={highlighted ? "#fff" : C.accent} />
          {plan.credits} créditos
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {plan.features.map((f, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <IconCheck size={16} color={highlighted ? "#6EE7B7" : C.accent} />
            <span style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.4 }}>
              {f}
            </span>
          </div>
        ))}
        {plan.notIncluded.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: 0.45,
            }}
          >
            <IconX size={16} color={highlighted ? "#fff" : "#94A3B8"} />
            <span style={{ fontSize: 13.5, color: textMuted, lineHeight: 1.4 }}>
              {f}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id)}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 120ms",
          border: highlighted ? "none" : `1.5px solid ${C.primary}`,
          background: highlighted ? C.accent : "transparent",
          color: highlighted ? "#fff" : C.primary,
          boxShadow: highlighted ? "0 2px 8px rgba(59,178,115,0.3)" : "none",
        }}
      >
        {highlighted ? "Empezar con Pro" : `Elegir ${plan.name}`}
      </button>
    </div>
  );
}

function ComparisonTable() {
  const textMain = "#0F172A";
  const textMuted = "#475569";
  const bg = "#fff";
  const border = C.border;
  const stripe = "rgba(30,58,95,0.025)";
  const accentPlan: PlanId = "pro";

  const renderCell = (val: CompareValue) => {
    if (val === true) return <IconCheck size={18} color={C.accent} />;
    if (val === false) return <IconMinus size={18} />;
    return (
      <span style={{ fontSize: 13, fontWeight: 400, color: textMain }}>
        {val}
      </span>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: bg,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: `1px solid ${border}`,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "16px 20px",
                textAlign: "left",
                fontSize: 13,
                fontWeight: 600,
                color: textMuted,
                borderBottom: `1px solid ${border}`,
                width: "36%",
              }}
            ></th>
            {PLANS.map((p) => (
              <th
                key={p.id}
                style={{
                  padding: "16px 20px",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: p.id === accentPlan ? C.primary : textMain,
                  borderBottom: `1px solid ${border}`,
                  background:
                    p.id === accentPlan ? "rgba(30,58,95,0.04)" : "transparent",
                }}
              >
                {p.name}
                {p.id === accentPlan && (
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: C.accent,
                      fontWeight: 500,
                      marginTop: 2,
                    }}
                  >
                    Recomendado
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => (
            <tr
              key={i}
              style={{ background: i % 2 === 1 ? stripe : "transparent" }}
            >
              <td
                style={{
                  padding: "13px 20px",
                  fontSize: 13,
                  color: textMuted,
                  borderBottom:
                    i < COMPARISON_ROWS.length - 1
                      ? `1px solid ${border}`
                      : "none",
                }}
              >
                {row.label}
              </td>
              {PLANS.map((p) => (
                <td
                  key={p.id}
                  style={{
                    padding: "13px 20px",
                    textAlign: "center",
                    borderBottom:
                      i < COMPARISON_ROWS.length - 1
                        ? `1px solid ${border}`
                        : "none",
                    background:
                      p.id === accentPlan
                        ? "rgba(30,58,95,0.025)"
                        : "transparent",
                  }}
                >
                  {renderCell(row[p.id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopupCard({ pack }: { pack: Topup }) {
  const [hovered, setHovered] = useState(false);
  const border = hovered ? "rgba(30,58,95,0.4)" : C.border;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 10,
        border: `1px solid ${border}`,
        padding: "22px 24px",
        position: "relative",
        transition: "all 120ms",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.1)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        flex: 1,
        minWidth: 220,
      }}
    >
      {pack.popular && (
        <span
          style={{
            position: "absolute",
            top: -11,
            right: 16,
            background: C.primary,
            color: "#fff",
            padding: "3px 12px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Más popular
        </span>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#0F172A",
          marginBottom: 4,
        }}
      >
        {pack.name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: C.primary,
            letterSpacing: "-0.03em",
          }}
        >
          {pack.price} €
        </span>
        <span style={{ fontSize: 13, color: "#94A3B8" }}>pago único</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconLightning size={15} color={C.accent} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
            {pack.credits} créditos
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: C.accent,
            fontWeight: 500,
            background: "rgba(59,178,115,0.1)",
            padding: "2px 8px",
            borderRadius: 9999,
          }}
        >
          {pack.unitPrice} €/crédito
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>
        Los créditos no caducan
      </div>
      <button
        style={{
          width: "100%",
          height: 38,
          borderRadius: 8,
          background: "transparent",
          border: `1.5px solid ${C.primary}`,
          color: C.primary,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 120ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = C.primary;
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.primary;
        }}
      >
        Comprar pack
      </button>
    </div>
  );
}

export function PricingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  useSEO({
    title: "Precios — InmoCapt",
    description:
      "Planes desde 29€/mes. Starter, Pro y Unlimited. Prueba gratis 7 días con 3 créditos incluidos. Sin tarjeta de crédito.",
    canonical: "https://inmocapt.com/pricing",
  });

  const handleGetStarted = () => {
    if (isAuthenticated) {
      window.location.href = "/app/dashboard";
    } else {
      loginWithRedirect({ appState: { returnTo: "/app/dashboard" } });
    }
  };

  const textMain = C.fg;
  const textMuted = C.fgMuted;
  const bg = C.bg;
  const bgCard = C.card;
  const border = C.border;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>
              InmoCapt
            </span>
          </Link>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={handleGetStarted}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: "transparent",
                fontSize: 13,
                fontWeight: 500,
                color: textMuted,
                cursor: "pointer",
              }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={handleGetStarted}
              style={{
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                border: "none",
                background: C.primary,
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {isAuthenticated ? "Ir al panel" : "Crear cuenta gratis"}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          style={{
            padding: "72px 24px 48px",
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(59,178,115,0.1)",
              color: C.accent,
              padding: "5px 14px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 24,
            }}
          >
            <IconLightning size={13} color={C.accent} />
            Prueba gratis 7 días · 3 créditos incluidos
          </div>
          <h1
            style={{
              fontSize: "clamp(1.9rem, 4.5vw, 3rem)",
              fontWeight: 700,
              color: textMain,
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              marginBottom: 20,
            }}
          >
            El plan que se adapta
            <br />
            <span style={{ color: C.primary }}>a tu ritmo de captación</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: textMuted,
              lineHeight: 1.65,
              marginBottom: 0,
            }}
          >
            Suscríbete por zonas, revela contactos de propietarios particulares
            y gestiona tu pipeline de captación. Sin sorpresas en la factura.
          </p>
        </section>

        {/* Plan Cards */}
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "8px 24px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {PLANS.map((p) => (
              <PlanCard key={p.id} plan={p} onSelect={handleGetStarted} />
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 36,
              fontSize: 13,
              color: "#94A3B8",
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              "Sin permanencia, cancela cuando quieras",
              "Factura mensual",
              "Pago seguro con Stripe",
            ].map((t, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <IconCheck size={13} color={C.accent} />
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Cómo funcionan los créditos */}
        <section
          style={{
            background: "rgba(30,58,95,0.03)",
            borderTop: `1px solid ${border}`,
            borderBottom: `1px solid ${border}`,
            padding: "56px 24px",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: textMain,
                  marginBottom: 10,
                }}
              >
                ¿Qué es un crédito?
              </h2>
              <p style={{ fontSize: 15, color: textMuted }}>
                1 crédito = revelar el contacto completo de 1 propietario
                (teléfono + enlace original)
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  title: "Un clic, un lead",
                  desc: 'Al pulsar "Revelar contacto", se descuenta 1 crédito y se muestra el teléfono y URL del anuncio original.',
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                },
                {
                  title: "Permanente para ti",
                  desc: "Una vez revelado, siempre disponible. No vuelve a cobrarse aunque lo consultes días después.",
                  icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                },
                {
                  title: "Caducidad mensual",
                  desc: "Los créditos de tu plan se renuevan cada mes. Los no usados no se acumulan. Los top-ups sí son permanentes.",
                  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
                },
                {
                  title: "Top-up cuando lo necesites",
                  desc: "Si te quedas sin créditos, compra un pack adicional al momento. Sin esperar al próximo ciclo.",
                  icon: "M13 10V3L4 14h7v7l9-11h-7z",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: bgCard,
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    padding: "20px 20px 18px",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "rgba(30,58,95,0.08)",
                      color: C.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <svg
                      width={20}
                      height={20}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={C.primary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={item.icon} />
                    </svg>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: textMain,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{ fontSize: 13, color: textMuted, lineHeight: 1.55 }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparativa */}
        <section
          style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: textMain,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            Comparativa de planes
          </h2>
          <ComparisonTable />
        </section>

        {/* Top-ups */}
        <section
          style={{
            background: "rgba(30,58,95,0.025)",
            borderTop: `1px solid ${border}`,
            padding: "56px 24px",
          }}
        >
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: textMain,
                  marginBottom: 10,
                }}
              >
                Créditos adicionales
              </h2>
              <p style={{ fontSize: 15, color: textMuted }}>
                ¿Necesitas más leads este mes? Compra un pack sin cambiar de
                plan. No caducan.
              </p>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {TOPUPS.map((pack) => (
                <TopupCard key={pack.id} pack={pack} />
              ))}
            </div>
          </div>
        </section>

        {/* Trial Banner */}
        <section
          style={{
            background: C.primary,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                padding: "5px 14px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 22,
              }}
            >
              Sin tarjeta de crédito
            </div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              Prueba InmoCapt 7 días gratis
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.82)",
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              Al registrarte, recibes 3 créditos para revelar contactos reales.
              Elige tu lista y empieza a captar propietarios particulares hoy
              mismo.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleGetStarted}
                style={{
                  height: 48,
                  padding: "0 28px",
                  borderRadius: 8,
                  background: C.accent,
                  border: "none",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(59,178,115,0.35)",
                }}
              >
                Empezar prueba gratis
              </button>
              <a
                href="#planes"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 48,
                  padding: "0 24px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.35)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                Ver planes
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${border}`,
          background: bgCard,
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {[
            { label: "Aviso Legal", to: "/legal/aviso-legal" },
            { label: "Política de Privacidad", to: "/legal/privacidad" },
            { label: "Política de Cookies", to: "/legal/cookies" },
            { label: "Términos y Condiciones", to: "/legal/terminos" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                fontSize: 12,
                color: C.fgSubtle,
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#CBD5E1" }}>
          © {new Date().getFullYear()} InmoCapt. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
