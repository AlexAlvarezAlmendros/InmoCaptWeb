import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
} from "@/components/ui";
import { useUserPlan } from "@/hooks/usePlan";
import {
  useTeam,
  useInviteToTeam,
  useCancelTeamInvitation,
  useAcceptTeamInvitation,
  useDeclineTeamInvitation,
  useRemoveTeamMember,
  useLeaveTeam,
} from "@/hooks/useTeam";
import { track } from "@/lib/analytics";
import type { IncomingTeamInvitation, Team, TeamMember } from "@/types";

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { message?: string };
  return e?.message || fallback;
}

const TEAM_RULES = [
  "Las listas del equipo son las de la persona responsable, y solo ella puede cambiarlas.",
  "Todos ven los contactos que desbloquea cualquier miembro, sin gastar créditos de nuevo.",
  "El estado y las notas de cada inmueble son comunes a todo el equipo.",
  "Cada persona tiene sus propios créditos.",
  "Todos los miembros deben tener el mismo plan. Quien cambie de plan sale del equipo (si es la persona responsable, el equipo se disuelve).",
  "Al salir, cada persona conserva los contactos que desbloqueó con sus créditos y una copia de las notas.",
];

function InvitationCard({
  invitation,
  inTeamWithOthers,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: {
  invitation: IncomingTeamInvitation;
  inTeamWithOthers: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-light p-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 dark:text-white">
          <span className="break-all">{invitation.ownerEmail}</span> te invita a
          su equipo
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Plan del equipo: {invitation.planName}
        </p>
        {inTeamWithOthers ? (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Ya estás en un equipo. Sal de él para poder aceptar.
          </p>
        ) : (
          !invitation.planMatches && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Para unirte necesitas tener activo el plan {invitation.planName}.
            </p>
          )
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDecline}
          isLoading={isDeclining}
          disabled={isDeclining || isAccepting}
        >
          Rechazar
        </Button>
        {!invitation.planMatches && !inTeamWithOthers ? (
          <Button size="sm" onClick={() => navigate("/app/plans")}>
            Ver planes
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onAccept}
            isLoading={isAccepting}
            disabled={inTeamWithOthers || isAccepting || isDeclining}
          >
            Aceptar
          </Button>
        )}
      </div>
    </div>
  );
}

function InviteForm({
  onInvite,
  isLoading,
}: {
  onInvite: (email: string) => Promise<boolean>;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    if (await onInvite(value)) setEmail("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        placeholder="email@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="sm:flex-1"
        required
      />
      <Button type="submit" isLoading={isLoading} disabled={isLoading}>
        Invitar
      </Button>
    </form>
  );
}

function MemberRow({
  member,
  isMe,
  canRemove,
  onRemove,
}: {
  member: TeamMember;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm text-slate-900 dark:text-white">
          {member.email}
        </span>
        {member.isOwner && <Badge variant="info">Responsable</Badge>}
        {isMe && <Badge>Tú</Badge>}
      </div>
      {canRemove && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Quitar
        </Button>
      )}
    </li>
  );
}

export function TeamPage() {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const { data, isLoading } = useTeam();
  const { data: userPlan, isLoading: isLoadingPlan } = useUserPlan();

  const invite = useInviteToTeam();
  const cancelInvitation = useCancelTeamInvitation();
  const acceptInvitation = useAcceptTeamInvitation();
  const declineInvitation = useDeclineTeamInvitation();
  const removeMember = useRemoveTeamMember();
  const leaveTeam = useLeaveTeam();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  if (isLoading || isLoadingPlan) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const team: Team | null = data?.team ?? null;
  const invitations = data?.invitations ?? [];
  const inTeamWithOthers = !!team && team.members.length > 1;
  const canCreateTeam =
    !!userPlan && userPlan.isActive && userPlan.planId !== "trial";

  const handleInvite = async (email: string): Promise<boolean> => {
    setError(null);
    setNotice(null);
    try {
      await invite.mutateAsync(email);
      track("team_invite_send", {
        plan: userPlan?.planId,
        members: team?.members.length ?? 1,
      });
      setNotice(`Invitación enviada a ${email}.`);
      return true;
    } catch (err) {
      const message = errorMessage(err, "No se pudo enviar la invitación");
      track("team_invite_error", { reason: message });
      setError(message);
      return false;
    }
  };

  const handleAccept = async (invitation: IncomingTeamInvitation) => {
    setError(null);
    setNotice(null);
    try {
      await acceptInvitation.mutateAsync(invitation.id);
      track("team_invite_accept", { plan: invitation.planId });
      setNotice(`Ya formas parte del equipo de ${invitation.ownerEmail}.`);
    } catch (err) {
      setError(errorMessage(err, "No se pudo aceptar la invitación"));
    }
  };

  const handleDecline = async (invitation: IncomingTeamInvitation) => {
    setError(null);
    try {
      await declineInvitation.mutateAsync(invitation.id);
      track("team_invite_decline", { plan: invitation.planId });
    } catch (err) {
      setError(errorMessage(err, "No se pudo rechazar la invitación"));
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setError(null);
    try {
      await cancelInvitation.mutateAsync(invitationId);
      track("team_invite_cancel");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cancelar la invitación"));
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setError(null);
    try {
      await removeMember.mutateAsync(memberToRemove.userId);
      track("team_member_remove", {
        members: (team?.members.length ?? 1) - 1,
      });
      setMemberToRemove(null);
    } catch (err) {
      setMemberToRemove(null);
      setError(errorMessage(err, "No se pudo quitar a esa persona"));
    }
  };

  const handleLeave = async () => {
    setError(null);
    try {
      const result = await leaveTeam.mutateAsync();
      track("team_leave", { role: team?.isOwner ? "owner" : "member" });
      setShowLeaveConfirm(false);
      setNotice(
        result.outcome === "dissolved"
          ? "Has disuelto el equipo. Cada persona vuelve a sus propias listas."
          : "Has salido del equipo. Vuelves a trabajar con tus propias listas.",
      );
    } catch (err) {
      setShowLeaveConfirm(false);
      setError(errorMessage(err, "No se pudo salir del equipo"));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Equipo
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Comparte listas, contactos desbloqueados y notas. Cada persona usa sus
          propios créditos.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {notice}
        </div>
      )}

      {/* Invitations received */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  inTeamWithOthers={inTeamWithOthers}
                  onAccept={() => handleAccept(invitation)}
                  onDecline={() => handleDecline(invitation)}
                  isAccepting={
                    acceptInvitation.isPending &&
                    acceptInvitation.variables === invitation.id
                  }
                  isDeclining={
                    declineInvitation.isPending &&
                    declineInvitation.variables === invitation.id
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My team */}
      {team ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                {team.isOwner ? "Tu equipo" : `Equipo de ${team.ownerEmail}`}
              </CardTitle>
              <span className="text-sm text-slate-500">
                Plan {team.planName} · {team.members.length} de{" "}
                {team.maxMembers} personas
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {team.members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  isMe={member.userId === user?.sub}
                  canRemove={team.isOwner && !member.isOwner}
                  onRemove={() => setMemberToRemove(member)}
                />
              ))}
            </ul>

            {team.isOwner && team.pendingInvitations.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Invitaciones pendientes
                </p>
                <ul className="divide-y divide-border-light dark:divide-border-dark">
                  {team.pendingInvitations.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                        {invitation.email}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        isLoading={
                          cancelInvitation.isPending &&
                          cancelInvitation.variables === invitation.id
                        }
                      >
                        Cancelar
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {team.isOwner && (
              <div className="mt-6 border-t border-border-light pt-6 dark:border-border-dark">
                {team.members.length + team.pendingInvitations.length <
                team.maxMembers ? (
                  <>
                    <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                      Invita a alguien por email. Necesitará el plan{" "}
                      {team.planName} activo para unirse.
                    </p>
                    <InviteForm
                      onInvite={handleInvite}
                      isLoading={invite.isPending}
                    />
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    El equipo está completo ({team.maxMembers} personas contando
                    las invitaciones pendientes).
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowLeaveConfirm(true)}
              >
                {team.isOwner ? "Disolver equipo" : "Salir del equipo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Crea tu equipo</CardTitle>
          </CardHeader>
          <CardContent>
            {canCreateTeam ? (
              <>
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                  Invita a otra persona con el plan {userPlan?.planName}. Tus
                  listas pasarán a ser las del equipo.
                </p>
                <InviteForm
                  onInvite={handleInvite}
                  isLoading={invite.isPending}
                />
              </>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Los equipos están disponibles en los planes de pago.
                </p>
                <Button onClick={() => navigate("/app/plans")}>
                  Ver planes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
            {TEAM_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemove}
        title="Quitar del equipo"
        message={`${memberToRemove?.email ?? ""} dejará de ver las listas, los contactos y las notas del equipo. Conservará los contactos que desbloqueó y una copia de las notas.`}
        confirmText="Quitar"
        variant="danger"
        isLoading={removeMember.isPending}
      />

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title={team?.isOwner ? "Disolver equipo" : "Salir del equipo"}
        message={
          team?.isOwner
            ? "Todos los miembros saldrán del equipo y volverán a sus propias listas. Cada persona conserva los contactos que desbloqueó y una copia de las notas."
            : "Volverás a tus propias listas. Conservas los contactos que desbloqueaste y una copia de las notas, pero dejarás de ver los contactos que desbloquearon los demás."
        }
        confirmText={team?.isOwner ? "Disolver" : "Salir"}
        variant="danger"
        isLoading={leaveTeam.isPending}
      />
    </div>
  );
}
