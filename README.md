# InmoCapt - Plataforma de Captación de Particulares para Agentes Inmobiliarios

Plataforma SaaS que permite a agentes inmobiliarios acceder mediante suscripción a listados de propietarios particulares que venden sin intermediarios.

## Stack Tecnológico

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Fastify + TypeScript
- **Base de datos**: Turso (SQLite distribuido)
- **Autenticación**: Auth0
- **Pagos**: Stripe
- **Email**: Nodemailer

## Estructura del Proyecto

```
├── packages/
│   ├── web/          # Frontend (React + Vite)
│   └── api/          # Backend (Fastify)
├── .github/
│   └── instructions/ # Documentación del proyecto
└── package.json      # Workspaces root
```

## Requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivos de configuración
cp packages/web/.env.example packages/web/.env.local
cp packages/api/.env.example packages/api/.env

# Configurar variables de entorno en los archivos .env
```

## Desarrollo

```bash
# Ejecutar frontend y backend en paralelo
npm run dev

# Solo frontend
npm run dev:web

# Solo backend
npm run dev:api
```

## Configuración Requerida

### Auth0

1. Crear una aplicación SPA en Auth0
2. Configurar callback URLs
3. Crear una API en Auth0
4. Añadir las credenciales a los archivos .env

### Stripe

1. Crear cuenta de Stripe
2. Obtener claves de API (test mode para desarrollo)
3. Configurar webhook endpoint
4. Añadir las credenciales a los archivos .env

### Turso

1. Crear base de datos en Turso
2. Ejecutar el schema SQL (`packages/api/src/db/schema.sql`)
3. Añadir URL y token a los archivos .env

## Scripts Disponibles

| Comando             | Descripción                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Ejecuta ambos proyectos en modo desarrollo |
| `npm run dev:web`   | Solo frontend                              |
| `npm run dev:api`   | Solo backend                               |
| `npm run build`     | Construye ambos proyectos                  |
| `npm run lint`      | Ejecuta ESLint en todos los packages       |
| `npm run typecheck` | Verifica tipos TypeScript                  |

## Documentación

La documentación completa del proyecto está en `.github/instructions/`:

- `documentacion_funcional.instructions.md` - Requisitos funcionales
- `documentacion_tecnica.instructions.md` - Arquitectura técnica
- `autenticacion_y_autorizacion.instructions.md` - Sistema de auth
- `guia_diseño.instructions.md` - Guía de diseño visual

## Licencia

UNLICENSED - Proyecto privado
