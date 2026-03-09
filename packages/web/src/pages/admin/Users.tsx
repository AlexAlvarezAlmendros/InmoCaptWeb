import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  useAdminUsers,
  useAdminUser,
  useToggleTestUser,
} from "@/hooks/useAdminUsers";
import type {
  AdminUser,
  AdminUserSubscription,
  SubscriptionStatus,
} from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const subscriptionStatusConfig: Record<
  SubscriptionStatus,
  { label: string; variant: "success" | "warning" | "error" }
> = {
  active: { label: "Activa", variant: "success" },
  past_due: { label: "Pago pendiente", variant: "warning" },
  canceled: { label: "Cancelada", variant: "error" },
};

function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const { label, variant } = subscriptionStatusConfig[status] ?? {
    label: status,
    variant: "error" as const,
  };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Detail modal ────────────────────────────────────────────────────────────

function UserDetailModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { data: user, isLoading } = useAdminUser(userId);

  return (
    <Modal isOpen onClose={onClose} title="Detalle de usuario" size="2xl">
      {isLoading || !user ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* User info */}
          <div className="rounded-lg border border-border-light bg-slate-50 p-4 dark:border-border-dark dark:bg-slate-900/50">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Email
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Registrado
                </dt>
                <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Última conexión
                </dt>
                <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                  {user.lastLogin ? formatDate(user.lastLogin) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Notif. email
                </dt>
                <dd className="mt-0.5">
                  <Badge
                    variant={user.emailNotificationsOn ? "success" : "default"}
                  >
                    {user.emailNotificationsOn ? "Activadas" : "Desactivadas"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Gasto mensual activo
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {formatPrice(user.estimatedMonthlySpendCents)}/mes
                </dd>
              </div>
              {user.stripeCustomerId && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Stripe ID
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-500">
                    {user.stripeCustomerId}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Subscriptions table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Suscripciones ({user.subscriptions.length})
            </h3>

            {user.subscriptions.length === 0 ? (
              <p className="text-sm text-slate-500">
                Este usuario no tiene suscripciones.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Lista
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Precio
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Renovación
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        Inicio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {user.subscriptions.map((sub: AdminUserSubscription) => (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {sub.listName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {sub.listLocation}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <SubscriptionStatusBadge
                            status={sub.status as SubscriptionStatus}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {formatPrice(sub.priceCents, sub.currency)}/mes
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {sub.currentPeriodEnd
                            ? formatDate(sub.currentPeriodEnd)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {formatDate(sub.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const toggleTestUser = useToggleTestUser();

  const realUsers = users?.filter((u: AdminUser) => !u.isTestUser) ?? [];
  const testUsers = users?.filter((u: AdminUser) => u.isTestUser) ?? [];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar los usuarios: {error.message}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Usuarios
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {users?.length ?? 0} usuario
            {users?.length !== 1 ? "s" : ""} registrado
            {users?.length !== 1 ? "s" : ""}
            {testUsers.length > 0 && (
              <span className="ml-2 text-xs text-slate-400">
                ({testUsers.length} de prueba excluido
                {testUsers.length !== 1 ? "s" : ""} de métricas)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats summary */}
      {users && users.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total usuarios",
              value: users.length,
              color: "text-slate-900 dark:text-white",
            },
            {
              label: "Con suscripción activa",
              value: realUsers.filter(
                (u: AdminUser) => u.activeSubscriptionCount > 0,
              ).length,
              color: "text-accent",
            },
            {
              label: "Ingresos mensuales est.",
              value: formatPrice(
                realUsers.reduce(
                  (acc: number, u: AdminUser) =>
                    acc + u.estimatedMonthlySpendCents,
                  0,
                ),
              ),
              color: "text-primary",
            },
            {
              label: "Total suscripciones",
              value: realUsers.reduce(
                (acc: number, u: AdminUser) => acc + u.totalSubscriptionCount,
                0,
              ),
              color: "text-slate-700 dark:text-slate-300",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border-light bg-card-light p-4 dark:border-border-dark dark:bg-card-dark"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className={`mt-1 text-xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {users && users.length === 0 && (
        <div className="rounded-lg border border-border-light bg-card-light p-12 text-center dark:border-border-dark dark:bg-card-dark">
          <div className="text-4xl">👥</div>
          <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No hay usuarios
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Todavía no se ha registrado ningún usuario.
          </p>
        </div>
      )}

      {/* Users table */}
      {users && users.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Registro
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Última conexión
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Subs. activas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Total subs.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Gasto mensual
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Notif.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {users.map((user: AdminUser) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                  >
                    {/* Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {user.email}
                        </span>
                        {user.isTestUser && (
                          <Badge variant="warning">Test</Badge>
                        )}
                      </div>
                      {user.stripeCustomerId && (
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          {user.stripeCustomerId}
                        </div>
                      )}
                    </td>

                    {/* Registered */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Last login */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {user.lastLogin ? (
                        formatDate(user.lastLogin)
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">
                          Nunca
                        </span>
                      )}
                    </td>

                    {/* Active subscriptions */}
                    <td className="px-4 py-3 text-center">
                      {user.activeSubscriptionCount > 0 ? (
                        <Badge variant="success">
                          {user.activeSubscriptionCount}
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">0</span>
                      )}
                    </td>

                    {/* Total subscriptions */}
                    <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                      {user.totalSubscriptionCount}
                    </td>

                    {/* Monthly spend */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      {user.estimatedMonthlySpendCents > 0 ? (
                        <>
                          {formatPrice(user.estimatedMonthlySpendCents)}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            /mes
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Notifications */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          user.emailNotificationsOn ? "success" : "default"
                        }
                      >
                        {user.emailNotificationsOn ? "ON" : "OFF"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleTestUser.mutate({
                              userId: user.id,
                              isTestUser: !user.isTestUser,
                            })
                          }
                          disabled={toggleTestUser.isPending}
                          className={
                            user.isTestUser
                              ? "text-amber-600 hover:text-amber-700"
                              : "text-slate-500"
                          }
                        >
                          {user.isTestUser ? "Quitar test" : "Marcar test"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          Ver detalle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User detail modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
