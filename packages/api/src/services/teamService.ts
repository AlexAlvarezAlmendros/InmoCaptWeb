import type { InStatement } from "@libsql/client";
import { db } from "../config/database.js";
import { sendRemovedFromTeamEmail } from "./emailService.js";

/**
 * Teams: every member works on the owner's lists (user_list_access and
 * pending_list_changes of the owner), sees the contacts revealed by any member
 * and shares property state/notes (team_property_state). Credits stay per user.
 *
 * This module must not import planService (planService depends on it), so the
 * caller passes the user's plan where a check needs it.
 */

export const TEAM_MAX_MEMBERS = 5;

export interface TeamContext {
  teamId: string;
  ownerId: string;
  planId: string;
  memberIds: string[];
}

export interface PlanSnapshot {
  id: string;
  isActive: boolean;
}

export interface TeamMemberView {
  userId: string;
  email: string;
  isOwner: boolean;
  joinedAt: string;
}

export interface TeamInvitationView {
  id: string;
  email: string;
  createdAt: string;
}

export interface TeamView {
  id: string;
  planId: string;
  planName: string;
  ownerId: string;
  ownerEmail: string;
  isOwner: boolean;
  maxMembers: number;
  members: TeamMemberView[];
  pendingInvitations: TeamInvitationView[];
}

export interface IncomingInvitation {
  id: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  createdAt: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================
// Lookups used by the rest of the services
// ============================================

export async function getTeamContext(
  userId: string,
): Promise<TeamContext | null> {
  const result = await db.execute({
    sql: `
      SELECT t.id AS team_id, t.owner_id, t.plan_id, m2.user_id AS member_id
      FROM team_members m
      JOIN teams t ON t.id = m.team_id
      JOIN team_members m2 ON m2.team_id = t.id
      WHERE m.user_id = ?
      ORDER BY m2.joined_at ASC
    `,
    args: [userId],
  });
  if (result.rows.length === 0) return null;

  const first = result.rows[0] as unknown as {
    team_id: string;
    owner_id: string;
    plan_id: string;
  };
  return {
    teamId: first.team_id,
    ownerId: first.owner_id,
    planId: first.plan_id,
    memberIds: result.rows.map(
      (r) => (r as unknown as { member_id: string }).member_id,
    ),
  };
}

/**
 * Whose list selection (user_list_access / pending_list_changes) applies to
 * this user: the team owner's while in a team, their own otherwise.
 */
export async function getListOwnerId(userId: string): Promise<string> {
  const ctx = await getTeamContext(userId);
  return ctx?.ownerId ?? userId;
}

/** Only the team owner (or a user without a team) can change the lists. */
export async function canManageLists(userId: string): Promise<boolean> {
  const ctx = await getTeamContext(userId);
  return !ctx || ctx.ownerId === userId;
}

/** Users whose contact reveals this user can see: the whole team, or just themselves. */
export async function getRevealSharingUserIds(
  userId: string,
): Promise<string[]> {
  const ctx = await getTeamContext(userId);
  return ctx?.memberIds ?? [userId];
}

// ============================================
// Views
// ============================================

export async function getTeamView(userId: string): Promise<TeamView | null> {
  const ctx = await getTeamContext(userId);
  if (!ctx) return null;

  const [membersResult, invitationsResult, planResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT m.user_id, u.email, m.joined_at
        FROM team_members m
        JOIN users u ON u.id = m.user_id
        WHERE m.team_id = ?
        ORDER BY m.joined_at ASC
      `,
      args: [ctx.teamId],
    }),
    db.execute({
      sql: `
        SELECT id, email, created_at FROM team_invitations
        WHERE team_id = ? AND status = 'pending'
        ORDER BY created_at ASC
      `,
      args: [ctx.teamId],
    }),
    db.execute({
      sql: "SELECT name FROM plans WHERE id = ?",
      args: [ctx.planId],
    }),
  ]);

  const members = membersResult.rows.map((r) => {
    const row = r as unknown as {
      user_id: string;
      email: string;
      joined_at: string;
    };
    return {
      userId: row.user_id,
      email: row.email,
      isOwner: row.user_id === ctx.ownerId,
      joinedAt: row.joined_at,
    };
  });

  const isOwner = ctx.ownerId === userId;

  return {
    id: ctx.teamId,
    planId: ctx.planId,
    planName:
      (planResult.rows[0] as unknown as { name: string } | undefined)?.name ??
      ctx.planId,
    ownerId: ctx.ownerId,
    ownerEmail: members.find((m) => m.isOwner)?.email ?? "",
    isOwner,
    maxMembers: TEAM_MAX_MEMBERS,
    members,
    // Only the owner manages invitations
    pendingInvitations: isOwner
      ? invitationsResult.rows.map((r) => {
          const row = r as unknown as {
            id: string;
            email: string;
            created_at: string;
          };
          return { id: row.id, email: row.email, createdAt: row.created_at };
        })
      : [],
  };
}

export async function getIncomingInvitations(
  email: string,
): Promise<IncomingInvitation[]> {
  if (!email) return [];
  const result = await db.execute({
    sql: `
      SELECT i.id, i.created_at, t.plan_id, p.name AS plan_name, u.email AS owner_email
      FROM team_invitations i
      JOIN teams t ON t.id = i.team_id
      JOIN plans p ON p.id = t.plan_id
      JOIN users u ON u.id = t.owner_id
      WHERE i.email = ? AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `,
    args: [normalizeEmail(email)],
  });
  return result.rows.map((r) => {
    const row = r as unknown as {
      id: string;
      created_at: string;
      plan_id: string;
      plan_name: string;
      owner_email: string;
    };
    return {
      id: row.id,
      ownerEmail: row.owner_email,
      planId: row.plan_id,
      planName: row.plan_name,
      createdAt: row.created_at,
    };
  });
}

// ============================================
// State copies between a member and the team
// ============================================

// Both copies skip rows of deleted properties: production may hold orphans
// from times when foreign keys were not enforced, and one would fail the batch.

/**
 * Bring a user's personal state/notes into the team. What the team already
 * has wins, except that it never loses a note or a non-"new" state.
 */
function mergePersonalStateIntoTeam(
  teamId: string,
  userId: string,
): InStatement {
  return {
    sql: `
      INSERT INTO team_property_state (team_id, property_id, state, comment, updated_by, updated_at)
      SELECT ?, property_id, state, comment, user_id, updated_at
      FROM property_agent_state
      WHERE user_id = ?
        AND property_id IN (SELECT id FROM properties)
      ON CONFLICT (team_id, property_id) DO UPDATE SET
        state = CASE
          WHEN team_property_state.state = 'new' THEN excluded.state
          ELSE team_property_state.state
        END,
        comment = COALESCE(NULLIF(team_property_state.comment, ''), excluded.comment)
    `,
    args: [teamId, userId],
  };
}

/** Leave the member a personal copy of the team's state/notes. */
function copyTeamStateToPersonal(teamId: string, userId: string): InStatement {
  return {
    sql: `
      INSERT INTO property_agent_state (user_id, property_id, state, comment, updated_at)
      SELECT ?, property_id, state, comment, updated_at
      FROM team_property_state
      WHERE team_id = ?
        AND property_id IN (SELECT id FROM properties)
      ON CONFLICT (user_id, property_id) DO UPDATE SET
        state = excluded.state,
        comment = excluded.comment,
        updated_at = excluded.updated_at
    `,
    args: [userId, teamId],
  };
}

// ============================================
// Membership changes
// ============================================

async function getUserEmails(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const placeholders = userIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT id, email FROM users WHERE id IN (${placeholders})`,
    args: userIds,
  });
  return new Map(
    result.rows.map((r) => {
      const row = r as unknown as { id: string; email: string };
      return [row.id, row.email];
    }),
  );
}

function notifyRemoved(email: string | undefined, ownerEmail: string): void {
  if (!email) return;
  sendRemovedFromTeamEmail(email, ownerEmail).catch((err) =>
    console.warn("[Email] Failed to send removed-from-team email:", err),
  );
}

async function createTeam(ownerId: string, planId: string): Promise<string> {
  const teamId = crypto.randomUUID();
  await db.batch(
    [
      {
        sql: "INSERT INTO teams (id, owner_id, plan_id) VALUES (?, ?, ?)",
        args: [teamId, ownerId, planId],
      },
      {
        // OR REPLACE: a row left behind by a team deleted concurrently would
        // otherwise lock the user out (team_members.user_id is the key)
        sql: "INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)",
        args: [ownerId, teamId],
      },
      mergePersonalStateIntoTeam(teamId, ownerId),
    ],
    "write",
  );
  return teamId;
}

async function detachMember(teamId: string, userId: string): Promise<void> {
  await db.batch(
    [
      copyTeamStateToPersonal(teamId, userId),
      {
        sql: "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
        args: [teamId, userId],
      },
    ],
    "write",
  );
}

/**
 * Dissolve a team: every member gets a copy of the shared state/notes and
 * goes back to their own lists. Members other than the owner get an email.
 */
async function dissolveTeam(ctx: TeamContext): Promise<void> {
  await db.batch(
    [
      ...ctx.memberIds.map((memberId) =>
        copyTeamStateToPersonal(ctx.teamId, memberId),
      ),
      {
        sql: "DELETE FROM team_property_state WHERE team_id = ?",
        args: [ctx.teamId],
      },
      {
        sql: "DELETE FROM team_invitations WHERE team_id = ?",
        args: [ctx.teamId],
      },
      {
        sql: "DELETE FROM team_members WHERE team_id = ?",
        args: [ctx.teamId],
      },
      { sql: "DELETE FROM teams WHERE id = ?", args: [ctx.teamId] },
    ],
    "write",
  );

  const others = ctx.memberIds.filter((id) => id !== ctx.ownerId);
  if (others.length > 0) {
    const emails = await getUserEmails([ctx.ownerId, ...others]);
    const ownerEmail = emails.get(ctx.ownerId) ?? "";
    for (const memberId of others) {
      notifyRemoved(emails.get(memberId), ownerEmail);
    }
  }
}

export type InviteResult =
  | { ok: true; invitationId: string; email: string; planId: string }
  | {
      ok: false;
      reason:
        | "plan_required"
        | "not_owner"
        | "self_invite"
        | "already_member"
        | "already_invited"
        | "team_full";
    };

/**
 * Invite someone by email. Creates the team (with the inviter as owner) on the
 * first invitation. The invitee does not need an account yet.
 */
export async function inviteToTeam(params: {
  inviterId: string;
  inviterEmail: string;
  email: string;
  plan: PlanSnapshot | null;
}): Promise<InviteResult> {
  const { inviterId, plan } = params;
  const email = normalizeEmail(params.email);

  if (!plan || !plan.isActive || plan.id === "trial") {
    return { ok: false, reason: "plan_required" };
  }
  if (email === normalizeEmail(params.inviterEmail)) {
    return { ok: false, reason: "self_invite" };
  }

  let ctx = await getTeamContext(inviterId);
  if (ctx && ctx.ownerId !== inviterId) {
    return { ok: false, reason: "not_owner" };
  }

  if (ctx) {
    const emails = await getUserEmails(ctx.memberIds);
    if ([...emails.values()].some((e) => normalizeEmail(e) === email)) {
      return { ok: false, reason: "already_member" };
    }

    const pending = await db.execute({
      sql: "SELECT email FROM team_invitations WHERE team_id = ? AND status = 'pending'",
      args: [ctx.teamId],
    });
    const pendingEmails = pending.rows.map(
      (r) => (r as unknown as { email: string }).email,
    );
    if (pendingEmails.includes(email)) {
      return { ok: false, reason: "already_invited" };
    }
    if (ctx.memberIds.length + pendingEmails.length >= TEAM_MAX_MEMBERS) {
      return { ok: false, reason: "team_full" };
    }
  } else {
    const teamId = await createTeam(inviterId, plan.id);
    ctx = {
      teamId,
      ownerId: inviterId,
      planId: plan.id,
      memberIds: [inviterId],
    };
  }

  const invitationId = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO team_invitations (id, team_id, email, invited_by)
      VALUES (?, ?, ?, ?)
    `,
    args: [invitationId, ctx.teamId, email, inviterId],
  });

  return { ok: true, invitationId, email, planId: ctx.planId };
}

export type AcceptResult =
  | { ok: true; teamId: string }
  | {
      ok: false;
      reason: "not_found" | "already_in_team" | "plan_mismatch" | "team_full";
      requiredPlanId?: string;
    };

export async function acceptInvitation(params: {
  userId: string;
  userEmail: string;
  invitationId: string;
  plan: PlanSnapshot | null;
}): Promise<AcceptResult> {
  const { userId, invitationId, plan } = params;
  const email = normalizeEmail(params.userEmail);

  const invitationResult = await db.execute({
    sql: `
      SELECT i.team_id, t.plan_id
      FROM team_invitations i
      JOIN teams t ON t.id = i.team_id
      WHERE i.id = ? AND i.email = ? AND i.status = 'pending'
    `,
    args: [invitationId, email],
  });
  if (invitationResult.rows.length === 0) {
    return { ok: false, reason: "not_found" };
  }
  const invitation = invitationResult.rows[0] as unknown as {
    team_id: string;
    plan_id: string;
  };

  const current = await getTeamContext(userId);
  if (current && current.memberIds.length > 1) {
    return { ok: false, reason: "already_in_team" };
  }

  if (!plan || !plan.isActive || plan.id !== invitation.plan_id) {
    return {
      ok: false,
      reason: "plan_mismatch",
      requiredPlanId: invitation.plan_id,
    };
  }

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) AS count FROM team_members WHERE team_id = ?",
    args: [invitation.team_id],
  });
  if (Number(countResult.rows[0].count) >= TEAM_MAX_MEMBERS) {
    return { ok: false, reason: "team_full" };
  }

  // A team where the user is alone (they invited people who never joined)
  // is dropped so they can join this one.
  if (current) {
    await dissolveTeam(current);
  }

  await db.batch(
    [
      {
        sql: "INSERT OR REPLACE INTO team_members (user_id, team_id) VALUES (?, ?)",
        args: [userId, invitation.team_id],
      },
      mergePersonalStateIntoTeam(invitation.team_id, userId),
      {
        sql: `
          UPDATE team_invitations
          SET status = 'accepted', responded_at = datetime('now')
          WHERE id = ?
        `,
        args: [invitationId],
      },
      // Other open invitations for this email no longer apply
      {
        sql: `
          UPDATE team_invitations
          SET status = 'declined', responded_at = datetime('now')
          WHERE email = ? AND status = 'pending' AND id != ?
        `,
        args: [email, invitationId],
      },
    ],
    "write",
  );

  return { ok: true, teamId: invitation.team_id };
}

export async function declineInvitation(params: {
  userEmail: string;
  invitationId: string;
}): Promise<boolean> {
  const result = await db.execute({
    sql: `
      UPDATE team_invitations
      SET status = 'declined', responded_at = datetime('now')
      WHERE id = ? AND email = ? AND status = 'pending'
    `,
    args: [params.invitationId, normalizeEmail(params.userEmail)],
  });
  return result.rowsAffected > 0;
}

export async function cancelInvitation(params: {
  ownerId: string;
  invitationId: string;
}): Promise<boolean> {
  const result = await db.execute({
    sql: `
      UPDATE team_invitations
      SET status = 'canceled', responded_at = datetime('now')
      WHERE id = ? AND status = 'pending'
        AND team_id IN (SELECT id FROM teams WHERE owner_id = ?)
    `,
    args: [params.invitationId, params.ownerId],
  });
  return result.rowsAffected > 0;
}

export async function removeMember(params: {
  ownerId: string;
  memberId: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_owner" | "not_member" }> {
  const { ownerId, memberId } = params;
  const ctx = await getTeamContext(ownerId);
  if (!ctx || ctx.ownerId !== ownerId)
    return { ok: false, reason: "not_owner" };
  if (memberId === ownerId || !ctx.memberIds.includes(memberId)) {
    return { ok: false, reason: "not_member" };
  }

  await detachMember(ctx.teamId, memberId);

  const emails = await getUserEmails([ownerId, memberId]);
  notifyRemoved(emails.get(memberId), emails.get(ownerId) ?? "");
  return { ok: true };
}

/**
 * Leave the user's team. When the owner leaves, the team is dissolved.
 * Returns what happened (null if the user had no team).
 */
export async function leaveTeam(
  userId: string,
): Promise<"left" | "dissolved" | null> {
  const ctx = await getTeamContext(userId);
  if (!ctx) return null;

  if (ctx.ownerId === userId) {
    await dissolveTeam(ctx);
    return "dissolved";
  }

  await detachMember(ctx.teamId, userId);
  return "left";
}

/**
 * Every member must stay on the team's plan. Called whenever a user's plan
 * row changes: a member who moves to another plan leaves the team; if it is
 * the owner, the team is dissolved (an owner alone just carries the team over).
 */
export async function enforceTeamPlan(
  userId: string,
  newPlanId: string,
): Promise<void> {
  const ctx = await getTeamContext(userId);
  if (!ctx || ctx.planId === newPlanId) return;

  if (ctx.ownerId === userId && ctx.memberIds.length === 1) {
    await db.execute({
      sql: "UPDATE teams SET plan_id = ? WHERE id = ?",
      args: [newPlanId, ctx.teamId],
    });
    return;
  }

  const outcome = await leaveTeam(userId);
  console.log(
    `[Teams] user=${userId} moved to plan=${newPlanId}: ${outcome} team=${ctx.teamId}`,
  );
}
