# MentorHub

MentorHub is a full-stack tutoring platform with:
- React + Vite frontend
- Spring Boot Authentication Service
- .NET UserManagment Service (Clean Architecture)
- .NET API Gateway (Ocelot)
- PostgreSQL database
- RabbitMQ event messaging

## Local Development

Backend: start **PostgreSQL**, the **API gateway** (`UserManagment.Gateway`, typically `http://localhost:8080` in Docker or `http://localhost:5023` with `dotnet run`), **auth-service**, and **usermanagment-api** (see Docker Compose or your IDE launch profiles).

Frontend:

```bash
npm install
npm run dev
```

With `.env.development` (committed), API calls use **same-origin** paths and the Vite dev server proxies them to `VITE_DEV_GATEWAY_TARGET` (default `http://localhost:8080`). Ensure the gateway is reachable on that port, or override the variable.

If you prefer explicit URLs instead of the proxy, set `VITE_USER_API_BASE_URL`, `VITE_AUTH_API_BASE_URL`, and `VITE_CORE_API_BASE_URL` to your **gateway** base URL in `.env` (not the raw `usermanagment-api` port).

Quality checks:
```bash
npm run lint
npm run test
npm run build
```

## Smoke Test Script

Run a quick integration smoke test:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

Run with compose status checks:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -CheckCompose
```

Run auth signup plus OTP endpoint checks (and optional OTP verification):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Email "your_test_email@example.com" -Role STUDENT
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -Email "your_test_email@example.com" -Role STUDENT -Otp "123456"
```

## Docker Compose Stack

Full stack: `docker compose up --build` (see `docker-compose.yml`).

Typical URLs:

- **Frontend** (static SPA via `serve`): `http://localhost:3005`
- **API gateway** (Ocelot; use this for all browser API calls): `http://localhost:8080`
- **Auth service** (direct, debugging only): `http://localhost:5006`
- **User Management API** (do **not** call from the browser; gateway injects `X-Auth-User-Id`): `http://localhost:8085`
- **PostgreSQL**: `localhost:5432`
- **Mailpit** (dev mail): UI `http://localhost:8025`, SMTP `localhost:1025`

Isolated stack (separate volumes / containers): `docker compose -f docker-compose.mentorhub-final.yml up --build`

### Frontend ↔ gateway

The Docker frontend image calls the **API gateway** at `http://localhost:8080` (set at build time). Always use the gateway URL in the browser — never call `usermanagment-api` directly.

For local `npm run dev`, use `.env.development` (empty `VITE_*` bases + Vite proxy to `http://localhost:8080`) or set `VITE_USER_API_BASE_URL=http://localhost:8080`.

Each account has a **single role** chosen at signup (Student or Tutor). There is no in-app profile switching.

Environment setup:

- **Never** point `VITE_USER_API_BASE_URL` at `usermanagment-api` only — use the **gateway** port (`8080`) or same-origin + proxy as above.
- Authentication service CORS includes `http://localhost:3005` and `http://localhost:5173` in compose.

SMTP setup for live OTP email delivery:
- `SMTP_HOST` (for example `smtp.gmail.com`)
- `SMTP_PORT` (usually `587`)
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_AUTH=true`
- `SMTP_STARTTLS_ENABLE=true`
- `SMTP_FROM` (sender address)

If you use Gmail with 2FA, use an app password for `SMTP_PASSWORD`.

Note:
- `Authentication-Service/Dockerfile` expects a built jar at `Authentication-Service/target/*.jar`.

Gateway routes:
- `/api/v1/auth/*`, `/api/v1/profile/*`, `/api/v1/dashboard/*` -> auth-service
- `/api/v1/tutors/*` -> coreoperations-service
- `/api/v1/student-onboarding/*`, `/api/v1/tutor-onboarding/*`, `/api/v1/super-admin/*` -> usermanagment-api

Gateway implementation details:
- Ocelot-style route files in `UserManagment/UserManagment.Gateway/ocelot.json` and `UserManagment/UserManagment.Gateway/ocelot.Docker.json`
- Local runs use `ocelot.json`
- Docker runs use `ASPNETCORE_ENVIRONMENT=Docker` and load `ocelot.Docker.json`

## Documentation

| Document | Description |
|----------|-------------|
| [docs/MentorHub-Class-Diagram.html](docs/MentorHub-Class-Diagram.html) | **Domain class diagram** (single page — open in browser, print to PDF) |
| [docs/MentorHub-Class-Diagram.md](docs/MentorHub-Class-Diagram.md) | Class diagram index & package overview |
| [docs/LMS_ARCHITECTURE.md](docs/LMS_ARCHITECTURE.md) | Batch enrollment & LMS aggregates |

## CI Pipeline

GitHub Actions workflow is configured in `.github/workflows/ci.yml`.

Default job:
- Frontend `lint`, `test`, `build`

Optional job:
- `auth-service` build (enabled when repository variable `ENABLE_AUTH_SERVICE_CI=true`)

## RabbitMQ Architecture Guide

See `RABBITMQ_MICROSERVICES_GUIDE.md` for exchange, queue, routing key, and migration guidance tailored to this codebase.
