# TimeTraker-Pro

Sistema de gestión de ingresos empresariales desplegado en web.

El proyecto está dividido en dos partes principales:

- **Frontend** (`apps/frontend`) — aplicación web construida con React + Vite + TailwindCSS.
- **Backend** (`apps/backend`) — API REST construida con Spring Boot 3 (Java 21) y PostgreSQL.

---

## Estructura del proyecto

```
TimeTraker-Pro/
├── apps/
│   ├── frontend/          # Aplicación web (React + Vite)
│   └── backend/           # API REST (Spring Boot + Java 21)
├── packages/              # Librerías compartidas (api-client, api-spec, db, etc.)
├── artifacts/             # Artefactos auxiliares (sandbox de mockups, etc.)
├── scripts/               # Scripts utilitarios
├── pnpm-workspace.yaml    # Configuración del monorepo pnpm
├── package.json           # Scripts raíz del workspace
└── README.md
```

---

## Requisitos previos

Para ejecutar el proyecto en otro host necesitas tener instalado:

### Generales
- **Git** ≥ 2.30
- **Sistema operativo:** Linux, macOS o Windows (WSL recomendado)

### Frontend
- **Node.js** ≥ 20 (recomendado 22 o 24)
- **pnpm** ≥ 10  (`npm install -g pnpm`)

### Backend
- **Java JDK** 21
- **Maven** ≥ 3.9 (o usar el `mvnw` incluido si existe)
- **PostgreSQL** ≥ 14 corriendo en local o accesible por red

---

## Dependencias del frontend (`apps/frontend`)

Stack: **React 18 + Vite + TypeScript + TailwindCSS + Radix UI**

Dependencias de runtime:
- `react`, `react-dom`
- `wouter` — enrutado
- `@tanstack/react-query` — manejo de estado/servidor
- `react-hook-form`, `@hookform/resolvers`, `zod` — formularios y validación
- `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority`, `clsx`
- `@radix-ui/react-*` — accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, popover, select, tabs, toast, tooltip, etc.
- `lucide-react`, `react-icons` — iconografía
- `recharts` — gráficas
- `date-fns`, `react-day-picker` — fechas y calendario
- `framer-motion` — animaciones
- `sonner`, `vaul`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `next-themes`
- `katex`, `mathjs` — fórmulas matemáticas

Dependencias de desarrollo:
- `vite`, `@vitejs/plugin-react`
- `typescript`, `@types/react`, `@types/react-dom`, `@types/node`

Instalación:
```bash
pnpm install
```

---

## Dependencias del backend (`apps/backend`)

Stack: **Spring Boot 3.3.5 + Java 21 + PostgreSQL + JWT**

Dependencias declaradas en `pom.xml`:
- `spring-boot-starter-web` — API REST
- `spring-boot-starter-data-jpa` — persistencia con JPA/Hibernate
- `spring-boot-starter-security` — seguridad
- `spring-boot-starter-validation` — validación de DTOs
- `org.postgresql:postgresql` — driver de PostgreSQL
- `io.jsonwebtoken:jjwt-api / jjwt-impl / jjwt-jackson` (v0.12.6) — autenticación JWT
- `org.projectlombok:lombok` — boilerplate
- `spring-boot-starter-test`, `spring-security-test` — pruebas
- `org.openapitools:openapi-generator-maven-plugin` (v7.6.0) — generación de interfaces a partir de `openapi.yaml`

Instalación / build:
```bash
cd apps/backend
mvn clean install
```

---

## Variables de entorno

Crea un archivo `.env` (o configura las variables del sistema) con al menos:

### Frontend
```env
PORT=5173
BASE_PATH=/
VITE_API_URL=http://localhost:8080
```

### Backend (`apps/backend/src/main/resources/application.properties` o variables de entorno)
```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/timetracker
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=tu_password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
JWT_SECRET=cadena_secreta_larga_y_segura
JWT_EXPIRATION_MS=86400000
SERVER_PORT=8080
```

> El archivo `.env` está en `.gitignore`, no se sube al repositorio.

---

## Cómo ejecutar el proyecto en otro host

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/<usuario>/TimeTraker-Pro.git
   cd TimeTraker-Pro
   ```

2. **Instalar dependencias del frontend**
   ```bash
   pnpm install
   ```

3. **Crear y configurar la base de datos PostgreSQL**
   ```sql
   CREATE DATABASE timetracker;
   ```

4. **Configurar variables de entorno** (ver sección anterior).

5. **Levantar el backend**
   ```bash
   pnpm run dev:backend
   # o, manualmente:
   cd apps/backend && mvn spring-boot:run
   ```
   El backend quedará escuchando en `http://localhost:8080`.

6. **Levantar el frontend** (en otra terminal)
   ```bash
   pnpm run dev:frontend
   ```
   El frontend quedará disponible en `http://localhost:5173` (o el puerto definido en `PORT`).

---

## Build de producción

### Frontend
```bash
pnpm --filter @timetraker/frontend run build
```
Genera la salida estática en `apps/frontend/dist/`.

### Backend
```bash
cd apps/backend
mvn clean package -DskipTests
java -jar target/api-server-0.0.1-SNAPSHOT.jar
```

---

## Despliegue

- **Frontend:** se puede publicar en Vercel, Netlify, Cloudflare Pages o cualquier servidor estático sirviendo el contenido de `apps/frontend/dist/`. Recuerda definir `VITE_API_URL` apuntando al backend en producción.
- **Backend:** se puede desplegar como contenedor Docker (hay un `Dockerfile` en `apps/backend/`) en Railway, Render, Fly.io, AWS, etc. Asegúrate de configurar las variables de entorno y la conexión a PostgreSQL en el host de destino.

---

## Archivos ignorados por Git

El `.gitignore` excluye:
```
.env
node_modules/
.vscode/
.cache/
dist/
build/
```

---

## Scripts útiles del workspace

Definidos en el `package.json` raíz:

| Script | Descripción |
| --- | --- |
| `pnpm run dev:frontend` | Levanta el frontend en modo desarrollo |
| `pnpm run dev:backend`  | Levanta el backend Spring Boot |
| `pnpm run build`        | Compila todos los paquetes del workspace |
| `pnpm run typecheck`    | Verifica tipos de TypeScript en todo el monorepo |
