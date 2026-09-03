# Creative OS — Codex Context

## Purpose

This repository is the web control plane for Creative OS, a multi-brand ad-production platform. It presents creative records synchronized from Notion, triggers backend generation workflows, supports review and editing, manages Meta Ads upload and launch operations, and displays analytics and creative intelligence.

The companion backend repository is located at:

```text
D:\DD\dd-creative-os-backend
```

## System Architecture

```text
Notion
  ↓ synchronization/webhooks
MongoDB creative mirror
  ↓
FastAPI API + Celery workers
  ├─ LLM generation and validation
  ├─ Frame.io asset discovery
  ├─ Meta Ads upload, launch, and analytics
  └─ PostgreSQL/pgvector operational data
  ↓
Next.js frontend (this repository)
```

The frontend must never access MongoDB, PostgreSQL, Notion, Meta, Frame.io, or LLM providers directly. Those integrations and their credentials belong in the backend.

## Frontend Stack

- Next.js 16 App Router
- React 19
- TypeScript
- TanStack Query for server state, mutations, polling, and cache invalidation
- Tailwind CSS 4
- Lucide icons
- HttpOnly cookie sessions for authentication

Before changing Next.js behavior, read the applicable documentation under `node_modules/next/dist/docs/`. This project uses a newer Next.js version whose APIs and conventions may differ from older versions.

## Important Locations

```text
src/app/                         Routes and layouts
src/app/(auth)/                  Sign-in and sign-up
src/app/(dashboard)/             Protected application pages
src/components/creatives/        Creative, batch, generation, and Meta UI
src/components/layout/           Navigation and brand switcher
src/components/ui/               Shared UI primitives
src/hooks/                       TanStack Query hooks
src/lib/api/client.ts            API client interface
src/lib/api/products.ts          Real HTTP adapter and endpoint mapping
src/lib/api/types.ts             Shared frontend API contracts
src/lib/api/mock-adapter.ts      In-memory demo implementation
src/lib/api/index.ts             Real/mock adapter selection
src/lib/api/auth.ts              Authentication client
src/middleware.ts                Early cookie-based route protection
```

## Application Areas

- `/creatives`: browse batches and creatives, filter by brand/phase/status, search, and trigger generation.
- `/creatives/[id]`: inspect a creative or batch and perform concept-level workflow actions.
- `/analytics`: view Meta performance and request analytics refreshes.
- `/intelligence`: inspect concept-level aggregate intelligence.
- `/intelligence/[id]`: inspect and run analysis for an individual concept.
- `/uploaded-products`: inspect uploaded ads, refresh analytics, and launch paused ads.
- `/agents`: configure available generation/deconstruction agents and models.
- `/settings`: edit the runtime copywriter prompt; currently not linked in the sidebar.
- `/sign-in` and `/sign-up`: email/password authentication.
- `/auth/google/callback`: Google OAuth completion.

## Backend API Boundary

The frontend's backend contract is centralized in `src/lib/api/products.ts`. The main endpoint groups are:

- `/v1/auth/*`: session authentication and Google OAuth.
- `/v1/products/*`: creative listing, detail, counts, generation, copy editing, Frame.io assets, batch operations, and Meta operations.
- `/v1/analytics/*`: aggregate and per-creative Meta analytics.
- `/v1/intelligence/*`: concept and ad intelligence.
- `/v1/agents/*`: agent/model configuration.
- `/v1/settings/*`: runtime prompt settings.

Keep HTTP details in the API adapter. Components should use hooks rather than calling `fetch` directly.

## Data and State Model

The primary frontend entity is `Creative` in `src/lib/api/types.ts`.

Two independent state machines must not be conflated:

1. Creative/Notion workflow status:
   - `not_started`
   - `in_progress`
   - `checkpoint`
   - `revision`

2. Copy-generation status:
   - `idle`
   - `in_progress`
   - `completed`
   - `failed`

Meta operations have a third state machine:

- `not_uploaded`
- `uploading`
- `uploaded_paused`
- `launching`
- `active`
- `failed`

The backend is authoritative for terminal states. The frontend may display optimistic progress, but it must not invent successful completion.

## Persistence Responsibilities

- MongoDB is the source of truth for the Notion-derived creative feed consumed by the UI.
- PostgreSQL stores platform and operational records such as users, sessions, jobs, brands, knowledge, analytics snapshots, and Meta records.
- Redis backs Celery jobs and transient coordination.
- Per-brand knowledge and policy files live in the backend `brands/` directory.

The hybrid MongoDB/PostgreSQL design is intentional. Confirm which store owns a field before changing a contract or persistence path.

## Authentication

The backend sets the `cos_session` HttpOnly cookie.

- `src/middleware.ts` performs an early cookie-presence redirect.
- `src/app/(dashboard)/layout.tsx` validates the session against `/v1/auth/me` before rendering protected content.
- Browser API calls use `credentials: "include"`.
- Mock mode bypasses backend authentication for local standalone development.

Do not move session tokens into browser-readable storage.

## Real and Mock Modes

Adapter selection is controlled by:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_USE_MOCK
```

- Real mode uses `src/lib/api/products.ts`.
- Mock mode uses `src/lib/api/mock-adapter.ts`.

When changing the `ApiClient` interface or a shared response type, update both adapters unless the feature is explicitly unavailable in mock mode.

## Query Conventions

- Put queries and mutations in `src/hooks/`.
- Use stable, parameter-complete query keys.
- Invalidate both detail and list queries after mutations when their data overlaps.
- Poll only while a backend operation is active.
- Generation and Meta polling intervals should stop on terminal states.
- Preserve backend errors for actionable user feedback.

## Brand Behavior

Backend brand data currently includes NUMY, Holy Mouthwash, and Soralune. The frontend sidebar currently exposes only:

- `numy`
- `holy-mouthwash`

The brand switcher is hardcoded in `src/components/layout/sidebar.tsx`; it does not currently load `/v1/brands`. Treat adding another visible brand as a frontend and backend-contract task, not merely a data-folder change.

## Security Notes

- Never put secrets in variables prefixed with `NEXT_PUBLIC_`; those values may be included in browser bundles.
- `NEXT_PUBLIC_ADMIN_API_TOKEN` and any similar existing configuration should be considered legacy/risky and migrated to a server-only mechanism before production use.
- Preserve `credentials: "include"` for cookie-authenticated requests.
- Do not expose Notion, Meta, Frame.io, database, or LLM credentials through frontend code or responses.

## Known Documentation Drift

The repository README does not fully describe the current product. In particular, analytics, intelligence, authentication, agent configuration, uploaded-product management, and Meta workflows are implemented beyond the original placeholder UI described there. Prefer current code and API types over the README when they conflict.

## Change Guidelines

1. Inspect the relevant page, hook, API adapter method, shared type, and backend route before changing a feature.
2. Maintain separation between UI state and backend-authoritative workflow state.
3. Keep API response normalization inside the adapter rather than scattering it through components.
4. Preserve real and mock adapter compatibility.
5. Avoid editing unrelated user changes in either repository.
6. For cross-repository contract changes, update and verify the backend schema/route and frontend type/adapter together.
7. Run targeted lint/type/build checks appropriate to the changed surface.

## Backend Entry Points

Useful companion files in `D:\DD\dd-creative-os-backend`:

```text
app/api/main.py                 FastAPI application and router registration
app/api/creatives.py            Main UI-facing creative and batch routes
app/api/auth.py                 Authentication and Google OAuth
app/api/analytics.py            Meta analytics routes
app/api/intelligence.py         Intelligence routes
app/services/creatives.py       MongoDB creative mapping and state logic
app/workers/tasks.py            Celery generation and analysis tasks
app/config.py                   Backend configuration
docker-compose.yml              Full local backend infrastructure
brands/                         Brand knowledge, policies, and evidence
```

