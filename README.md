# TimeTraker-Pro

Sistema de gestión de ingresos empresariales desplegado en web.

El proyecto está claramente dividido en **frontend** y **backend**, cada uno en su propia carpeta en la raíz del repositorio.

---

## Estructura del proyecto

```
TimeTraker-Pro/
├── frontend/              # Aplicación web (React + Vite + TypeScript)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── nginx.conf         # Configuración para servir el frontend en producción
│   └── Dockerfile
│
├── backend/               # API REST (Spring Boot 3 + Java 21)
│   ├── src/
│   │   └── main/
│   │       ├── java/      # Código fuente Java
│   │       └── resources/
│   │           ├── application.yml
│   │           ├── openapi.yaml
│   │           └── schema.sql
│   ├── pom.xml
│   └── Dockerfile
│
├── packages/              # Librerías compartidas (api-client, api-spec, db, etc.)
├── artifacts/             # Artefactos auxiliares (sandbox, etc.)
├── scripts/               # Scripts utilitarios
├── docker-compose.yml     # Orquesta frontend + backend + PostgreSQL
├── .env.example           # Plantilla de variables de entorno
├── package.json
└── README.md
```

---

## Requisitos previos

### Para ejecución con Docker (recomendado)
- **Docker** ≥ 24
- **Docker Compose** ≥ 2

### Para ejecución manual
- **Node.js** ≥ 20 (recomendado 22)
- **pnpm** ≥ 10  (`npm install -g pnpm`)
- **Java JDK** 21
- **Maven** ≥ 3.9
- **PostgreSQL** ≥ 14

---

## Dependencias del frontend (`frontend/`)

Stack: **React + Vite + TypeScript + TailwindCSS + Radix UI**

Runtime:
- `react`, `react-dom`
- `wouter` — enrutado
- `@tanstack/react-query` — estado/servidor
- `react-hook-form`, `@hookform/resolvers`, `zod` — formularios y validación
- `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority`, `clsx`
- `@radix-ui/react-*` — accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, popover, select, tabs, toast, tooltip, etc.
- `lucide-react`, `react-icons` — iconografía
- `recharts` — gráficas
- `date-fns`, `react-day-picker` — fechas y calendario
- `framer-motion` — animaciones
- `sonner`, `vaul`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `next-themes`
- `katex`, `mathjs` — fórmulas matemáticas

Desarrollo:
- `vite`, `@vitejs/plugin-react`
- `typescript`, `@types/react`, `@types/react-dom`, `@types/node`

---

## Dependencias del backend (`backend/`)

Stack: **Spring Boot 3.3.5 + Java 21 + PostgreSQL + JWT**

Definidas en `pom.xml`:
- `spring-boot-starter-web` — API REST
- `spring-boot-starter-data-jpa` — persistencia con JPA/Hibernate
- `spring-boot-starter-security` — seguridad
- `spring-boot-starter-validation` — validación de DTOs
- `org.postgresql:postgresql` — driver de PostgreSQL
- `io.jsonwebtoken:jjwt-api / jjwt-impl / jjwt-jackson` (v0.12.6) — autenticación JWT
- `org.projectlombok:lombok` — reducción de boilerplate
- `spring-boot-starter-test`, `spring-security-test` — pruebas
- `org.openapitools:openapi-generator-maven-plugin` (v7.6.0) — generación de interfaces a partir de `openapi.yaml`

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env
```

Variables principales:

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `PGHOST` | Host de PostgreSQL | `localhost` (en Docker: `db`) |
| `PGPORT` | Puerto de PostgreSQL | `5432` |
| `PGDATABASE` | Nombre de la base de datos | `timetrack` |
| `PGUSER` | Usuario de PostgreSQL | `postgres` |
| `PGPASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `JWT_SECRET` | Secreto para firmar tokens JWT (≥ 32 bytes) | — |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos por CORS | `http://localhost:5173` |
| `PORT` | Puerto del frontend Vite | `5173` |
| `BASE_PATH` | Ruta base del frontend | `/` |
| `VITE_API_URL` | URL del backend para el frontend | `http://localhost:8080` |

---

## Ejecutar el proyecto

### Opción 1 — Con Docker (todo en uno)

Levanta frontend, backend y PostgreSQL con un solo comando:

```bash
docker compose up --build
```

Cuando termine de construir:
- Frontend → `http://localhost`
- Backend  → `http://localhost:8080/api`
- Postgres → `localhost:5432`

Para detener:
```bash
docker compose down
```

Para eliminar también los datos de la base de datos:
```bash
docker compose down -v
```

### Opción 2 — Manual

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/<usuario>/TimeTraker-Pro.git
   cd TimeTraker-Pro
   ```

2. **Crear la base de datos**
   ```sql
   CREATE DATABASE timetrack;
   ```

3. **Configurar variables de entorno** (`cp .env.example .env`).

4. **Levantar el backend**
   ```bash
   cd backend
   mvn spring-boot:run
   ```
   Disponible en `http://localhost:8080/api`.

5. **Levantar el frontend** (en otra terminal)
   ```bash
   cd frontend
   pnpm install
   PORT=5173 BASE_PATH=/ pnpm run dev
   ```
   Disponible en `http://localhost:5173`.

---

## Build de producción

### Frontend
```bash
cd frontend
pnpm install
PORT=5173 BASE_PATH=/ pnpm run build
```
Genera la salida estática en `frontend/dist/`.

### Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/api-server-0.0.1-SNAPSHOT.jar
```

---

## Despliegue en otro host

### Con Docker (más simple)
1. Copia el repositorio al servidor.
2. Crea el archivo `.env` con los valores de producción.
3. Ejecuta:
   ```bash
   docker compose up -d --build
   ```

### Sin Docker
- **Frontend:** publica `frontend/dist/` en Vercel, Netlify, Cloudflare Pages o cualquier servidor estático. Define `VITE_API_URL` apuntando al backend en producción.
- **Backend:** despliega el `.jar` en Render, Railway, Fly.io, AWS, etc. Configura las variables de entorno y la conexión a PostgreSQL en el host de destino.

---

## Archivos ignorados por Git

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
| `pnpm run build`        | Compila todos los paquetes |
| `pnpm run typecheck`    | Verifica tipos de TypeScript |
