# TimeTrack Pro — Spring Boot backend

Backend en **Spring Boot 3 + JPA + Spring Security + JWT** que reemplaza al server Node de `artifacts/api-server` y se conecta a tu PostgreSQL local. Implementa todos los endpoints del contrato `lib/api-spec/openapi.yaml`.

---

## 1. Requisitos
- **Java 21** (mínimo 17). Verifica con `java -version`.
- **Maven 3.9+**. Verifica con `mvn -v`.
- **PostgreSQL 14+** corriendo en local.

## 2. Crear la base de datos
```bash
psql -U postgres -c "CREATE DATABASE timetrack;"
psql -U postgres -d timetrack -f src/main/resources/schema.sql
```
> Si prefieres traer los datos de prueba que ya tienes en Replit:
> ```bash
> # En Replit (shell)
> pg_dump --data-only --inserts "$DATABASE_URL" > data.sql
> ```
> Y en tu PC: `psql -U postgres -d timetrack -f data.sql`

## 3. Variables de entorno
Crea un `.env` (no se commitea) o exporta antes de arrancar:
```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=timetrack
export PGUSER=postgres
export PGPASSWORD=tu_password
export JWT_SECRET="una-cadena-larga-y-aleatoria-de-al-menos-32-bytes"
```

## 4. Arrancar
```bash
mvn spring-boot:run
```
La API queda en `http://localhost:8080/api`. Al primer arranque se crea un usuario inicial:

```
email:    admin@timetrack.local
password: Admin#12345
role:     super_admin
```
> Cambia las credenciales con las propiedades `app.bootstrap.super-admin-*` o creando un usuario nuevo y borrando este.

## 5. Probar
```bash
curl http://localhost:8080/api/health

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@timetrack.local","password":"Admin#12345"}'
```

## 6. Conectar el frontend
El proxy de Vite ya está configurado: `artifacts/timetrack-pro/vite.config.ts` enruta `/api → http://localhost:8080`. Solo arranca el frontend:
```bash
cd artifacts/timetrack-pro
PORT=5000 BASE_PATH=/ pnpm dev
```
Abre `http://localhost:5000` y haz login con el super_admin.

---

## Endpoints implementados
Todos bajo el prefijo `/api`:

| Tag           | Endpoints |
|---------------|-----------|
| auth          | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| companies     | `GET/POST /companies`, `PATCH/DELETE /companies/{id}` *(super_admin)* |
| employees     | `GET/POST /employees`, `GET /employees/status`, `GET /employees/profile/{document}`, `GET/PATCH/DELETE /employees/{id}`, `PUT /employees/{id}/pin` |
| attendance    | `POST /attendance/verify-identity`, `POST /attendance/punch`, `GET /attendance/today-summary/{document}`, `GET /attendance/logs`, `GET /attendance/today`, `GET /attendance/employee/{id}` |
| dashboard     | `GET /dashboard/summary`, `GET /dashboard/attendance-trends`, `GET /dashboard/global-summary`, `GET /dashboard/global-trends`, `GET /dashboard/companies-breakdown` |
| users         | `GET/POST /users`, `DELETE /users/{id}` |
| workSchedule  | `GET/PUT /work-schedule` |
| audit         | `GET /audit/logs` |

Las rutas públicas (sin token) son: `/health`, `/auth/login`, `/attendance/verify-identity`, `/attendance/punch`, `/attendance/today-summary/{document}`. El resto requiere `Authorization: Bearer <token>`.

## Reglas de autorización
- `super_admin`: acceso global. No tiene `companyId`.
- `admin`: opera dentro de su `companyId`.
- `employee`: mismo scope que admin pero sin permisos de borrado/escritura críticos (puedes endurecerlo añadiendo `@PreAuthorize` en los controllers).

## Estructura
```
src/main/
├── java/com/timetrack/
│   ├── TimeTrackApplication.java
│   ├── config/        SecurityConfig, JwtUtil, JwtAuthenticationFilter,
│   │                  GlobalExceptionHandler, InitialDataLoader
│   ├── controller/    Auth, Health, Companies, Employees, Attendance,
│   │                  Users, WorkSchedule, Dashboard, Audit
│   ├── dto/           DTOs por dominio
│   ├── entity/        JPA: Company, User, Employee, AttendanceLog,
│   │                  WorkSchedule, AuditLog
│   ├── repository/    Spring Data JPA
│   └── service/       Lógica de negocio + AttendanceMath + SecurityHelper
└── resources/
    ├── application.yml
    ├── schema.sql
    └── openapi.yaml   (copia del contrato compartido)
```

## Generación desde OpenAPI
El `pom.xml` incluye `openapi-generator-maven-plugin` que en cada `mvn compile` regenera interfaces (`com.timetrack.api.*`) y modelos (`com.timetrack.model.*`) a partir de `src/main/resources/openapi.yaml`. Por simplicidad los controllers actuales usan DTOs propios y no implementan esas interfaces, pero las tienes disponibles para hacerlo y forzar al compilador a mantener el contrato.

## Apagar el backend Node
Una vez todo funcione, puedes eliminar `artifacts/api-server/` o dejarlo como referencia.

## Empaquetar para producción
```bash
mvn clean package
java -jar target/api-server-0.0.1-SNAPSHOT.jar
```
