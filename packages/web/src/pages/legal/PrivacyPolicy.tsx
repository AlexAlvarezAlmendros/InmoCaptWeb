import { LegalLayout } from "@/components/layouts/LegalLayout";
import { LEGAL } from "@/lib/legal";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated={LEGAL.lastUpdated}>
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Titular:</strong> {LEGAL.companyName}
        </li>
        <li>
          <strong>CIF/NIF:</strong> {LEGAL.cif}
        </li>
        <li>
          <strong>Domicilio:</strong> {LEGAL.address}
        </li>
        <li>
          <strong>Email de contacto:</strong> {LEGAL.privacyEmail}
        </li>
      </ul>

      <h2>2. Datos que recopilamos</h2>
      <p>
        Recopilamos los siguientes datos personales cuando utilizas{" "}
        {LEGAL.tradeName}:
      </p>
      <ul>
        <li>
          <strong>Datos de registro:</strong> dirección de correo electrónico
          proporcionada a través de Auth0 durante el registro o inicio de
          sesión.
        </li>
        <li>
          <strong>Datos de pago:</strong> gestionados íntegramente por Stripe.
          No almacenamos números de tarjeta ni datos bancarios en nuestros
          servidores.
        </li>
        <li>
          <strong>Datos de uso:</strong> información sobre tu interacción con la
          plataforma (listas suscritas, estados de inmuebles, comentarios).
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de navegador,
          sistema operativo y datos de cookies estrictamente necesarios.
        </li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <p>Tratamos tus datos para las siguientes finalidades:</p>
      <ul>
        <li>Prestación del servicio contratado (acceso a listados de particulares).</li>
        <li>Gestión de tu cuenta y suscripciones.</li>
        <li>Procesamiento de pagos a través de Stripe.</li>
        <li>
          Envío de notificaciones por email relativas a actualizaciones de
          listas, facturación y cambios en tus suscripciones (si las tienes
          activadas).
        </li>
        <li>Cumplimiento de obligaciones legales y fiscales.</li>
      </ul>

      <h2>4. Base legal del tratamiento</h2>
      <ul>
        <li>
          <strong>Ejecución del contrato:</strong> el tratamiento es necesario
          para prestarte el servicio al que te has suscrito.
        </li>
        <li>
          <strong>Consentimiento:</strong> para el envío de comunicaciones
          comerciales opcionales.
        </li>
        <li>
          <strong>Interés legítimo:</strong> para la mejora del servicio y
          prevención de fraude.
        </li>
        <li>
          <strong>Obligación legal:</strong> para el cumplimiento de normativa
          fiscal y mercantil.
        </li>
      </ul>

      <h2>5. Destinatarios de los datos</h2>
      <p>Tus datos pueden ser comunicados a los siguientes terceros:</p>
      <ul>
        <li>
          <strong>Auth0 (Okta):</strong> servicio de autenticación y gestión de
          identidades.
        </li>
        <li>
          <strong>Stripe:</strong> procesamiento de pagos y facturación.
        </li>
        <li>
          <strong>Turso:</strong> almacenamiento de datos en base de datos.
        </li>
        <li>
          <strong>Proveedor de email:</strong> envío de notificaciones
          transaccionales.
        </li>
      </ul>
      <p>
        No vendemos, alquilamos ni compartimos tus datos personales con terceros
        con fines comerciales.
      </p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos de nuestros proveedores de servicios pueden estar ubicados fuera
        del Espacio Económico Europeo (EEE). En estos casos, las transferencias
        se realizan con las garantías adecuadas conforme al RGPD (cláusulas
        contractuales tipo, decisiones de adecuación o mecanismos equivalentes).
      </p>

      <h2>7. Conservación de los datos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> mientras mantengas una cuenta activa
          en la plataforma y, tras su cancelación, durante el plazo legalmente
          exigido.
        </li>
        <li>
          <strong>Datos de facturación:</strong> durante el plazo legalmente
          exigido a efectos fiscales (mínimo 4 años).
        </li>
        <li>
          <strong>Datos de uso:</strong> mientras tu cuenta esté activa. Se
          eliminan tras la baja definitiva.
        </li>
      </ul>

      <h2>8. Derechos del usuario</h2>
      <p>
        Puedes ejercer los siguientes derechos en cualquier momento contactando
        con {LEGAL.privacyEmail}:
      </p>
      <ul>
        <li>
          <strong>Acceso:</strong> conocer qué datos personales tratamos sobre
          ti.
        </li>
        <li>
          <strong>Rectificación:</strong> solicitar la corrección de datos
          inexactos.
        </li>
        <li>
          <strong>Supresión:</strong> solicitar la eliminación de tus datos
          cuando ya no sean necesarios.
        </li>
        <li>
          <strong>Oposición:</strong> oponerte al tratamiento de tus datos en
          determinadas circunstancias.
        </li>
        <li>
          <strong>Limitación:</strong> solicitar la limitación del tratamiento.
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en un formato
          estructurado y de uso común.
        </li>
      </ul>
      <p>
        Asimismo, tienes derecho a presentar una reclamación ante la{" "}
        <strong>Agencia Española de Protección de Datos (AEPD)</strong> –{" "}
        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          www.aepd.es
        </a>
        .
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Implementamos medidas técnicas y organizativas adecuadas para proteger
        tus datos, incluyendo cifrado en tránsito (HTTPS/TLS), control de acceso
        basado en roles y auditoría de accesos.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        Nos reservamos el derecho de actualizar esta política. Cualquier
        modificación sustancial será comunicada a través de la plataforma o por
        email. La fecha de última actualización se refleja al inicio de este
        documento.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para cualquier cuestión relacionada con la privacidad, puedes
        contactarnos en{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
      </p>
    </LegalLayout>
  );
}
