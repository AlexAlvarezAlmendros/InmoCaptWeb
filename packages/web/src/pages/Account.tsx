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
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Te enviaremos un enlace de recuperación a tu email registrado para
            cambiar tu contraseña.
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
