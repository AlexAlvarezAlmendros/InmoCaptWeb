import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// ─── Core Send ────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn(
      "[Email] RESEND_API_KEY not configured, skipping:",
      params.subject,
    );
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return false;
    }

    console.log("[Email] Sent to:", params.to);
    return true;
  } catch (err) {
    console.error("[Email] Error:", err);
    return false;
  }
}

// ─── HTML Escaping ────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Shared Layout ────────────────────────────────────────────────

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    ${content}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
      InmoCapt &mdash; Captación de particulares para agentes inmobiliarios
      <br>
      <a href="${env.FRONTEND_URL}/app/account" style="color: #94a3b8;">Gestionar preferencias de notificación</a>
    </p>
  </div>
</body>
</html>`;
}

function primaryButton(text: string, href: string): string {
  return `<a href="${href}" style="display: inline-block; background-color: #3BB273; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">${text}</a>`;
}

function secondaryButton(text: string, href: string): string {
  return `<a href="${href}" style="display: inline-block; background-color: #1E3A5F; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">${text}</a>`;
}

// ─── Email Templates ──────────────────────────────────────────────

/**
 * Welcome email sent when a new user is created
 */
export async function sendWelcomeEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Bienvenido a InmoCapt",
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        ¡Bienvenido a InmoCapt!
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu cuenta ha sido creada correctamente. Ya puedes suscribirte a listas de propietarios particulares que quieren vender su inmueble.
      </p>
      ${primaryButton("Explorar listas disponibles", `${env.FRONTEND_URL}/app/subscriptions`)}
    `),
    text: `Bienvenido a InmoCapt. Explora las listas disponibles en: ${env.FRONTEND_URL}/app/subscriptions`,
  });
}

/**
 * Subscription activated email
 */
export async function sendSubscriptionActivatedEmail(
  to: string,
  listName: string,
  listId: string,
): Promise<boolean> {
  const listUrl = `${env.FRONTEND_URL}/app/lists/${listId}`;
  const safeName = escapeHtml(listName);

  return sendEmail({
    to,
    subject: `Suscripción activada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        ¡Suscripción activada!
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu suscripción a <strong>${safeName}</strong> está activa. Ya puedes acceder a todos los inmuebles de la lista.
      </p>
      ${primaryButton("Ver lista", listUrl)}
      <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0;">
        Recibirás notificaciones cuando esta lista se actualice con nuevos inmuebles.
      </p>
    `),
    text: `Tu suscripción a ${listName} está activa. Ver lista: ${listUrl}`,
  });
}

/**
 * Subscription cancelled email
 */
export async function sendSubscriptionCancelledEmail(
  to: string,
  listName: string,
): Promise<boolean> {
  const safeName = escapeHtml(listName);
  return sendEmail({
    to,
    subject: `Suscripción cancelada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Suscripción cancelada
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
        Tu suscripción a <strong>${safeName}</strong> ha sido cancelada. Ya no tendrás acceso a los inmuebles de esta lista.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Si cambias de opinión, siempre puedes volver a suscribirte.
      </p>
      ${secondaryButton("Ver listas disponibles", `${env.FRONTEND_URL}/app/subscriptions`)}
    `),
    text: `Tu suscripción a ${listName} ha sido cancelada.`,
  });
}

/**
 * List updated email — sent to all subscribers when admin uploads new properties
 */
export async function sendListUpdatedEmail(
  to: string,
  listName: string,
  newPropertiesCount: number,
  listId: string,
): Promise<boolean> {
  const listUrl = `${env.FRONTEND_URL}/app/lists/${listId}`;
  const safeName = escapeHtml(listName);
  const safeCount = Number(newPropertiesCount);

  return sendEmail({
    to,
    subject: `${listName} — ${safeCount} nuevos inmuebles`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Nueva actualización disponible
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        La lista <strong>${safeName}</strong> tiene
        <strong style="color: #10B981;">${safeCount} nuevos inmuebles</strong>
        disponibles para ti.
      </p>
      ${primaryButton("Ver inmuebles", listUrl)}
    `),
    text: `La lista ${listName} tiene ${safeCount} nuevos inmuebles. Ver: ${listUrl}`,
  });
}

/**
 * List request approved email
 */
export async function sendListRequestApprovedEmail(
  to: string,
  listName: string,
  location: string,
): Promise<boolean> {
  const safeName = escapeHtml(listName);
  const safeLocation = escapeHtml(location);
  return sendEmail({
    to,
    subject: `Tu solicitud de lista ha sido aprobada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        ¡Solicitud aprobada!
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu solicitud de una lista para <strong>${safeLocation}</strong> ha sido aprobada.
        La lista <strong>${safeName}</strong> ya está disponible.
      </p>
      ${primaryButton("Ver listas disponibles", `${env.FRONTEND_URL}/app/subscriptions`)}
    `),
    text: `Tu solicitud para ${location} ha sido aprobada. La lista ${listName} ya está disponible.`,
  });
}

/**
 * List request rejected email
 */
export async function sendListRequestRejectedEmail(
  to: string,
  location: string,
): Promise<boolean> {
  const safeLocation = escapeHtml(location);
  return sendEmail({
    to,
    subject: "Solicitud de lista no aprobada",
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Solicitud no aprobada
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Lamentamos informarte de que tu solicitud de una lista para <strong>${safeLocation}</strong>
        no ha podido ser aprobada en este momento.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Si tienes preguntas, no dudes en contactarnos.
      </p>
    `),
    text: `Tu solicitud de lista para ${location} no ha sido aprobada.`,
  });
}

// ─── Admin Notifications ──────────────────────────────────────────

/**
 * Format an amount in cents into a human-readable currency string.
 */
function formatCents(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amountCents == null) return "—";
  return `${(amountCents / 100).toFixed(2)} ${(currency || "eur").toUpperCase()}`;
}

/**
 * Send a notification to the configured admin address.
 * No-op (returns false) if ADMIN_EMAIL is not configured.
 */
async function sendAdminNotification(
  subject: string,
  content: string,
  text: string,
): Promise<boolean> {
  if (!env.ADMIN_EMAIL) {
    console.warn(
      "[Email] ADMIN_EMAIL not configured, skipping admin notification:",
      subject,
    );
    return false;
  }

  return sendEmail({
    to: env.ADMIN_EMAIL,
    subject,
    html: emailLayout(content),
    text,
  });
}

/**
 * Renders a labelled detail row for admin emails.
 */
function detailRow(label: string, value: string): string {
  return `<p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
    <span style="color: #94a3b8;">${label}:</span> <strong>${value}</strong>
  </p>`;
}

/**
 * Admin notification: a new user account has been created.
 */
export async function sendAdminNewUserEmail(
  userEmail: string,
): Promise<boolean> {
  const safeEmail = escapeHtml(userEmail);
  return sendAdminNotification(
    `Nueva cuenta registrada: ${userEmail}`,
    `
      <h1 style="color: #1E3A5F; font-size: 22px; margin: 0 0 16px;">
        Nueva cuenta registrada
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Un nuevo usuario se ha registrado en InmoCapt.
      </p>
      ${detailRow("Email", safeEmail)}
    `,
    `Nueva cuenta registrada en InmoCapt: ${userEmail}`,
  );
}

/**
 * Admin notification: a user has requested a new list.
 */
export async function sendAdminListRequestEmail(
  userEmail: string | null,
  location: string,
  notes?: string | null,
): Promise<boolean> {
  const safeEmail = escapeHtml(userEmail || "desconocido");
  const safeLocation = escapeHtml(location);
  const safeNotes = notes ? escapeHtml(notes) : null;

  return sendAdminNotification(
    `Nueva solicitud de lista: ${location}`,
    `
      <h1 style="color: #1E3A5F; font-size: 22px; margin: 0 0 16px;">
        Nueva solicitud de lista
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Un usuario ha solicitado una nueva lista.
      </p>
      ${detailRow("Usuario", safeEmail)}
      ${detailRow("Ubicación", safeLocation)}
      ${safeNotes ? detailRow("Notas", safeNotes) : ""}
      ${primaryButton("Revisar solicitudes", `${env.FRONTEND_URL}/app/admin/requests`)}
    `,
    `Nueva solicitud de lista en ${location} de ${userEmail || "usuario desconocido"}.${
      notes ? ` Notas: ${notes}` : ""
    }`,
  );
}

/**
 * Admin notification: a user has completed a payment (plan or credit pack).
 */
export async function sendAdminPaymentEmail(params: {
  userEmail: string | null;
  kind: "plan" | "credits";
  description: string;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<boolean> {
  const { userEmail, kind, description, amountCents, currency } = params;
  const safeEmail = escapeHtml(userEmail || "desconocido");
  const safeDescription = escapeHtml(description);
  const kindLabel = kind === "plan" ? "Suscripción a plan" : "Compra de créditos";
  const amount = formatCents(amountCents, currency);

  return sendAdminNotification(
    `Nuevo pago (${kindLabel}): ${amount}`,
    `
      <h1 style="color: #1E3A5F; font-size: 22px; margin: 0 0 16px;">
        Nuevo pago recibido
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Se ha completado un pago en InmoCapt.
      </p>
      ${detailRow("Tipo", kindLabel)}
      ${detailRow("Detalle", safeDescription)}
      ${detailRow("Importe", amount)}
      ${detailRow("Usuario", safeEmail)}
    `,
    `Nuevo pago en InmoCapt (${kindLabel}): ${description}, importe ${amount}, usuario ${
      userEmail || "desconocido"
    }.`,
  );
}

// ─── Bulk Notification Helper ─────────────────────────────────────

/**
 * Send list updated email to all subscribers who have notifications enabled.
 * Sends emails in parallel but doesn't fail if individual emails fail.
 */
export async function notifyListSubscribers(
  subscribers: Array<{ email: string }>,
  listName: string,
  newPropertiesCount: number,
  listId: string,
): Promise<{ sent: number; failed: number }> {
  if (subscribers.length === 0 || newPropertiesCount === 0) {
    return { sent: 0, failed: 0 };
  }

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const ok = await sendListUpdatedEmail(
        sub.email,
        listName,
        newPropertiesCount,
        listId,
      );
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
    // Resend rate limit: 2 req/s
    await delay(600);
  }

  console.log(
    `[Email] List update notifications for "${listName}": ${sent} sent, ${failed} failed`,
  );

  return { sent, failed };
}
