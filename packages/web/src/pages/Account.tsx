import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Modal,
} from "@/components/ui";
import { useUserProfile, useUpdatePreferences } from "@/hooks/useUserProfile";
import { useCreatePortalSession } from "@/hooks/useBilling";
import { formatDate } from "@/lib/utils";

export function AccountPage() {
  const { user, logout } = useAuth0();
  const { data: profile, isLoading } = useUserProfile();
  const updatePreferences = useUpdatePreferences();
  const createPortalSession = useCreatePortalSession();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  // Detect if user logged in via social provider (Google, etc.)
  // Auth0 sub format: "google-oauth2|123..." for Google, "auth0|123..." for email/password
  const isSocialLogin = user?.sub ? !user.sub.startsWith("auth0|") : false;
  const loginProvider = user?.sub?.split("|")[0] ?? "auth0";
  const providerLabel =
    loginProvider === "google-oauth2" ? "Google" : loginProvider;

  // Sync state with profile data
  useEffect(() => {
    if (profile) {
      setEmailNotifications(profile.emailNotificationsOn);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      setHasChanges(emailNotifications !== profile.emailNotificationsOn);
    }
  }, [emailNotifications, profile]);

  const handleSavePreferences = async () => {
    try {
      await updatePreferences.mutateAsync({
        emailNotificationsOn: emailNotifications,
      });
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  };

  const handleChangePassword = async () => {
    const email = profile?.email || user?.email;
    if (!email) {
      console.error("No email available for password reset");
      return;
    }

    setPasswordResetLoading(true);
    try {
      // Call Auth0's change password endpoint
      const response = await fetch(
        `https://${import.meta.env.VITE_AUTH0_DOMAIN}/dbconnections/change_password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
            email: email,
            connection: "Username-Password-Authentication",
          }),
        },
      );

      if (response.ok) {
        setPasswordResetSent(true);
      } else {
        const error = await response.text();
        console.error("Password reset failed:", error);
      }
    } catch (error) {
      console.error("Failed to send password reset:", error);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      await createPortalSession.mutateAsync();
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    }
  };

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Configuración de Cuenta
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Gestiona tu perfil y preferencias
          </p>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Configuración de Cuenta
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gestiona tu perfil y preferencias
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {(profile?.email || user?.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {user?.name || profile?.email || "Usuario"}
                </p>
                <p className="text-sm text-slate-500">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>
            <div className="border-t border-border-light pt-4 dark:border-border-dark">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {profile?.email || user?.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Miembro desde</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {profile?.createdAt ? formatDate(profile.createdAt) : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones por Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  Actualizaciones de listas
                </span>
                <p className="text-sm text-slate-500">
                  Recibe notificaciones cuando se actualicen tus listas
                  suscritas
                </p>
              </div>
            </label>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleSavePreferences}
              disabled={!hasChanges || updatePreferences.isPending}
            >
              {updatePreferences.isPending ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Guardando...
                </>
              ) : (
                "Guardar preferencias"
              )}
            </Button>
            {updatePreferences.isSuccess && !hasChanges && (
              <span className="text-sm text-green-600 dark:text-green-400">
                ✓ Guardado
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Gestiona tus métodos de pago, ve tu historial de facturas y
            actualiza tu información de facturación.
          </p>
          <Button
            variant="secondary"
            onClick={handleManageBilling}
            disabled={createPortalSession.isPending}
          >
            {createPortalSession.isPending ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Abriendo...
              </>
            ) : (
              "Gestionar facturación"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          {isSocialLogin ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border-light bg-slate-50 px-4 py-3 dark:border-border-dark dark:bg-slate-900/50">
                {loginProvider === "google-oauth2" && (
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Cuenta vinculada con {providerLabel}
                  </p>
                  <p className="text-sm text-slate-500">
                    Tu contraseña se gestiona desde tu cuenta de {providerLabel}
                    . El cambio de contraseña no está disponible para cuentas
                    sociales.
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-slate-600 dark:text-slate-400">
                Te enviaremos un enlace de recuperación a tu email registrado
                para cambiar tu contraseña.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleChangePassword}
                  disabled={passwordResetLoading || passwordResetSent}
                >
                  {passwordResetLoading ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Enviando...
                    </>
                  ) : passwordResetSent ? (
                    "Email enviado"
                  ) : (
                    "Cambiar contraseña"
                  )}
                </Button>
                <Button variant="secondary" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
                {passwordResetSent && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✓ Revisa tu bandeja de entrada
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Zona de peligro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Eliminar tu cuenta cancelará todas tus suscripciones y eliminará
            permanentemente todos tus datos. Esta acción no se puede deshacer.
          </p>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            Eliminar cuenta
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="¿Eliminar cuenta?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Esta acción eliminará permanentemente tu cuenta y todos tus datos,
            incluyendo:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
            <li>Todas tus suscripciones activas</li>
            <li>Tu historial de estados y comentarios</li>
            <li>Tus solicitudes de listas</li>
          </ul>
          <p className="font-medium text-red-600 dark:text-red-400">
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // TODO: Implement account deletion
                alert("Funcionalidad próximamente disponible");
                setShowDeleteModal(false);
              }}
            >
              Sí, eliminar mi cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
