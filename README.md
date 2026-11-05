# Easygenerator Full-Stack Authentication Portal

A production-grade, enterprise-ready authentication system engineered for the Easygenerator engineering assessment. Built with **NestJS 12**, **Vue 3 (Composition API `<script setup>`)**, **TypeScript**, **Tailwind CSS**, and **MongoDB**.

---

## 🌟 Executive Summary & Engineering Highlights

| My Decision | Rationale & Enterprise Impact |
| :--- | :--- |
| **Modular Monolith Architecture** | Domain-driven structure (`auth`, `users`, `common`, `health`) without unnecessary CQRS or microservice complexity. |
| **Argon2id Password Hashing** | OWASP-recommended, memory-hard hashing algorithm (`timeCost: 3`, `memoryCost: 64MB`) superior to legacy bcrypt. |
| **Cookie-Only Session (no token in the response body)** | The server sets the session exclusively through `Set-Cookie` headers (`HttpOnly`, `SameSite=Lax`, `Secure` in production). Response bodies contain only the safe `UserResponseDto`, so JavaScript never sees a credential and XSS cannot exfiltrate one. This replaced an initial "JWT in the JSON body" design. |
| **Sliding Sessions & Token Rotation** | Short-lived 15-min access JWT (`eg_auth_token`) + 7-day refresh JWT (`eg_refresh_token`, cookie `path: '/api/v1/auth'`). Refresh tokens are rotated on every use and stored only as SHA-256 hashes with a MongoDB TTL index. Family-based reuse detection revokes the whole session family if a revoked token is replayed. |
| **Race-Free Refresh on the Client** | The Axios interceptor shares one in-flight `/auth/refresh` call across concurrent `401`s, so parallel requests never replay a rotated token and trip reuse detection. |
| **Layered CSRF Defense & Swagger Interceptor** | Mutating requests must come from an allowed origin (exact `URL.origin` match on `Origin`/`Referer`, never a prefix match) and carry a custom header (`X-Requested-With: XMLHttpRequest` / `X-CSRF-Protection: 1`). Non-production Swagger UI injects the header automatically. |
| **Timing-Safe Sign-In** | Unknown emails are verified against a dummy Argon2id hash, so response time does not reveal which emails are registered. |
| **Fail-Fast Secrets** | `JWT_SECRET`, `JWT_REFRESH_SECRET` and `COOKIE_SECRET` are required and validated with Joi at boot. There are no fallback defaults and nothing secret is committed. |
| **Tokenless Frontend State** | Pinia store manages only public user profile and authentication status (`user`, `isAuthenticated`, `isLoading`, `isInitialized`). No credentials or tokens exist in `localStorage`, `sessionStorage` or memory. |
| **Frictionless UX (Auto-Login)** | Account creation automatically sets the session cookie and returns the public user profile, redirecting the user immediately to the Dashboard without a redundant sign-in step. |
| **Two-Layer Validation** | `class-validator` DTOs on the backend (`whitelist` + `forbidNonWhitelisted`, trim-before-validate, bounded name/password length) mirrored by Zod schemas on the frontend. |
| **MongoDB Unique Index & Race-Condition Defense** | Normalized emails (lowercase, trimmed) backed by a MongoDB unique index. Only duplicate key `11000` is mapped to `409 Conflict`; other database errors stay `500`. Validated via automated concurrency tests. |
| **Strict Data Privacy** | `passwordHash` configured with `select: false` at the Mongoose schema level. Explicitly projected only during signin. All endpoints return dedicated `UserResponseDto` instances. |
| **Validated Correlation IDs** | Request-scoped middleware strictly validates incoming `X-Correlation-ID` against UUID v4 format (generating a new one if missing or invalid) and propagates it across responses and error payloads. Never used for identity or security. |
| **RFC 7807 Problem Details** | Consistent, machine-readable error contracts across all endpoints (`status`, `title`, `detail`, `instance`, `correlationId`, `timestamp`). |
| **Graceful Shutdown Hooks** | Cleanly closes MongoDB connections and Mongoose streams upon SIGTERM/SIGINT signals. |

---

## 📁 Repository Structure

```text
├── backend/                  # NestJS 12 API Application
│   ├── src/
│   │   ├── auth/             # Authentication Domain (Argon2id, cookie sessions, refresh rotation, DTOs)
│   │   ├── users/            # Users Domain (Mongoose Schema, Service, DTOs)
│   │   ├── database/         # Database Module (Mongoose Connection)
│   │   ├── health/           # Terminus Health Checks (MongoDB ping, uptime)
│   │   ├── common/           # Config, Middleware, RFC 7807 Filters, Guards, Decorators
│   │   ├── app.module.ts     # Root Application Module
│   │   └── main.ts           # Bootstrapper with Helmet, Swagger, CookieParser
│   ├── test/                 # E2E & Concurrency Test Suite
│   └── Dockerfile            # Multi-stage production container
├── frontend/                 # Vue 3 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/              # Axios client: CSRF header, correlation IDs, single-flight session refresh
│   │   ├── stores/           # Tokenless Pinia auth store with /auth/me restore
│   │   ├── router/           # Typed Vue Router with navigation guards
│   │   ├── components/       # Modular Domain & UI Components
│   │   │   ├── ui/           # Generic UI primitives (AlertBanner)
│   │   │   ├── common/       # Shared layout components (AppNavbar)
│   │   │   └── auth/         # Auth-specific widgets (PasswordChecklist)
│   │   ├── app/              # Application Views (Modular by Feature)
│   │   │   ├── auth/         # SignUp.vue, SignIn.vue
│   │   │   └── dashboard/    # Dashboard.vue
│   │   └── tests/            # Vitest unit test suite
│   ├── nginx.conf            # Nginx SPA & API Reverse Proxy configuration
│   └── Dockerfile            # Multi-stage production container
├── .github/workflows/ci.yml  # Automated GitHub Actions CI/CD Pipeline
├── docker-compose.yml        # Multi-container orchestration (Mongo, Backend, Frontend)
├── .env.example              # Required secrets for docker compose (copy to .env)
├── AI.md                     # Mandatory report on AI-assisted workflows & decisions
└── README.md                 # Project Documentation
```

---

## 🚀 Quick Start with Docker Compose

Ensure Docker is installed and running. Secrets are required and not committed, so create a root `.env` first:

```bash
cp .env.example .env   # then replace the placeholder secrets (generation command inside the file)
docker compose up --build
```

- **Frontend Portal**: [http://localhost:8080](http://localhost:8080)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **Interactive Swagger Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **System Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)

---

## ⚙️ Configuration

All variables are validated at boot (Joi). The backend refuses to start if a required one is missing or too short. See [backend/.env.example](backend/.env.example).

| Variable | Required | Default | Notes |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | Yes | n/a | `mongodb://` or `mongodb+srv://` URI |
| `JWT_SECRET` | Yes | n/a | Access-token secret, min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | n/a | Refresh-token secret, min 32 chars, should differ from `JWT_SECRET` |
| `COOKIE_SECRET` | Yes | n/a | Cookie-parser secret, min 16 chars |
| `NODE_ENV` | No | `development` | `production` enables `Secure` cookies |
| `PORT` | No | `3000` | |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS / CSRF origin |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | No | `15m` / `7d` | |
| `AUTH_COOKIE_NAME` / `REFRESH_COOKIE_NAME` | No | `eg_auth_token` / `eg_refresh_token` | |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | No | `60000` / `10` | Global rate limit (auth routes have stricter per-route limits) |

Generate a strong secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 💻 Local Development Setup

### 1. Start MongoDB (Docker)
```bash
docker run -d --name easygenerator-mongodb -p 27017:27017 mongo:8.0
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env   # replace the placeholder secrets; the app refuses to boot without them
npm install
npm run build
npm run start:dev
```
Backend runs on `http://localhost:3000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` with automated `/api` proxy to the backend.

---

## 🧪 Testing Suite

### Backend Unit Tests
```bash
cd backend
npm run test
```
*Covers Argon2id hashing, signup/signin, timing-equalized login, refresh-reuse detection, the CSRF guard (including look-alike origins) and DTO validation.*

### Backend E2E & Concurrency Race-Condition Tests
```bash
cd backend
npm run test:e2e
```
*Validates the full signup, cookie emission, signin, session restore, logout, and **simultaneous identical signup requests** (asserting exactly one succeeds with 201 and one returns 409 Conflict).*

### Frontend Unit Tests
```bash
cd frontend
npm run test
```
*Covers the Pinia auth store and the Axios interceptor (concurrent `401`s trigger exactly one refresh).*

---

## 📋 API Specification

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Registers new user, emits access & refresh HttpOnly cookies, returns `UserResponseDto` | No (Rate-limited) |
| `POST` | `/api/v1/auth/signin` | Verifies credentials, emits access & refresh HttpOnly cookies, returns `UserResponseDto` | No (Rate-limited) |
| `POST` | `/api/v1/auth/refresh` | Rotates refresh token, emits fresh access & refresh HttpOnly cookies, returns active user | **Yes (HttpOnly Refresh Cookie)** |
| `POST` | `/api/v1/auth/logout` | Revokes refresh token in database & clears authentication cookies | No |
| `GET` | `/api/v1/auth/me` | Returns current authenticated user profile | **Yes (HttpOnly Access Cookie)** |
| `GET` | `/api/v1/health` | Terminus health check (MongoDB ping & status) | No |
| `GET` | `/api/docs` | Interactive OpenAPI Swagger documentation (Auto-injects CSRF header in dev) | No |

---

## 📜 Task Requirements Compliance

- [x] **Sign up page**:
  - Email format validation
  - Name: Minimum 3 characters
  - Password: Minimum 8 characters, at least 1 letter, 1 number, 1 special character
  - Live visual requirements checklist and password visibility toggle
- [x] **Sign in page**: Email & password inputs with clear error feedback
- [x] **Application page**: Displays **"Welcome to the application."**, profile card, and functional logout button
- [x] **Protected endpoint**: `/api/v1/auth/me` secured with a Passport JWT strategy that reads the HttpOnly access cookie
- [x] **Production Readiness & Best Practices**: Helmet, Argon2id, cookie-only sessions with refresh rotation, CSRF defense, rate-limiting, MongoDB unique index, fail-fast config, graceful shutdown, Terminus health checks, and CI/CD workflow
- [x] **AI.md**: Comprehensive disclosure and technical breakdown of AI usage, including the second-pass security review and the fixes it led to

---

## 🔐 Security Notes & Roadmap

**Threat model covered**
- **XSS token theft**: tokens are `HttpOnly` cookies and are never exposed to JavaScript.
- **CSRF**: `SameSite=Lax`, strict CORS allow-list, exact Origin/Referer matching and a required custom header.
- **Stolen refresh token**: rotation plus family-wide revocation on reuse. Tokens are stored only as hashes.
- **Credential stuffing / enumeration**: per-route rate limits (`trust proxy` is enabled for correct client IPs behind nginx) and timing-equalized sign-in with a generic error message.
- **Oversized input**: password length is capped at 128 characters to bound Argon2 work.

**Operational notes**
- Swagger UI at `/api/docs` is enabled in every environment for this assessment. Gate it behind `NODE_ENV` or authentication for a real production deployment.
- Rate limiting uses the in-memory throttler store. Use a Redis-backed store when running multiple backend replicas.

**Next steps**
- Redis-backed throttling and session listing / "log out of all devices".
- Email verification and password reset flows.
- Stronger tests for refresh rotation and reuse detection at the e2e level.
