import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@/components/ui";

export function AccountPage() {
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
                defaultChecked
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="text-sm">
                Actualizaciones de listas suscritas
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="text-sm">Recordatorios de facturación</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-light text-primary focus:ring-primary"
              />
              <span className="text-sm">
                Novedades y nuevas funcionalidades
              </span>
            </label>
          </div>
          <Button className="mt-6">Guardar preferencias</Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Para cambiar tu contraseña, te enviaremos un enlace de recuperación
            a tu email registrado.
          </p>
          <Button variant="secondary">Cambiar contraseña</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-state-rejected/20">
        <CardHeader>
          <CardTitle className="text-state-rejected">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Eliminar tu cuenta cancelará todas tus suscripciones y eliminará
            permanentemente todos tus datos.
          </p>
          <Button variant="danger">Eliminar cuenta</Button>
        </CardContent>
      </Card>
    </div>
  );
}
