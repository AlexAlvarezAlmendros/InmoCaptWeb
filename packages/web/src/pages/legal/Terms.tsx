import { LegalLayout } from "@/components/layouts/LegalLayout";
import { LEGAL } from "@/lib/legal";

export function TermsPage() {
  return (
    <LegalLayout
      title="Términos y Condiciones de Uso"
      lastUpdated={LEGAL.lastUpdated}
    >
      <h2>1. Información general</h2>
      <p>
        Los presentes Términos y Condiciones regulan el acceso y uso de la
        plataforma <strong>{LEGAL.tradeName}</strong> (en adelante, "la
        Plataforma"), accesible desde{" "}
        <a href={LEGAL.url} target="_blank" rel="noopener noreferrer">
          {LEGAL.url}
        </a>
        , titularidad de:
      </p>
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
          <strong>Email:</strong> {LEGAL.contactEmail}
        </li>
      </ul>
      <p>
        El registro o uso de la Plataforma implica la aceptación plena de estos
        Términos. Si no estás de acuerdo, no debes utilizar el servicio.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        {LEGAL.tradeName} es una plataforma SaaS que permite a agentes
        inmobiliarios acceder, mediante suscripción de pago, a listados
        actualizados de propietarios particulares que desean vender su inmueble
        (venta directa de particular a particular, sin intermediarios).
      </p>
      <p>El servicio incluye:</p>
      <ul>
        <li>Acceso a listas de inmuebles por ubicación u otros criterios.</li>
        <li>
          Gestión individual del estado de cada inmueble (nuevo, contactado,
          captado, rechazado).
        </li>
        <li>Posibilidad de añadir comentarios internos por inmueble.</li>
        <li>Notificaciones por email sobre actualizaciones de listas.</li>
      </ul>

      <h2>3. Registro y cuenta de usuario</h2>
      <ul>
        <li>
          El registro se realiza a través de Auth0. El usuario es responsable de
          la veracidad de los datos proporcionados.
        </li>
        <li>
          Cada cuenta es personal e intransferible. El usuario es responsable de
          mantener la confidencialidad de sus credenciales.
        </li>
        <li>
          El usuario debe notificar inmediatamente cualquier acceso no
          autorizado a su cuenta.
        </li>
      </ul>

      <h2>4. Suscripciones y pagos</h2>
      <ul>
        <li>
          El acceso a los listados requiere una suscripción de pago mensual por
          cada lista.
        </li>
        <li>
          Los pagos se procesan íntegramente a través de <strong>Stripe</strong>
          . {LEGAL.tradeName} no almacena datos de tarjetas ni información
          bancaria.
        </li>
        <li>
          Los precios de cada lista son los indicados en la Plataforma en el
          momento de la suscripción y pueden variar.
        </li>
        <li>
          Las suscripciones se renuevan automáticamente cada mes salvo
          cancelación previa.
        </li>
        <li>No existe límite en el número de suscripciones simultáneas.</li>
      </ul>

      <h2>5. Cancelación</h2>
      <ul>
        <li>
          El usuario puede cancelar cualquier suscripción en cualquier momento
          desde su panel de suscripciones o mediante el portal de Stripe.
        </li>
        <li>
          La cancelación es <strong>inmediata</strong>: el acceso a la lista se
          revoca al momento de la cancelación.
        </li>
        <li>
          No se realizan reembolsos proporcionales por el periodo restante.
        </li>
      </ul>

      <h2>6. Solicitud de nuevas listas</h2>
      <ul>
        <li>
          Los usuarios pueden solicitar la creación de nuevas listas
          personalizadas por ubicación.
        </li>
        <li>
          Las solicitudes están sujetas a aprobación por parte del equipo
          administrador.
        </li>
        <li>
          La activación de una nueva lista puede conllevar un coste adicional.
        </li>
      </ul>

      <h2>7. Uso aceptable</h2>
      <p>El usuario se compromete a:</p>
      <ul>
        <li>Utilizar la Plataforma exclusivamente con fines profesionales.</li>
        <li>
          No compartir, redistribuir ni revender los datos obtenidos a través de
          la Plataforma.
        </li>
        <li>
          No realizar ingeniería inversa, scraping ni acceso automatizado no
          autorizado.
        </li>
        <li>
          Cumplir con la normativa vigente en materia de protección de datos
          (RGPD/LOPDGDD) en el uso de los datos de contacto de propietarios.
        </li>
        <li>
          No utilizar los datos de contacto para envío de comunicaciones
          comerciales no solicitadas (spam).
        </li>
      </ul>

      <h2>8. Propiedad intelectual</h2>
      <p>
        Todos los contenidos de la Plataforma (diseño, código, textos, marcas,
        logotipos) son propiedad de {LEGAL.companyName} o de sus licenciantes y
        están protegidos por las leyes de propiedad intelectual e industrial.
      </p>
      <p>
        La suscripción concede una licencia limitada, personal, no exclusiva y
        revocable para acceder y visualizar los datos de las listas suscritas.
      </p>

      <h2>9. Protección de datos</h2>
      <p>
        El tratamiento de datos personales se realiza conforme a lo establecido
        en nuestra <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>

      <h2>10. Disponibilidad del servicio</h2>
      <ul>
        <li>
          {LEGAL.tradeName} se esfuerza por mantener la Plataforma disponible de
          forma continua, pero no garantiza un servicio ininterrumpido.
        </li>
        <li>
          Pueden producirse interrupciones programadas para mantenimiento o
          actualizaciones.
        </li>
        <li>
          No nos hacemos responsables de interrupciones causadas por terceros
          (proveedores de hosting, DNS, etc.).
        </li>
      </ul>

      <h2>11. Limitación de responsabilidad</h2>
      <ul>
        <li>
          Los datos de los listados de particulares se proporcionan tal cual
          ("as is"). {LEGAL.tradeName} no garantiza la exactitud, completitud ni
          actualización de la información de los inmuebles.
        </li>
        <li>
          {LEGAL.tradeName} no es parte en ninguna transacción inmobiliaria
          entre agentes y propietarios.
        </li>
        <li>
          La responsabilidad de {LEGAL.tradeName} se limita, como máximo, al
          importe pagado por el usuario en los últimos 12 meses.
        </li>
      </ul>

      <h2>12. Modificaciones</h2>
      <p>
        Nos reservamos el derecho de modificar estos Términos en cualquier
        momento. Los cambios serán efectivos desde su publicación en la
        Plataforma. El uso continuado tras su publicación implica la aceptación
        de los nuevos términos.
      </p>

      <h2>13. Legislación aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para la resolución
        de cualquier controversia, las partes se someten a los Juzgados y
        Tribunales del domicilio del titular de la Plataforma, salvo que la
        normativa aplicable establezca otro fuero.
      </p>

      <h2>14. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos Términos, puedes contactarnos en{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalLayout>
  );
}
