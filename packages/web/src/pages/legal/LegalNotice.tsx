import { LegalLayout } from "@/components/layouts/LegalLayout";
import { LEGAL } from "@/lib/legal";

export function LegalNoticePage() {
  return (
    <LegalLayout title="Aviso Legal" lastUpdated={LEGAL.lastUpdated}>
      <h2>1. Datos identificativos</h2>
      <p>
        En cumplimiento del deber de información recogido en el artículo 10 de
        la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
        Información y del Comercio Electrónico (LSSI), se facilitan los
        siguientes datos:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {LEGAL.companyName}
        </li>
        <li>
          <strong>Nombre comercial:</strong> {LEGAL.tradeName}
        </li>
        <li>
          <strong>CIF/NIF:</strong> {LEGAL.cif}
        </li>
        <li>
          <strong>Domicilio:</strong> {LEGAL.address}
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </li>
        <li>
          <strong>Sitio web:</strong>{" "}
          <a href={LEGAL.url} target="_blank" rel="noopener noreferrer">
            {LEGAL.url}
          </a>
        </li>
        <li>
          <strong>Datos registrales:</strong> {LEGAL.registryInfo}
        </li>
      </ul>

      <h2>2. Objeto</h2>
      <p>
        El presente sitio web tiene por objeto poner a disposición de los
        usuarios información sobre los servicios de {LEGAL.tradeName}: una
        plataforma de suscripción a listados de propietarios particulares que
        venden sin intermediarios, dirigida a agentes inmobiliarios
        profesionales.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso al sitio web no exige registro previo. El uso de los servicios
        de la Plataforma requiere registrarse y aceptar los{" "}
        <a href="/legal/terminos">Términos y Condiciones</a>.
      </p>
      <p>El usuario se compromete a:</p>
      <ul>
        <li>Utilizar el sitio web de forma diligente y de buena fe.</li>
        <li>
          No utilizar el sitio web con fines ilícitos, contrarios a lo
          establecido en estos términos o lesivos para los derechos e intereses
          de terceros.
        </li>
        <li>
          No realizar actividades que puedan dañar, inutilizar, sobrecargar o
          deteriorar el sitio web o los sistemas informáticos del titular.
        </li>
      </ul>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Todos los derechos de propiedad intelectual e industrial del sitio web y
        sus contenidos (textos, imágenes, diseño gráfico, código fuente, marcas,
        nombres comerciales, logotipos, etc.) pertenecen a {LEGAL.companyName} o
        a sus legítimos titulares.
      </p>
      <p>
        Queda expresamente prohibida la reproducción, distribución, comunicación
        pública, transformación o cualquier otra forma de explotación de los
        contenidos sin autorización expresa.
      </p>

      <h2>5. Exclusión de responsabilidad</h2>
      <ul>
        <li>
          <strong>Contenidos:</strong> la información proporcionada a través de
          los listados de particulares se obtiene de fuentes de terceros.{" "}
          {LEGAL.tradeName} no garantiza su exactitud, integridad ni
          actualización.
        </li>
        <li>
          <strong>Disponibilidad:</strong> no se garantiza el acceso
          ininterrumpido al sitio web. Pueden producirse interrupciones por
          mantenimiento o causas ajenas.
        </li>
        <li>
          <strong>Enlaces externos:</strong> en caso de incluir enlaces a sitios
          de terceros, {LEGAL.tradeName} no se responsabiliza de sus contenidos.
        </li>
        <li>
          <strong>Virus:</strong> se adoptan medidas de seguridad razonables,
          pero no se puede garantizar la ausencia total de virus o elementos
          dañinos.
        </li>
      </ul>

      <h2>6. Protección de datos personales</h2>
      <p>
        El tratamiento de datos personales se regula en nuestra{" "}
        <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>

      <h2>7. Cookies</h2>
      <p>
        La información sobre el uso de cookies se detalla en nuestra{" "}
        <a href="/legal/cookies">Política de Cookies</a>.
      </p>

      <h2>8. Legislación aplicable y jurisdicción</h2>
      <p>
        El presente Aviso Legal se rige por la legislación española. Para la
        resolución de cualquier controversia, las partes se someten a los
        Juzgados y Tribunales del domicilio del titular, salvo que la normativa
        aplicable establezca otro fuero.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Para cualquier consulta relativa a este Aviso Legal, puedes contactarnos
        en <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
    </LegalLayout>
  );
}
