import { LegalLayout } from "@/components/layouts/LegalLayout";
import { LEGAL } from "@/lib/legal";
import { useSEO } from "@/hooks/useSEO";

export function CookiesPolicyPage() {
  useSEO({
    title: "Política de Cookies",
    description:
      "Política de cookies de InmoCapt. Información sobre las cookies que utilizamos y cómo gestionarlas.",
    canonical: "https://inmocapt.com/legal/cookies",
  });

  return (
    <LegalLayout title="Política de Cookies" lastUpdated={LEGAL.lastUpdated}>
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu
        dispositivo cuando visitas un sitio web. Permiten al sitio recordar
        información sobre tu visita, como tus preferencias, para facilitar tu
        próxima visita y hacer que el sitio te resulte más útil.
      </p>

      <h2>2. ¿Qué cookies utiliza {LEGAL.tradeName}?</h2>

      <h3>2.1. Cookies estrictamente necesarias</h3>
      <p>
        Son imprescindibles para el funcionamiento de la Plataforma. Sin ellas
        no podríamos ofrecerte el servicio. No requieren consentimiento.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Proveedor</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>auth0.is.authenticated</td>
            <td>Auth0</td>
            <td>Mantener la sesión de usuario</td>
            <td>Sesión</td>
          </tr>
          <tr>
            <td>_stripe_mid / _stripe_sid</td>
            <td>Stripe</td>
            <td>Prevención de fraude en pagos</td>
            <td>1 año / 30 min</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2. Cookies funcionales</h3>
      <p>
        Permiten recordar tus preferencias (como el modo claro/oscuro) para
        ofrecerte una experiencia personalizada.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Proveedor</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>theme</td>
            <td>{LEGAL.tradeName}</td>
            <td>Preferencia de modo claro/oscuro</td>
            <td>1 año</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3. Cookies analíticas</h3>
      <p>
        Actualmente <strong>no utilizamos</strong> cookies analíticas ni de
        terceros con fines estadísticos. Si en el futuro se incorporaran,
        actualizaremos esta política y solicitaremos tu consentimiento previo.
      </p>

      <h3>2.4. Cookies publicitarias</h3>
      <p>
        <strong>No utilizamos</strong> cookies publicitarias ni de seguimiento.
      </p>

      <h2>3. Base legal</h2>
      <ul>
        <li>
          <strong>Cookies necesarias:</strong> se instalan en base al interés
          legítimo del responsable para garantizar el funcionamiento técnico del
          servicio (art. 22.2 LSSI).
        </li>
        <li>
          <strong>Cookies no necesarias:</strong> requieren tu consentimiento
          explícito antes de su instalación.
        </li>
      </ul>

      <h2>4. ¿Cómo gestionar las cookies?</h2>
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en
        cuenta que desactivar las cookies estrictamente necesarias puede afectar
        al funcionamiento de la Plataforma.
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>5. Actualizaciones</h2>
      <p>
        Esta Política de Cookies puede actualizarse para reflejar cambios en las
        cookies utilizadas. La fecha de la última actualización se indica al
        inicio de esta página.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Si tienes preguntas sobre nuestra Política de Cookies, puedes
        contactarnos en{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
      </p>
    </LegalLayout>
  );
}
