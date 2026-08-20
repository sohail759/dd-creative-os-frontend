# Creative OS — Generation UI (Next.js)

Frontend for the AI ad-copy generation platform. Lists the creatives that are
synced from Notion, shows their status, lets you trigger copy generation and
review the generated headlines + primary text. Includes an Analytics page that
is a UI placeholder (dummy data) until Meta Ads integration lands.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- TanStack Query (React Query) for fetching + polling
- lucide-react icons

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the app defaults to **demo mode** (in-memory mock
adapter) so it runs standalone without the backend.

## Connecting the real backend

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000   # backend REST base URL
NEXT_PUBLIC_API_TOKEN=                       # optional bearer token
NEXT_PUBLIC_USE_MOCK=false                   # use the real HTTP API
```

The HTTP adapter lives in a single file: `src/lib/api/products.ts`. It calls
`GET /v1/products`, `GET /v1/products/:id`, `POST /v1/products/:id/generate`,
`GET /v1/products/:id/status`, `GET /v1/products/:id/upload-options`,
`POST /v1/products/:id/upload`, and `POST /v1/products/:id/launch`. Map these to the backend's exact routes in that
one file if they differ. The expected payloads match the `Creative` type in
`src/lib/api/types.ts` (see the mock data in `mock-data.ts` for an example).

The frontend never talks to MongoDB/Notion directly — everything goes through
the backend API, and credentials stay server-side.

## Data flow

```text
Notion database → sync → MongoDB → backend API → this UI
```

- The list is ordered by **Notion last-edited time** (most recent first).
- While any creative is `in_progress`, React Query polls the backend every 4 s
  and the UI shows a progressive "Generating…" step list. The terminal state
  always comes from the backend — the frontend never fakes completion.
- In-progress creatives that arrive without copy are automatically handed to
  the generation API on first load.

## Routes

| Route | Description |
|---|---|
| `/` → `/creatives` | Main dashboard: product cards, status filter (default: In Progress), generate + polling |
| `/creatives/[id]` | Creative detail: product info + all headlines/primary texts with copy buttons |
| `/analytics` | Placeholder analytics dashboard (dummy data) |
| `/settings` | Placeholder |

## Status model

`not_started` · `in_progress` · `completed` · `paused` · `failed`

## Mock vs real API

| Mode | When | Source |
|---|---|---|
| Mock | `NEXT_PUBLIC_USE_MOCK=true`, or unset + no `NEXT_PUBLIC_API_URL` | `src/lib/api/mock-adapter.ts` — in-memory, simulates the generation pipeline |
| Real | `NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_API_URL` | `src/lib/api/products.ts` — HTTP |

## Project structure

```text
src/
  app/
    (dashboard)/creatives/       # list + [id] detail
    (dashboard)/analytics/       # placeholder dashboard
  components/
    creatives/                   # product card, generate button, status filter
    layout/sidebar.tsx
    ui/                          # badge, copy button, skeleton, empty state, toast
  hooks/                         # useProducts, useProduct, useGenerateProduct
  lib/api/                       # types, http client, mock adapter, selection
  providers/                     # React Query + toast providers
```
