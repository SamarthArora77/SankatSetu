# SankatSetu

SankatSetu is a disaster-relief coordination platform built as a React 19 + Vite frontend on top of a new Node.js / Express / TypeScript / MongoDB backend. It connects citizens, volunteers, donors, responders, NGOs, and administrators through a single REST API and an authenticated Socket.IO gateway.

The existing orange / forest-green / white interface was preserved. Mock data was replaced with real API calls, loading / empty / error states, and cookie-based authentication.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, Leaflet, lucide-react, socket.io-client |
| Backend | Node.js, Express 4, TypeScript (strict, CommonJS), Zod, Mongoose 8 |
| Database | MongoDB Atlas or local MongoDB (2dsphere geospatial indexes) |
| Auth | Short-lived JWT access cookie + refresh cookie, bcryptjs, `tokenVersion` revocation, RBAC |
| Realtime | Socket.IO with server-authorized rooms |
| AI | Official `@google/genai` SDK (backend-only key, strict response validation) |
| Cache | Optional Redis (the app runs without it) |
| Uploads | Multer behind a storage abstraction, local disk in development |

## Repository layout

```
server/
  src/
    config/        env validation, CORS, database, Redis
    controllers/   HTTP handlers and response envelopes
    middleware/    auth, RBAC, validation, rate limits, uploads, errors
    models/        User, Emergency, Mission, Resource, ReliefCamp, Donation,
                   VolunteerTask, Notification, AuditLog, Alert, Responder
    routes/        versioned REST routes mounted at /api/v1
    schemas/       Zod request schemas
    serializers/   audience-aware output (public / staff / owner)
    services/      business logic, status machines, AI, notifications, cache
    sockets/       authenticated Socket.IO gateway
    scripts/       seed and local development helpers
  tests/           Vitest + Supertest + mongodb-memory-server
src/
  api/client.ts    centralized fetch client (credentials: include, envelope parsing)
  api/index.ts     typed API facade used by the dashboards
  api/adapters.ts  backend-to-frontend model mapping and tracking-token storage
  api/realtime.ts  Socket.IO subscription and reconnection handling
```

## Quick start

Requirements: Node.js 20+, npm, and a MongoDB connection string (Atlas or local). Redis and Gemini are optional.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env
# Edit .env and set MONGODB_URI and a JWT_SECRET of at least 32 characters.
npm run seed
npm run dev
```

```bash
# 2. Frontend (from the project root, in a second terminal)
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api`, `/uploads`, and `/socket.io` to `http://localhost:5000`. The frontend never receives a token in JSON; the HttpOnly cookies are sent automatically.

Verify the API:

```bash
curl http://localhost:5000/api/v1/health
```

```json
{
  "success": true,
  "message": "Service health loaded.",
  "data": {
    "status": "ok",
    "database": { "connected": true },
    "cache": { "enabled": false },
    "ai": { "configured": false, "model": null }
  }
}
```

## Environment variables

Copy `server/.env.example` to `server/.env`. Never commit the real file.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `5000` | API port |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `TRUST_PROXY` | No | `false` | Set to `1`/`true` behind a trusted reverse proxy so rate limits see real client IPs |
| `MONGODB_URI` | **Yes** | none | MongoDB Atlas or local connection string |
| `JWT_SECRET` | In production | dev-only fallback with a warning | Signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `GEMINI_API_KEY` | No | empty | Enables AI analysis; empty disables it honestly |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `REDIS_URL` | No | empty | Enables the optional cache; empty disables it |
| `UPLOAD_DIR` | No | `uploads` | Local upload directory |
| `MAX_UPLOAD_MB` | No | `5` | Maximum single upload size (1–25) |
| `SEED_DEMO_PASSWORD` | No | generated | Password for demo accounts; if empty, `npm run seed` generates and prints one |

Production notes:

- HTTPS is required because production cookies use `SameSite=None; Secure`.
- `JWT_SECRET` must be set; startup fails otherwise.
- `TRUST_PROXY` should be enabled only when a trusted proxy terminates TLS.
- Local disk uploads are intended for development; use object storage in production.

## Demo data

`npm run seed` clears the supported collections and creates a demo dataset: seven accounts, relief camps, emergency reports in different statuses, missions, resources, volunteer tasks, donations with tracking history, and a public alert. The password is `SEED_DEMO_PASSWORD` if set; otherwise the script generates one and prints it. No real personal data is used.

| Role | Email |
| --- | --- |
| Admin | `admin@sankatsetu.demo` |
| Responder | `responder.asha@sankatsetu.demo` |
| Responder | `responder.vikram@sankatsetu.demo` |
| NGO | `ngo@sankatsetu.demo` |
| Volunteer | `volunteer.meera@sankatsetu.demo` |
| Donor | `donor.rohan@sankatsetu.demo` |
| Citizen | `citizen.kavya@sankatsetu.demo` |

## What was implemented

### Authentication and access control

- Public registration accepts only `CITIZEN`, `VOLUNTEER`, and `DONOR`; privileged accounts are created by an admin or the seed script.
- Passwords are hashed with bcryptjs (cost 12) and never returned.
- Access and refresh tokens are set as HttpOnly cookies (`rs_access`, `rs_refresh`); no token is included in response bodies.
- Logout increments `tokenVersion`, so previously issued tokens are rejected immediately.
- RBAC middleware protects every privileged route. Ownership is enforced in services, never trusted from request bodies.
- Access token refresh, session restoration, and sign-out are wired into the existing UI.

### Emergency reporting and tracking

- Anonymous or authenticated SOS submission with server-generated ticket ID (`RS-XXXXXX`) and an unguessable tracking token.
- Public tracking uses `GET /emergencies/ticket/:ticketId` with the `X-Tracking-Token` header. Ticket tokens are stored client-side per device.
- Reporter identity and private contact details are limited to staff and the reporter; public serializers redact them.
- Status and verification are separate, validated state machines. AI never changes verification automatically.
- Geospatial nearby queries use a 2dsphere index.
- AI analysis via `POST /emergencies/:id/analyze`: admin/responder only, rate-limited, backend-only API key, strict schema parsing, timeout handling, and `503 AI_UNAVAILABLE` when no key is configured. It never fabricates an analysis.

### Coordination workflows

- Admin/responder mission assignment, responder self-claim, mission lifecycle (`ASSIGNED → EN_ROUTE → ARRIVED → COMPLETED` / `CANCELLED`), and responder availability/location updates.
- Responders see only their own missions.
- NGOs manage only their own resources; dispatch decreases stock and creates an audit trail.
- Relief camps with occupancy and supply status; admin-only mutations.
- Donations for guests or signed-in donors, unguessable donation tracking IDs and tokens, append-only delivery events, and donor read-only access to their own donations. Donors cannot append events.
- Volunteer tasks with join, check-in, check-out, and validated status transitions.
- In-app notifications for user/role-relevant updates, plus read and read-all endpoints.
- Admin user management, audit logs, alerts, and aggregate stats.

### Real-time and frontend integration

- Socket.IO handshake authenticates from HttpOnly cookies (or an explicit handshake token) and joins server-controlled rooms: `public`, `user:<id>`, `role:<role>`.
- Events are emitted only after the database operation succeeds and always use sanitized, audience-appropriate serializers.
- Dashboards subscribe through `src/api/realtime.ts`; auth state is shared with the existing App shell.
- Loading, empty, and error states were added to the connected dashboards. The orange / green / white identity and layout were preserved.

## API reference

Base URL: `/api/v1`. All responses use:

```json
{ "success": true, "message": "...", "data": { } }
```

```json
{ "success": false, "message": "...", "code": "ERROR_CODE", "errors": [] }
```

### Public and authentication

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/health` | Public | Database, cache, and AI configuration status |
| GET | `/alerts` | Public | Active public alerts |
| POST | `/auth/register` | Public | Only CITIZEN, VOLUNTEER, DONOR |
| POST | `/auth/login` | Public | Sets HttpOnly cookies |
| POST | `/auth/refresh` | Refresh cookie | Reissues access and refresh cookies |
| GET | `/auth/me` | Authenticated | Current user |
| POST | `/auth/logout` | Optional auth | Revokes the session via `tokenVersion` |
| GET | `/camps` | Public | Relief camps; optional auth |
| GET | `/camps/:id` | Public | Camp detail |
| GET | `/responders` | Public | Active responders; optional auth |
| GET | `/responders/nearby` | Public | Geospatial query |
| GET | `/responders/:id` | Public | Responder detail |
| GET | `/volunteer-tasks` | Public | Open tasks |
| GET | `/volunteer-tasks/:id` | Public | Task detail |
| GET | `/emergencies` | Public / staff | Public view redacts private fields; staff see the full record |
| GET | `/emergencies/:id` | Public / owner / staff | Audience-aware serialization |
| GET | `/emergencies/nearby` | Public | Active reports near a point |
| GET | `/emergencies/ticket/:ticketId` | Tracking token, owner, or staff | Requires `X-Tracking-Token` unless authenticated as owner/staff |
| POST | `/emergencies` | Public, optional auth | Returns ticket ID and tracking token once |
| POST | `/donations` | Public, optional auth | Returns donation tracking ID and token once |
| GET | `/donations/track/:trackingId` | Tracking token, donor, or staff | Requires `X-Tracking-Token` unless authorized |

### Emergency management

| Method | Path | Access |
| --- | --- | --- |
| PATCH | `/emergencies/:id/status` | Admin, responder |
| PATCH | `/emergencies/:id/verification` | Admin only |
| POST | `/emergencies/:id/analyze` | Admin, responder (AI rate limit) |

### Missions

| Method | Path | Access |
| --- | --- | --- |
| POST | `/missions/assign` | Admin |
| POST | `/missions/:emergencyId/claim` | Responder |
| GET | `/missions/my` | Responder |
| GET | `/missions` | Admin |
| GET | `/missions/:id` | Admin, assigned responder |
| PATCH | `/missions/:id/status` | Admin, assigned responder |

### Responders

| Method | Path | Access |
| --- | --- | --- |
| GET | `/responders/me` | Responder |
| PATCH | `/responders/me/location` | Responder |
| PATCH | `/responders/me/status` | Responder |

### Resources and camps

| Method | Path | Access |
| --- | --- | --- |
| GET | `/resources` | Admin, NGO, responder |
| POST | `/resources` | NGO (own), admin |
| GET | `/resources/:id` | Admin, NGO (own), responder |
| PATCH | `/resources/:id` | NGO (own), admin |
| POST | `/resources/:id/dispatch` | NGO (own), admin |
| POST | `/camps` | Admin |
| PATCH | `/camps/:id` | Admin |
| PATCH | `/camps/:id/occupancy` | Admin |

### Donations, volunteers, notifications

| Method | Path | Access |
| --- | --- | --- |
| GET | `/donations` | Admin, NGO, donor (donors see their own) |
| GET | `/donations/:id` | Admin, NGO |
| POST | `/donations/:id/events` | Admin, NGO — append-only; donors cannot append |
| GET | `/volunteer-tasks/mine` | Volunteer |
| POST | `/volunteer-tasks` | Admin, NGO |
| POST | `/volunteer-tasks/:id/join` | Volunteer |
| PATCH | `/volunteer-tasks/:id/check-in` | Volunteer |
| PATCH | `/volunteer-tasks/:id/check-out` | Volunteer |
| PATCH | `/volunteer-tasks/:id/status` | Admin, NGO |
| GET | `/notifications` | Authenticated (own) |
| PATCH | `/notifications/:id/read` | Authenticated (own) |
| PATCH | `/notifications/read-all` | Authenticated (own) |

### Uploads and administration

| Method | Path | Access |
| --- | --- | --- |
| POST | `/uploads` | Public, optional auth; multipart field `file`; images JPG/PNG/WEBP and audio MP3/M4A/OGG/WAV/WEBM; size limit from env |
| GET | `/users` | Admin |
| POST | `/users` | Admin |
| PATCH | `/users/:id` | Admin |
| GET | `/audit-logs` | Admin |
| POST | `/alerts` | Admin |
| GET | `/admin/alerts` | Admin (full alert history) |
| GET | `/stats` | Admin |

Tracking tokens are single-purpose, random values. Only their SHA-256 hashes are stored. Comparisons are constant-time. Ticket and donation tokens are returned exactly once at creation.

## Socket.IO events

Clients connect to the same origin (`/socket.io`). The server derives identity from the HttpOnly cookie during the handshake; clients cannot choose their role or join arbitrary rooms.

| Event | Audience | Trigger |
| --- | --- | --- |
| `emergency:created`, `emergency:updated` | Public; staff variants | SOS creation and status/verification changes |
| `emergency:analyzed` | Admin, responder | Successful AI analysis |
| `camp:created`, `camp:updated` | Public; staff variant | Camp changes |
| `alert:new` | Public | New public alert |
| `mission:created`, `mission:updated` | Admin + assigned responder | Mission lifecycle |
| `donation:created`, `donation:updated` | Admin/NGO, donor | Pledge and delivery events |
| `volunteer-task:updated` | Public, volunteer, admin | Join/check-in/status changes |
| `responder:location`, `responder:status` | Public, admin | Responder updates |
| `resource:updated`, `resource:dispatched` | Admin/NGO/responder as applicable | Inventory changes |
| `notification:new` | `user:<id>` | New in-app notification |

## Security controls

- Helmet security headers, `no-store` on sensitive responses, and sanitized text input (`sanitize-html`).
- Explicit CORS allow-list from `CLIENT_URL`; credentialed requests only from allowed origins.
- `express-rate-limit`: 300 API requests / 15 min, 20 auth attempts / 15 min, 15 anonymous reports / hour, 30 uploads / hour, 10 AI analyses / hour, 90 tracking requests / 15 min. Limits are skipped only in the test environment.
- Zod validation for params, query strings, and bodies; consistent error envelopes; centralized error handler.
- HttpOnly, `SameSite=Lax` cookies in development and `SameSite=None; Secure` in production; refresh cookie scoped to `/api/v1/auth`.
- Ownership checks in services; no client-supplied role, actor, or owner fields are trusted.
- Admin-only operations are protected by both route authorization and service checks.
- Reporter private data is removed in public serializers; locations are never exposed for private reports beyond what the audience allows.
- AI output cannot set verification or status; it is advisory metadata only.
- Upload MIME allow-list, size limit, random file names, and static serving limited to the upload directory.
- Secrets live only in environment variables; `.env`, `server/.env`, and upload directories are git-ignored. `.env.example` contains empty placeholders.

## Running checks

```bash
# Backend
cd server
npm run typecheck
npm test
npm run build

# Frontend (project root)
npm run lint
npm run build
```

### Actual verification results (2026-10-24)

| Check | Result |
| --- | --- |
| Backend typecheck (`tsc --noEmit`) | Passed |
| Backend tests (`vitest run`) | **40 / 40 passed** in 6 files (~26.65 s), using mongodb-memory-server and a mocked AI service |
| Backend build (`tsc -p tsconfig.build.json`) | Passed |
| Frontend build (`tsc -b && vite build`) | Passed; JS 571.89 kB (gzip 163.70 kB), CSS 36.12 kB; Vite chunk-size warning (>500 kB) only |
| Frontend lint (`oxlint`) | **0 errors, 3 advisory warnings** (two `set-state-in-effect` advisories and one unused prop) |
| Live API + Socket.IO harness | **97 checks passed, 0 failed** (temporary harness, removed after the run) |
| Health endpoint | HTTP 200 with database connected |

The automated tests cover registration restrictions, cookie sessions, logout revocation, RBAC, ownership isolation, emergency creation/tracking/status transitions, donation token access and append-only events, mission lifecycle, and inventory/dispatch behavior.

### Browser validation

The following flows were exercised in a real browser against the running frontend and backend:

- Responder: assigned mission moved through `EN_ROUTE` → `ARRIVED` → `COMPLETED`; responder availability returned to `AVAILABLE`.
- NGO: resource dispatch reduced stock (8190 → 8140) and updated the dashboard.
- Donor: pledge created (`RS-DON-2XRE4B`) and appeared in the donor dashboard.
- Volunteer: joined a task and the remaining-slot count updated.
- Citizen: anonymous SOS produced a real ticket (`RS-772560`); the tracking token persisted across drawer close/reopen; the ticket was retrievable through the tracking API.
- Registration UI offered only Citizen, Volunteer, and Donor.
- Sign-out cleared the admin form and protected views.
- Browser geolocation was simulated for automation to create the SOS; this was not a real GPS reading. When geolocation was denied, the UI correctly refused to submit rather than invent a location.

## Manual end-to-end walkthrough

1. Start MongoDB, the backend, and the frontend as shown above; run `npm run seed`.
2. Open the app, sign in as the citizen, and submit an SOS with a description and a location. Copy the ticket ID; close and reopen the tracking drawer to confirm the ticket and token are restored.
3. Sign in as the admin in another browser profile. Verify the report, then assign a mission to Asha.
4. Sign in as `responder.asha@sankatsetu.demo`. Move the mission through `EN_ROUTE`, `ARRIVED`, and `COMPLETED`; confirm the emergency becomes resolved and realtime updates appear in the admin tab.
5. Sign in as the NGO. Dispatch a resource and confirm stock decreases.
6. Sign in as the donor. Create a pledge, note the donation tracking ID, and confirm the record appears in the donor list.
7. Sign in as the volunteer. Join a task, check in, and check out.
8. As the admin, create an alert and confirm it appears in the public alert banner without a reload.
9. Sign out and confirm protected screens redirect to authentication and the API rejects old cookies.
10. Run the backend tests and frontend build commands above.

## Limitations and notes

- No live Gemini request was made because no API key was configured. AI behavior is covered with a mocked service; without a key the endpoint returns `503` and the UI does not invent an analysis.
- Redis is optional and was not tested against a live Redis server; the app was verified with the in-memory/no-cache path.
- Uploads use local disk storage. The upload API and media UI were not exercised end-to-end in this verification pass; voice recording requires microphone permission.
- Browser geolocation during automation was simulated, as disclosed above. The real permission-denied path was verified.
- Realtime delivery was validated through the API harness; no automated multi-browser Socket.IO test is committed.
- In-app notifications only; no email/SMS/push provider is integrated.
- The frontend bundle exceeds Vite's 500 kB advisory threshold. Code-splitting was not added because the task prioritized preserving the existing UI.
- `src/api/mockData.ts` remains in the repository as an unused legacy artifact; connected screens no longer read it.
- Admin user management and audit-log APIs are implemented and admin-only; the existing UI primarily uses emergency, alert, and audit data. The admin user-management screens were not expanded beyond the preserved frontend.
- Local dashboard session storage keeps ticket/donation tokens. Clearing site data loses access to anonymous tracking codes by design.
- Production deployment requires HTTPS and a reverse proxy configuration that forwards cookies and WebSocket upgrades.

## Key files

- [`server/src/config/env.ts`](server/src/config/env.ts) — startup environment validation and production JWT guard
- [`server/src/middleware/authenticate.ts`](server/src/middleware/authenticate.ts) — cookie/token authentication and `tokenVersion` checks
- [`server/src/serializers/emergency.serializer.ts`](server/src/serializers/emergency.serializer.ts) — audience-aware emergency output
- [`server/src/services/emergency.service.ts`](server/src/services/emergency.service.ts) — tracking, status machine, proximity, AI orchestration
- [`server/src/services/donation.service.ts`](server/src/services/donation.service.ts) — donation tokens and append-only events
- [`server/src/services/mission.service.ts`](server/src/services/mission.service.ts) — mission lifecycle and responder assignment
- [`server/src/sockets/index.ts`](server/src/sockets/index.ts) — authenticated Socket.IO rooms
- [`src/api/client.ts`](src/api/client.ts) — centralized API client and error handling
- [`src/api/adapters.ts`](src/api/adapters.ts) — backend/frontend model mapping and token persistence
- [`server/tests/`](server/tests) — integration tests

## Curl examples

```bash
# Register a citizen (cookies are saved to cookies.txt)
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Test Citizen","email":"citizen@example.com","phone":"9999999999","password":"StrongPass123!","role":"CITIZEN"}' \
  http://localhost:5000/api/v1/auth/register

# Submit an anonymous SOS
curl -s -H "Content-Type: application/json" \
  -d '{"title":"Flooded street","description":"Water is rising near the market.","category":"FLOOD","urgency":"HIGH","location":{"lat":28.6139,"lng":77.2090}}' \
  http://localhost:5000/api/v1/emergencies

# Track the report with the token returned above
curl -s -H "X-Tracking-Token: <token>" \
  http://localhost:5000/api/v1/emergencies/ticket/RS-XXXXXX

# Sign in and reuse the HttpOnly session cookie
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@sankatsetu.demo","password":"<seed password>"}' \
  http://localhost:5000/api/v1/auth/login

curl -s -b cookies.txt http://localhost:5000/api/v1/auth/me
```

## License

Hackathon project for the MSIT CodeYourCult build. No license file is included.
