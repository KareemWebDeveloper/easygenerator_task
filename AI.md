# AI Collaboration Report: Full-Stack Test Task

## 1. Overview & AI Strategy

In accordance with Easygenerator's AI Usage Policy, this project leveraged AI assistance as a force multiplier to accelerate boilerplate scaffolding, validation schemas, and test scaffolding while applying senior engineering judgment to architecture, security, and runtime constraints.

The objective was not merely to accept generated code, but to actively evaluate, challenge, and refine the architectural choices to deliver a production-ready application that reflects senior full-stack craftsmanship.

---

## 2. Which Parts Were AI-Assisted?

| Component | AI Assistance Scope | Human / Senior Refinement Applied |
| :--- | :--- | :--- |
| **Project Scaffolding** | Initial NestJS project and Vue 3 + Vite scaffolding commands. | Restructured the backend into a clean modular monolith without unnecessary generic repository or CQRS abstractions, and organized the Vue app into a feature-based modular structure (see section L). |
| **Validation DTOs & Regex** | Standard regex strings for password complexity and email validation decorators. | Added live frontend visual feedback checklist reflecting the exact business criteria in real time. |
| **Swagger Annotations** | Generating standard OpenAPI decorator properties and summaries. | Enforced dedicated UserResponseDto return types to guarantee no internal entity data or hashes leak. |
| **Authentication Flow** | Initial JWT-in-response-body sign-in/sign-up flow with a single access token. | Replaced with server-set HttpOnly cookies only, and designed the refresh-token rotation and reuse-detection layer myself. |
| **Nginx & Docker Configurations** | Initial multi-stage Dockerfile blueprints. | Added health check dependencies to docker-compose.yml, configured proper SPA fallback routing and secure proxy headers. |

---

## 3. What Needed Correction & What Was Decided Differently (My Decisions)

Throughout the implementation, several initial AI suggestions were consciously modified or rejected in favor of senior-level best practices:

### Core Decision: Auth Strategy, HttpOnly Cookies Instead of Tokens in the Response Body
- **Initial approach (AI scaffold)**: The first implementation was the common pattern. `signin` and `signup` returned a JWT in the JSON response body, and the frontend stored it and attached it as a `Bearer` header.
- **Why I rejected it**: Any token readable by JavaScript can be stolen by a single XSS bug, whether it sits in `localStorage` or in Pinia state. It also leaks into the frontend bundle, devtools and logs.
- **My Decision**: I moved the whole session into cookies set only by the server through `Set-Cookie` response headers (`HttpOnly`, `Secure` in production, `SameSite=Lax`). The response body now carries only the safe `UserResponseDto`.
- **Before**: the frontend handled the token (storage, `Authorization` header, expiry) and could expose it to XSS.
- **After**: the browser handles the credential and JS never sees it. The frontend keeps only the user profile in memory and restores the session on page load through the protected `GET /auth/me`.
- **Consequences I designed for**: cookie auth is vulnerable to CSRF, so I added the multi-layer `CsrfGuard` (section D), `withCredentials` plus an explicit CORS allow-list, and the dual-cookie refresh design below.

### A. Password Hashing: Argon2id over Bcrypt
- **AI Suggestion**: Initial scaffolding suggested standard bcryptjs with 10–12 rounds.
- **My Decision**: Replaced with **Argon2id** (`argon2` package). Argon2id is the OWASP-recommended standard because it provides memory-hardness resistant to GPU/ASIC brute-force attacks, whereas bcrypt is older and vulnerable to specialized hardware cracking.

### B. Decoupled Service Architecture (HTTP Cookies in Controller)
- **AI Suggestion**: AI originally coupled Express Response objects and cookie setting logic directly inside AuthService.
- **My Decision**: Decoupled AuthService from Express HTTP concerns so that AuthService handles pure domain logic (returning `{ user, accessToken, refreshToken }`), while AuthController owns HTTP response cookie management (`setAuthCookies` / `clearAuthCookies`). This keeps the service layer framework-agnostic and clean to unit test.

### C. Dedicated Database Module
- **My Decision**: Extracted Mongoose connection setup into a dedicated DatabaseModule (`src/database/database.module.ts`), keeping AppModule clean and maintainable.

### D. Multi-Layered CSRF Defense Strategy
- **AI Suggestion**: Relying solely on CORS or basic SameSite cookies.
- **My Decision**: Implemented a multi-layered `CsrfGuard` validating both allowed Origin/Referer headers on mutating requests (`POST`, `PUT`, `DELETE`) and custom anti-CSRF headers (`X-Requested-With` or `X-CSRF-Protection`). Browsers never transmit custom headers cross-origin without CORS preflight verification.

### E. Frictionless UX: Auto-Login on Registration
- **AI Suggestion**: Standard signup flow that returns a message and forces the user to manually enter their credentials again on the sign-in page.
- **My Decision**: Automatically established the session by emitting the HttpOnly cookie upon successful registration and returning the public UserResponseDto. This eliminated friction, immediately routing the user to the protected Dashboard.

### F. Concurrency Defense & Unique Index Enforcement
- **AI Suggestion**: Relying on an application-level `findOne` check before calling create.
- **My Decision**: Application-level checks suffer from classic Time-of-Check to Time-of-Use (TOCTOU) race conditions. Implemented a strict database unique index on normalized (trimmed, lowercase) emails and explicitly caught MongoDB duplicate key error 11000 to map it to HTTP 409 Conflict. Validated this behavior with an automated concurrency test executing simultaneous duplicate signups.

### G. Correlation ID Middleware Hardening
- **AI Suggestion**: Blindly reflecting any X-Correlation-ID header sent by the client.
- **My Decision**: Refactored the middleware to validate that any incoming correlation ID matches a strict UUID v4 format. If missing or invalid, a new UUID v4 is generated. Additionally, ensured correlation IDs are never used for authentication, identity, or authorization.

### H. Clean Error Contracts (RFC 7807) & Clean Responses
- **AI Suggestion**: Wrapping successful responses in redundant `{ data: ... }` envelopes while returning generic 500 error objects.
- **My Decision**: Avoided unnecessary response wrappers to keep REST contracts idiomatic, and implemented a global ProblemDetailsExceptionFilter conforming to RFC 7807 (`status`, `title`, `detail`, `instance`, `correlationId`, `timestamp`).

### I. Graceful Shutdown & Resource Cleanup
- **My Decision**: Configured `app.enableShutdownHooks()` in NestJS so that incoming requests drain and MongoDB connections close cleanly when Docker or Kubernetes sends SIGTERM/SIGINT signals.

### J. Sliding Sessions & Refresh Token Rotation with Reuse Attack Detection
- **AI Suggestion**: None. The AI scaffold issued a single access token with no refresh mechanism. The refresh design was entirely my own addition. Once the session lived in cookies, a single long-lived token meant either a long exposure window or users being logged out constantly.
- **My Decision**: Implemented a sliding session model utilizing a short-lived 15-minute access token alongside a 7-day refresh token stored in a path-restricted HttpOnly cookie (`path: '/api/v1/auth'`), so the refresh token is only sent to the auth endpoints. Refresh tokens are persisted only as SHA-256 hashes, with a MongoDB TTL index for automatic cleanup.
- **Reuse Detection**: Each refresh token belongs to a session family ID (`familyId`). On every `/auth/refresh` request, tokens are rotated. If an already revoked refresh token is presented (indicating a stolen token reuse attempt), the system automatically revokes **all active tokens in that session family** and logs a security alert.

### K. Automated Swagger UI CSRF Interceptor (Development / Staging)
- **My Decision**: Configured Swagger UI in `main.ts` with a `requestInterceptor` in non-production environments that automatically injects `X-Requested-With: XMLHttpRequest` into every interactive API request, allowing developers to test endpoints seamlessly without manually bypassing CSRF guards.


### L. Modular, Feature-Based Vue Frontend Structure
- **AI Suggestion**: The default Vite scaffold and typical generated Vue code put the form markup, validation rules, API calls and shared UI into a few large flat files. That works for a demo but becomes hard to read and change.
- **My Decision**: I organized `frontend/src` by responsibility and by feature, so each file has one reason to change:
  - `app/<feature>/`: route-level views grouped by feature (`auth/SignIn.vue`, `auth/SignUp.vue`, `dashboard/Dashboard.vue`). Each feature owns its validation in `app/auth/schemas/auth.schema.ts`, so rules sit next to the forms that use them.
  - `components/`: reusable pieces split by scope: `ui/` for generic primitives (`AlertBanner`, `logo`), `common/` for shared layout (`AppNavbar`), and `auth/` for domain widgets (`PasswordChecklist`). Views compose these instead of repeating markup.
  - `stores/`: the Pinia auth store is the only place that holds session state and calls the auth endpoints, so views never talk to HTTP directly.
  - `api/`: a single Axios client owns cross-cutting HTTP concerns (credentials, CSRF header, correlation IDs, single-flight session refresh).
  - `router/`: typed routes with `requiresAuth` / `guestOnly` meta and one navigation guard that restores the session before routing.
  - `types/` and `tests/`: shared contracts and the unit tests are kept apart from the UI code.
- **Before**: UI, validation, state and HTTP logic tended to mix inside page components, which were long and hard to test.
- **After**: views stay thin and declarative, validation and state are reusable and unit-testable on their own, and a new feature means adding one `app/<feature>/` folder instead of editing shared files. The layout mirrors the backend's modular monolith, so the two apps are easy to navigate side by side.

---

## 4. Second-Pass AI Security Review: Flaws Found & Fixed

After the first implementation I used AI a second time, as an adversarial reviewer instead of a generator. The prompt was: *"Act as a senior reviewer. Read my auth service, controller, CSRF guard, env validation, DTOs and the frontend API client. Rate the decisions and list real bugs and security weaknesses, not style nits."* I verified each finding against the code, fixed it, and added a regression test. The review caught four issues in my own "senior" design, and I fixed three smaller ones alongside them.

### 1. Refresh race condition that logged users out (most important)
- **Prompt that surfaced it**: *"What happens in the axios interceptor if three requests get a 401 at the same time?"*
- **Before**: each 401 independently called `POST /auth/refresh`. The first call rotated the token. The second and third replayed the already-revoked token, which tripped my own reuse detection and revoked the whole session family. A normal dashboard load with parallel requests could sign the user out. The security feature was causing the outage.
- **After**: `client.ts` keeps one shared in-flight refresh promise. Concurrent 401s await the same rotation, then each retries once.
- **Proof**: `client.refresh.spec.ts` fires 3 concurrent 401s and asserts exactly 1 refresh call.

### 2. Hardcoded fallback secrets contradicting fail-fast config
- **Prompt**: *"Does my env validation actually guarantee the app can't boot with a guessable secret?"*
- **Before**: `JWT_REFRESH_SECRET` and `COOKIE_SECRET` had committed default values in three places (Joi schema, `AuthService`, `main.ts`). `docker-compose.yml` also contained a literal JWT secret. A forgotten variable meant the app started with a public secret.
- **After**: both are `.required()` in Joi and read with `getOrThrow`, so a missing secret stops the boot. Compose now uses `${VAR:?message}` from a root `.env` (new `.env.example`), and CI supplies its own test secrets.

### 3. CSRF origin check was a prefix match
- **Prompt**: *"Try to bypass my CsrfGuard origin validation."*
- **Before**: `origin.startsWith(allowed)` accepted `http://localhost:5173.evil.com`.
- **After**: the Origin or Referer is parsed with `new URL().origin` and compared for exact equality against a set. Malformed values are rejected.
- **Proof**: `csrf.guard.spec.ts` covers the look-alike origin, a malformed origin, a Referer with a path, and a missing header.

### 4. Login timing leaked which emails exist
- **Prompt**: *"Can an attacker enumerate registered emails through signin?"*
- **Before**: an unknown email returned immediately (about 1 ms), while a known email paid for an Argon2 verify (about 100 ms). The generic error message was undone by the response time.
- **After**: unknown emails verify against a lazily created dummy Argon2id hash, so both paths cost the same.
- **Proof**: a unit test asserts an Argon2 verify runs when the user doesn't exist.

### 5-7. Smaller hardening changes

| # | Before | After |
|---|---|---|
| 5 | Throttling behind nginx saw one shared IP, so all users shared a rate-limit bucket. | `app.set('trust proxy', 1)` so the throttler keys on the real client IP. |
| 6 | `error.name === 'MongoServerError'` turned any Mongo failure into "409 email exists". | Only duplicate-key code `11000` maps to 409. Other errors stay 500 and are not hidden. |
| 7 | `"a  "` passed `MinLength(3)` and was then trimmed to `"a"`. There was no max length, so huge passwords meant unbounded Argon2 work. | Email and name are trimmed before validation (`@Transform`). Name is capped at 100 and password at 8-128. The Zod schema mirrors this. |

**Takeaway**: AI was most useful here as an adversarial reviewer. The first pass produced the architecture, and the second pass found interaction bugs between my own features (rotation vs. concurrent requests, fail-fast config vs. defaults, generic errors vs. timing). I accepted every finding only after reproducing it in code or a test.

---

## 5. Conclusion

Using AI as a force multiplier enabled rapid execution without compromising on senior architectural principles. The final deliverable demonstrates a secure, maintainable, and observable full-stack application ready for enterprise production.
