import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  zodValidate,
  teamInviteSchema,
  teamInvitationIdParamSchema,
  teamMemberParamSchema,
} from "../schemas/validation.js";
import { ensureUserExists } from "../services/userService.js";
import {
  getPlanById,
  getUserPlanWithDefinition,
} from "../services/planService.js";
import {
  TEAM_MAX_MEMBERS,
  getTeamView,
  getIncomingInvitations,
  inviteToTeam,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  removeMember,
  leaveTeam,
  type InviteResult,
  type PlanSnapshot,
} from "../services/teamService.js";
import { sendTeamInvitationEmail } from "../services/emailService.js";

const INVITE_ERRORS: Record<
  Extract<InviteResult, { ok: false }>["reason"],
  string
> = {
  plan_required: "Necesitas un plan de pago activo para crear un equipo",
  not_owner: "Solo quien creó el equipo puede invitar a otras personas",
  self_invite: "No puedes enviarte una invitación a tu propio email",
  already_member: "Esa persona ya está en tu equipo",
  already_invited: "Ya hay una invitación pendiente para ese email",
  team_full: `El equipo admite como máximo ${TEAM_MAX_MEMBERS} personas, contando las invitaciones pendientes`,
};

async function getPlanSnapshot(userId: string): Promise<PlanSnapshot | null> {
  const userPlan = await getUserPlanWithDefinition(userId);
  return userPlan
    ? { id: userPlan.plan.id, isActive: userPlan.isActive }
    : null;
}

export async function teamRoutes(fastify: FastifyInstance) {
  // Current team (if any) + pending invitations addressed to the user
  fastify.get("/", { preHandler: [authenticate] }, async (request, _reply) => {
    const dbUser = await ensureUserExists(request.user);
    const userId = request.user.sub;

    const [team, invitations, plan] = await Promise.all([
      getTeamView(userId),
      getIncomingInvitations(dbUser.email),
      getPlanSnapshot(userId),
    ]);

    return {
      data: {
        team,
        invitations: invitations.map((inv) => ({
          ...inv,
          planMatches: !!plan?.isActive && plan.id === inv.planId,
        })),
      },
    };
  });

  // Invite someone by email (the team is created on the first invitation)
  fastify.post(
    "/invitations",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const bodyResult = zodValidate(teamInviteSchema, request.body);
      if (!bodyResult.success) {
        return reply.code(400).send({ error: bodyResult.error });
      }

      const dbUser = await ensureUserExists(request.user);
      const userId = request.user.sub;

      const result = await inviteToTeam({
        inviterId: userId,
        inviterEmail: dbUser.email,
        email: bodyResult.data.email,
        plan: await getPlanSnapshot(userId),
      });

      if (!result.ok) {
        const code = result.reason === "not_owner" ? 403 : 400;
        return reply.code(code).send({ error: INVITE_ERRORS[result.reason] });
      }

      const plan = await getPlanById(result.planId);
      sendTeamInvitationEmail(
        result.email,
        dbUser.email,
        plan?.name ?? result.planId,
      ).catch((err) =>
        fastify.log.warn({ err }, "Failed to send team invitation email"),
      );

      return { data: { id: result.invitationId, email: result.email } };
    },
  );

  // Owner cancels a pending invitation
  fastify.delete(
    "/invitations/:invitationId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(
        teamInvitationIdParamSchema,
        request.params,
      );
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      const ok = await cancelInvitation({
        ownerId: request.user.sub,
        invitationId: paramsResult.data.invitationId,
      });
      if (!ok)
        return reply.code(404).send({ error: "Invitación no encontrada" });
      return { success: true };
    },
  );

  // Invitee accepts: must be on the team's plan and not in another team
  fastify.post(
    "/invitations/:invitationId/accept",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(
        teamInvitationIdParamSchema,
        request.params,
      );
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      const dbUser = await ensureUserExists(request.user);
      const userId = request.user.sub;

      const result = await acceptInvitation({
        userId,
        userEmail: dbUser.email,
        invitationId: paramsResult.data.invitationId,
        plan: await getPlanSnapshot(userId),
      });

      if (!result.ok) {
        if (result.reason === "not_found") {
          return reply.code(404).send({ error: "Invitación no encontrada" });
        }
        if (result.reason === "already_in_team") {
          return reply.code(400).send({
            error:
              "Ya formas parte de un equipo. Sal de él antes de unirte a otro",
          });
        }
        if (result.reason === "plan_mismatch") {
          const plan = result.requiredPlanId
            ? await getPlanById(result.requiredPlanId)
            : null;
          return reply.code(400).send({
            error: `Para unirte necesitas tener activo el plan ${plan?.name ?? result.requiredPlanId}`,
          });
        }
        return reply.code(400).send({ error: "El equipo ya está completo" });
      }

      fastify.log.info(`User ${userId} joined team ${result.teamId}`);
      return { success: true, teamId: result.teamId };
    },
  );

  // Invitee declines
  fastify.post(
    "/invitations/:invitationId/decline",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(
        teamInvitationIdParamSchema,
        request.params,
      );
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      const dbUser = await ensureUserExists(request.user);
      const ok = await declineInvitation({
        userEmail: dbUser.email,
        invitationId: paramsResult.data.invitationId,
      });
      if (!ok)
        return reply.code(404).send({ error: "Invitación no encontrada" });
      return { success: true };
    },
  );

  // Owner removes a member
  fastify.delete(
    "/members/:userId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const paramsResult = zodValidate(teamMemberParamSchema, request.params);
      if (!paramsResult.success) {
        return reply.code(400).send({ error: paramsResult.error });
      }

      const result = await removeMember({
        ownerId: request.user.sub,
        memberId: paramsResult.data.userId,
      });
      if (!result.ok) {
        if (result.reason === "not_owner") {
          return reply.code(403).send({
            error: "Solo quien creó el equipo puede quitar a otras personas",
          });
        }
        return reply
          .code(404)
          .send({ error: "Esa persona no está en tu equipo" });
      }
      return { success: true };
    },
  );

  // Leave the team (the owner leaving dissolves it)
  fastify.post(
    "/leave",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const outcome = await leaveTeam(request.user.sub);
      if (!outcome) {
        return reply
          .code(400)
          .send({ error: "No formas parte de ningún equipo" });
      }
      return { success: true, outcome };
    },
  );
}
