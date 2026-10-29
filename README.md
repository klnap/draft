# @klnap/draft

Signed bootstrap tokens and session cookies for **draft preview** and **Live Preview** between Payload CMS and a Next.js (or compatible) frontend.

## Table of contents

- [Purpose and scope](#purpose-and-scope)
- [Getting started](#getting-started)
- [Features](#features)
- [Three preview surfaces](#three-preview-surfaces)
- [Configuration](#configuration)
- [Package exports](#package-exports)
- [Security](#security)
- [Testing](#testing)
- [Further reading](#further-reading)

---

## Purpose and scope

### Problem

Previewing unpublished content safely requires:

- Short-lived, signed **bootstrap URLs** from the CMS to the frontend
- A **session cookie** bound to a canonical pathname and auth scope
- Clear separation between **live site**, **draft preview**, and **share links**

Without a shared protocol, teams reimplement HMAC tokens, cookie sealing, and path ACLs in every project.

### What this package provides

| Layer | Role |
| --- | --- |
| `@klnap/draft` (core) | NDM1 bootstrap tokens, NDS2 session cookies, path matching, `enforcePreviewDraftReadOptions`, adapter types |
| `@klnap/draft/producers/payload` | Payload `draft()` plugin — Live Preview URL, share endpoint, published link, `admin.livePreview` wiring |
| `@klnap/draft/consumers/next` | `defineDraft`, bootstrap `GET` handler, optional `createDraftProxy`, query or pathname routing |

Framework-agnostic crypto lives in `core/`. **Next** and **Payload** are optional peers (see `peerDependenciesMeta`).

### Out of scope

- Content fetching implementation (you call Payload/API with `draft: true` when preview is active)
- IAM/RBAC (use `@klnap/payload-iam` separately)
- Redirect rules (`@klnap/payload-redirect` may consume published-path helpers from the producer)

---

## Getting started

### Prerequisites

| Requirement | When |
| --- | --- |
| Node `^24`, Bun `>=1.4` (scripts) | Package development |
| Shared secret ≥ 24 characters | Same value on CMS and frontend (`DRAFT_MODE_SECRET`) |
| Payload `>=3.90.2` | Producer only |
| Next `>=15` | Consumer only |
| React 19, `@base-ui/react` | Producer admin buttons (optional peers) |

Wire the producer on Payload and the consumer on Next (see [Configuration](#configuration)).

### 1. Shared secret

Generate one secret (min 24 characters). CMS producer and Next consumer **must** match.

### 2. Payload producer

```ts
import { buildConfig } from 'payload'
import { draft } from '@klnap/draft/producers/payload'

export default buildConfig({
  plugins: [
    draft({
      secret: process.env.DRAFT_MODE_SECRET!,
      preview: {
        liveUrl: process.env.FRONTEND_URL!,
        draftUrl: process.env.FRONTEND_DRAFT_URL, // optional; defaults to liveUrl
      },
      liveDraft: { ttl: 3600, refreshOnActivity: true },
      shareDraft: { enabled: true, ttl: 86_400, refreshOnActivity: true },
      publishedLink: { enabled: true },
    }),
  ],
})
```

Per collection/global, configure published paths:

```ts
custom: {
  draft: {
    publishedLink: {
      path: '/projects/[slug]',
      paths: { pl: '/projekty/[slug]', de: '/projekte/[slug]' },
      params: { slug: { field: 'slug', localized: true } },
    },
    shareDraft: { enabled: false },
  },
},
```

### 3. Next consumer

Call **`defineDraft()`** at least once with **`secret`** and **`preview.liveUrl`**. You can pass **`pages`** in the same call, or register pages in a **second** call that only adds `pages` (merged into the same process-wide registry — see [defineDraft (Next)](#definedraft-next)).

**Recommended: one module** (import from bootstrap route and `app/draft/page.tsx`):

```ts
// src/draft/config.ts
import { createDraftQueryLocalePathStrategy, defineDraft } from '@klnap/draft/consumers/next'
// Host-owned page modules — names are illustrative; implement load + view per resource.
import { loadProject, ProjectLivePreview } from './pages/projects'
import { loadLayout, LayoutDraft } from './pages/layout'

defineDraft({
  secret: process.env.DRAFT_MODE_SECRET!,
  preview: {
    liveUrl: process.env.APP_URL!,
    draftUrl: process.env.APP_DRAFT_URL,
  },
  paths: createDraftQueryLocalePathStrategy(),
  locales: ['en', 'pl'],
  defaultLocale: 'en',
  pages: {
    projects: { load: loadProject, view: ProjectLivePreview },
    layout: { load: loadLayout, view: LayoutDraft },
  },
})
```

**Optional split** (keeps page bundles off the edge proxy): core config in `draft/config.ts` (as above without `pages`), then `defineDraft({ pages: { … } })` only from `register-pages.ts` imported by `app/draft/page.tsx`. The second call must not change `secret` or `preview` URLs.

**Bootstrap route:**

```ts
// app/api/draft/route.ts
import '@/draft/config'
export { GET } from '@klnap/draft/consumers/next'
```

**Optional edge proxy** (keep free of page modules):

```ts
import { createDraftProxy } from '@klnap/draft/consumers/next'

export const draftProxy = createDraftProxy({
  secret: process.env.DRAFT_MODE_SECRET!,
  preview: { liveUrl: process.env.APP_URL!, draftUrl: process.env.APP_DRAFT_URL },
})
```

### 4. Draft reads

Use server-only modules for `next/headers`:

```ts
import { enforcePreviewDraftReadOptions } from '@klnap/draft'

const opts = await enforcePreviewDraftReadOptions({ draft: false }, previewActive)
await payload.find({ ...opts, collection: 'projects' })
```

---

## Features

- **NDM1** — HMAC-signed bootstrap tokens (`destinationPath`, `mode`, TTL, refresh policy)
- **NDS2** — Session cookie bound to canonical pathname + collection/global id
- **Live Preview** — iframe bootstrap from Payload `admin.livePreview`
- **Share draft** — authenticated `POST /api/preview/share-url` with pathname ACL
- **Open published** — `admin.preview` link to live site (no token)
- **Edge proxy** — optional soft-session gate (`createDraftProxy`) without React in the proxy bundle
- **Query surface** — recommended `/draft?resource=&id=` via `DraftPage` + `defineDraft({ pages })`
- **Full-page mode** — optional localized pathname + `previewRoutes` on the consumer

---

## Three preview surfaces

| Surface | URL origin | Path | Token |
| --- | --- | --- | --- |
| Live Preview | `draftUrl` | Real page path | yes (`mode: live`) |
| Share draft | `draftUrl` | Same | yes (`mode: share`) |
| Open published | `liveUrl` | From `publishedLink` | no |

Same **origin** for `liveUrl` and `draftUrl` (scheme, host, and port) → **path mode**. Different origins → **origin mode** (e.g. split draft subdomain).

---

## Configuration

### `draft()` plugin (Payload)

| Key | Purpose |
| --- | --- |
| `publishedLink.enabled` | Global default for `admin.preview` |
| `liveDraft` / `shareDraft` | TTL and `refreshOnActivity` |
| `canShareDraft` | Optional hook after path match, before ACL |
| `livePreview.breakpoints` | Optional toolbar breakpoints (Desktop, Mobile, …) |

### `defineDraft` (Next)

| Key | Purpose |
| --- | --- |
| `secret` | Required on first call (min 24 characters) |
| `preview.liveUrl` / `preview.draftUrl` | Required on first call; sets path vs origin mode |
| `pages` | Resource slug → `{ load, view }` for `/draft?resource=&id=` |
| `previewRoutes` | Allowlist for pathname mode |
| `resolveCollectionId` | Required when templates have dynamic segments |
| `paths` | Path strategy (e.g. `createDraftQueryLocalePathStrategy()`) |
| `locales` / `defaultLocale` | Optional; used by `DraftPage` locale handling |
| `sessionCookie` / `secure` | Cookie attributes (`secure` defaults from `NODE_ENV`) |

**Multiple calls:** after the first registration, later `defineDraft({ pages })` calls **merge** `pages` and optional routing fields. A second call with a different `secret` or `preview` URL throws. See [`define-draft.ts`](src/consumers/next/define-draft.ts) and [Adapter boundaries](./docs/adapters.md).

Defaults and validation are defined in the `draft()` plugin options and `custom.draft` schema (see [Configuration](#configuration) and producer types in source).

---

## Package exports

| Export | Role |
| --- | --- |
| `@klnap/draft` | Tokens, sessions, `enforcePreviewDraftReadOptions`, `previewRouteTemplatesFromPublishedLink`, constants |
| `@klnap/draft/consumers/next` | `defineDraft`, `createDraftProxy`, bootstrap `GET`, path strategies |
| `@klnap/draft/producers/payload` | `draft()` plugin, signing, share endpoint |
| `@klnap/draft/producers/payload/admin/*` | Live preview / share admin buttons (import map) |

Do **not** import producer code from the Next proxy bundle or consumer UI from Payload.

---

## Security

- Bootstrap tokens are short-lived; session TTL is independent ([docs/spec/secure-draft-live-preview.md](./docs/spec/secure-draft-live-preview.md))
- Share URL resolution is pathname-only; unknown paths → 403
- Payload `read` ACL with `overrideAccess: false` before share links
- CSP: restrict `frame-ancestors` to your CMS origin in production

---

## Testing

```bash
bun test
bun run test:security
```

Golden vectors: `tests/unit/core/golden.test.ts`.

---

## Further reading

- [Secure draft & live preview (normative)](./docs/spec/secure-draft-live-preview.md)
- [Adapter boundaries](./docs/adapters.md)
- [Security boundaries](./docs/security-preview-boundaries.md)
- [Secret rotation ADR](./docs/adr/0005-draft-secret-rotation.md)
