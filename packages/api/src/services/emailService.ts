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
      InmoCapt &mdash; Listados FSBO para agentes inmobiliarios
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

  return sendEmail({
    to,
    subject: `Suscripción activada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        ¡Suscripción activada!
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu suscripción a <strong>${listName}</strong> está activa. Ya puedes acceder a todos los inmuebles de la lista.
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
  return sendEmail({
    to,
    subject: `Suscripción cancelada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Suscripción cancelada
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
        Tu suscripción a <strong>${listName}</strong> ha sido cancelada. Ya no tendrás acceso a los inmuebles de esta lista.
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

  return sendEmail({
    to,
    subject: `${listName} — ${newPropertiesCount} nuevos inmuebles`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Nueva actualización disponible
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        La lista <strong>${listName}</strong> tiene 
        <strong style="color: #10B981;">${newPropertiesCount} nuevos inmuebles</strong> 
        disponibles para ti.
      </p>
      ${primaryButton("Ver inmuebles", listUrl)}
    `),
    text: `La lista ${listName} tiene ${newPropertiesCount} nuevos inmuebles. Ver: ${listUrl}`,
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
  return sendEmail({
    to,
    subject: `Tu solicitud de lista ha sido aprobada: ${listName}`,
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        ¡Solicitud aprobada!
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Tu solicitud de una lista para <strong>${location}</strong> ha sido aprobada. 
        La lista <strong>${listName}</strong> ya está disponible.
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
  return sendEmail({
    to,
    subject: "Solicitud de lista no aprobada",
    html: emailLayout(`
      <h1 style="color: #1E3A5F; font-size: 24px; margin: 0 0 16px;">
        Solicitud no aprobada
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Lamentamos informarte de que tu solicitud de una lista para <strong>${location}</strong> 
        no ha podido ser aprobada en este momento.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Si tienes preguntas, no dudes en contactarnos.
      </p>
    `),
    text: `Tu solicitud de lista para ${location} no ha sido aprobada.`,
  });
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

  const results = await Promise.allSettled(
    subscribers.map((sub) =>
      sendListUpdatedEmail(sub.email, listName, newPropertiesCount, listId),
    ),
  );

  let sent = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(
    `[Email] List update notifications for "${listName}": ${sent} sent, ${failed} failed`,
  );

  return { sent, failed };
}
