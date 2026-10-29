# Manual verification matrix — `@klnap/draft`

**Goal:** Exhaustive manual E2E pass of the package in a **two-host** setup: **Payload producer** (token issuer + admin preview URLs) and **Next consumer** (bootstrap route, proxy, draft surface). Use before release or after meaningful changes to tokens, bootstrap, preview URLs, proxy lifecycle, or host wiring. Each row = one scenario to check off.

## Related specs

| Topic | Spec |
| :--- | :--- |
| Payload plugin API (`liveDraft`, `shareDraft`, `publishedLink`) | [README.md](../README.md#configuration) |
| Protocol (NDM1 / NDS1, bootstrap) | [docs/spec/secure-draft-live-preview.md](../docs/spec/secure-draft-live-preview.md) |
| Adapter boundaries & consumer wiring | [docs/adapters.md](../docs/adapters.md) |
| Three surfaces (overview) | [README.md](../README.md) |

## Legend

| Column | Meaning |
| :--- | :--- |
| **ID** | Stable identifier (`D-x.y.z`) for reports |
| **Trigger** | User action or HTTP request |
| **Pre** | Preconditions |
| **Expected** | Expected outcome (UI, status, cookies, content) |
| **Fail** | Unacceptable behavior |
| **□** | Pass / Fail / Skip / N/A |

**Constants (configure per deployment):**

| Symbol | Meaning |
| :--- | :--- |
| `{ADMIN}` | Payload admin UI base URL |
| `{API}` | Payload REST base (plugin uses `routes.api`, default `/api`) |
| `{LIVE}` | Published site origin — `preview.liveUrl` on producer |
| `{DRAFT_ORIGIN}` | Draft surface origin — `preview.draftUrl` or same as `{LIVE}` (path mode) |
| `{BOOTSTRAP}` | Consumer bootstrap URL — `{DRAFT_ORIGIN}` + `bootstrapPath` (default `/api/draft`) |
| `{DRAFT_SURFACE}` | Draft page path — `/draft?resource={slug}&id=` (optional `locale=` when i18n); mount may include `[locale]` segment per consumer `defineDraft({ locales })` |
| `{RESOURCE}` | Collection or global slug wired in producer `custom.draft` and consumer `pages` registry |
| `{SECRET}` | Shared root secret — **must match** on producer and consumer |

**Three surfaces (glossary):**

| Surface | Source | Bootstrap token? | `publishedLink` paths? |
| :--- | :--- | :---: | :---: |
| Live Preview (iframe) | `admin.livePreview` | yes (`mode=live`) | no |
| Share draft | admin button | yes (`mode=share`) | no |
| Open published | `admin.preview` | **no** | yes (`path` / `paths`) |

## Before you start (hosts + dev)

| ID | Check | □ |
| :--- | :--- | :--- |
| D-0.1 | `{SECRET}` identical on **producer** and **consumer** | |
| D-0.2 | Producer: `draft({ secret, preview: { liveUrl, draftUrl? } })` in Payload config | |
| D-0.3 | Consumer: `defineDraft({ secret, preview, locales?, pages })` — every `{RESOURCE}` on producer has a matching `pages` key | |
| D-0.4 | Consumer: bootstrap route (`.route` from `createDraftProxy()`), draft proxy in request chain, `DraftPage` mounted at draft surface path | |
| D-0.5 | Issuer and consumer apps run against dev/staging DB and env the tester controls | |
| D-0.6 | Payload user with edit access on at least one **collection** and one **global** that declare `custom.draft` | |
| D-0.7 | Optional: second browser profile (share link without Payload session) | |
| D-0.8 | DevTools → cookies on `{DRAFT_ORIGIN}` (`__ndm_session`, lifecycle cookies) | |

**Test session header:** date, package version, commit, tester, `{LIVE}` / `{DRAFT_ORIGIN}`, notes.

---

## 1. Plugin composition and schema

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-1.1 | Collection **without** `custom.draft` | any unconfigured slug | No plugin `livePreview`; no share UI | Auto iframe | |
| D-1.2 | Collection **with** `custom.draft` | `{RESOURCE}` collection | `admin.livePreview.url` builds bootstrap on `{DRAFT_ORIGIN}` | No Live Preview | |
| D-1.3 | Global with `custom.draft` | `{RESOURCE}` global | Live Preview + optional `admin.preview` when `publishedLink` enabled | | |
| D-1.4 | `draft({ enabled: false })` | producer restart | No `{API}/preview/share-url`; no admin merge | Partial wiring | |
| D-1.5 | Payload import map after share client component change | host rebuild | Share button renders (`SHARE_DRAFT_PREVIEW_BUTTON`) | importMap error | |

---

## 2. Live Preview (admin iframe)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-2.1 | Open Live Preview on collection document | saved draft, `id` exists | Iframe: `{BOOTSTRAP}?token=…` → `{DRAFT_SURFACE}` with `resource={RESOURCE}&id=` | 403 / blank | |
| D-2.2 | Non-default admin locale | localized document | `locale=` on draft surface when consumer has `locales` | Always default locale | |
| D-2.3 | Edit field in admin while preview open | host live-preview listener | Iframe content updates | Hard refresh only | |
| D-2.4 | Global — Live Preview | global `{RESOURCE}` | `resource={RESOURCE}` without `id` | Wrong resource / spurious `id` | |
| D-2.5 | New document before first save | no `id` | Live Preview URL `null` / disabled | Bootstrap without id | |
| D-2.6 | Shortened `liveDraft.ttl` (test config) | e.g. 120s | After token expiry, reopen preview for new token | Eternal token | |
| D-2.7 | `liveDraft.refreshOnActivity: true` | activity in iframe | Session/cookies refresh on navigation (see §7) | Immediate logout | |

---

## 3. Share draft (admin → external link)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-3.1 | Click share control on document edit | logged into Payload | `POST {API}/preview/share-url` **200**; toast with TTL (~24h default) | **401** | |
| D-3.2 | Clipboard after D-3.1 | — | URL on `{DRAFT_ORIGIN}`; `token=` param | `{LIVE}` without token | |
| D-3.3 | Open link without Payload session | valid token | Draft visible; no admin login required | Admin login gate | |
| D-3.4 | Share before document saved | no `id` | Error toast; no URL | **200** with empty id | |
| D-3.5 | `POST …/preview/share-url` without session | — | **401** | **200** | |
| D-3.6 | Body: invalid `path` | — | **400** Invalid preview path | **200** | |
| D-3.7 | `shareDraft: { enabled: false }` on schema | plugin default on | No share button | Button visible | |
| D-3.8 | TTL override in POST body | `ttl` in request | Clamp min 60s, max share cap | TTL outside clamp | |

---

## 4. Published link (no token)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-4.1 | Open published preview from admin | `publishedLink` + param values set | `{LIVE}` + resolved path for active locale; **published** revision | Token in URL | |
| D-4.2 | Switch admin locale | `paths.{locale}` or `path` | Path template matches selected locale | Wrong locale segment | |
| D-4.3 | Default locale | `localePrefix` from plugin | Prefix matches consumer routing | Extra/missing prefix | |
| D-4.4 | Global with `publishedLink.path: '/'` | — | `{LIVE}` root (+ prefix if configured) | 404 | |
| D-4.5 | Missing route param (e.g. slug) | empty required field | Preview URL `null` / disabled | Broken URL | |
| D-4.6 | `publishedLink.enabled: false` on schema | — | No `admin.preview` | Link still in UI | |
| D-4.7 | Open published while share draft session active | both | Published shows live; draft only on `{DRAFT_SURFACE}` | Published shows draft | |

---

## 5. Bootstrap HTTP (`GET {BOOTSTRAP}`)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-5.1 | No `token` query | — | **400** | **200** | |
| D-5.2 | Two `token` query params | — | **400** | Accepts one | |
| D-5.3 | `token` + `path` or `destinationPath` | — | **400** | Open redirect | |
| D-5.4 | Token signed with wrong secret | — | **403** | Session set | |
| D-5.5 | Token past `exp` | stale link | **403** | Draft redirect | |
| D-5.6 | Valid token (live or share) | — | **302** to `destinationPath`; `Set-Cookie: __ndm_session` | No cookie | |
| D-5.7 | Bootstrap with `Sec-Fetch-Dest: iframe` | Live Preview | `draft_surface=embedded`; no gate query | Top-level gate on iframe | |
| D-5.8 | Top-level bootstrap (share) | share link | `dg=` query + `draft_gate` cookie | No gate on share | |
| D-5.9 | Next `draftMode().enable()` after bootstrap | — | Subsequent requests see draft mode | Cookie only, no enable | |

---

## 6. Draft surface and `pages` registry

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-6.1 | `GET {DRAFT_SURFACE}` without session | draft mode off | **404** (consumer draft layout gate) | Public preview | |
| D-6.2 | After bootstrap — collection `{RESOURCE}` | valid session | Registered `pages[{RESOURCE}].View`; draft data loaded | 500 unknown resource | |
| D-6.3 | After bootstrap — global `{RESOURCE}` | valid session | Global entry renders | Wrong loader | |
| D-6.4 | Compound page (host pattern) | host registers multi-fetch `load` | Combined draft UI per host design | | |
| D-6.5 | Unknown `resource` query | session OK | Controlled error / empty (host `pages` miss) | Crash | |
| D-6.6 | Meta / robots | draft surface | `noindex, nofollow` (host layout) | Draft indexed | |
| D-6.7 | Bad `locale` + `id` combo | — | Sensible error or empty state | Infinite loading | |

---

## 7. Lifecycle, proxy, and soft session

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-7.1 | After bootstrap: lifecycle cookies | DevTools | `draft_intent`, `draft_abs_exp`, optional `draft_idle_exp`, `draft_surface` | Missing lifecycle | |
| D-7.2 | `refreshOnActivity: true` — navigate in draft | share/live | `draft_idle_exp` extended; session alive | Immediate end | |
| D-7.3 | No activity past idle cap | long wait | Session expires; next request without draft | Eternal session | |
| D-7.4 | After `draft_abs_exp` (soft cap live 12h / share 24h) | — | New bootstrap required | Draft after cap | |
| D-7.5 | Proxy: request on **draft hostname** without session | `{DRAFT_ORIGIN}` ≠ `{LIVE}` | **404** or clear cookies (per config) | Public draft host | |
| D-7.6 | Proxy: share gate — open surface without `dg` | top-level share | Rejected / redirect clear | Full access | |
| D-7.7 | Static assets during draft | CSS/JS | Load (consumer static-assets handling) | 404 on framework assets | |
| D-7.8 | Manual cookie clear | — | Next `{DRAFT_SURFACE}` → **404** | Still in draft | |

---

## 8. Security and abuse

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-8.1 | Tamper `destinationPath` in token | — | **403** on verify | Redirect off-host | |
| D-8.2 | Reuse bootstrap token after session expired | — | Fresh token from producer required | Old token forever | |
| D-8.3 | Share link opened by third party | — | Draft surface for that document only; no Payload admin | Admin access | |
| D-8.4 | `Cache-Control` on bootstrap | — | `private, no-store` | CDN caches token | |
| D-8.5 | Referrer on bootstrap | — | `Referrer-Policy: no-referrer` | Token in Referer | |
| D-8.6 | X-Robots on draft responses (proxy) | — | `noindex, nofollow` | Indexing | |
| D-8.7 | Producer `read` access for draft content | consumer loaders | Host passes credentials / draft flag so loaders read versions — not public anonymous draft API | Open draft REST | |

---

## 9. i18n and published paths

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-9.1 | Plugin `publishedLink.localePrefix` | multiple locales | Prefix matches consumer public routing | Mismatch 404 | |
| D-9.2 | `paths.{locale}` vs default `path` | same param values | Different URL per locale | One path for all | |
| D-9.3 | Localized route param | per-locale field values | Correct segment per locale | Wrong segment | |
| D-9.4 | Live Preview without `locale` in query | consumer `defaultLocale` | Fallback in `buildDraftSurfacePath` | Crash | |
| D-9.5 | Legacy `routes` map (optional host) | no `locales` on consumer | Documented legacy `/${locale}/…` behavior | Silent break | |

---

## 10. `path` vs `origin` mode (preview config)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-10.1 | `draftUrl` **omitted** (path mode) | same origin as `liveUrl` | Bootstrap and draft on `{LIVE}` | Origin mismatch | |
| D-10.2 | `draftUrl` on separate host | split origin | Tokens on draft host; published on `{LIVE}` | Token on wrong host | |
| D-10.3 | `secure: false` dev, `sameSite` | HTTP localhost | Bootstrap sets cookies | No session | |
| D-10.4 | `sameSite: 'none'` without `secure` | — | `defineDraft` / factory **throws** | Silent bad config | |

---

## 11. Configuration flags (plugin + schema)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-11.1 | Default TTL | no override | live **3600s**; share **86400s** | | |
| D-11.2 | Schema overrides plugin `shareDraft.ttl` | both set | Schema value (after clamp) | Plugin wins incorrectly | |
| D-11.3 | `liveDraft.enabled: false` (schema) | — | Resolve + UI match README configuration | Live despite flag | |
| D-11.4 | `refreshOnActivity: false` | share | No idle extension | Continuous extension | |
| D-11.5 | TTL &lt; 60 in config | — | Clamped to **60** | **400** / crash | |
| D-11.6 | TTL &gt; soft cap | live &gt; 12h | Clamped to `DRAFT_SOFT_ABSOLUTE_CAP_SECONDS` | | |

---

## 12. Host responsibilities (outside the package)

| ID | Trigger | Pre | Expected | Fail | □ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| D-12.1 | Publish document after draft edits | versions/drafts enabled | Published link shows live revision; draft surface still draft until publish | | |
| D-12.2 | Collection `access.read` for preview loaders | consumer fetches API | Draft versions reachable with host auth strategy | 403 on whole preview | |
| D-12.3 | Cache revalidation (optional host) | publish hook | Live site updates after publish | Stale live (host concern) | |
| D-12.4 | URL consistency (optional host) | slug/path change | Public URLs stay consistent with `publishedLink` templates | Drift (host concern) | |

---

## 13. Technical smoke after changes

From the package root:

```bash
bun run test
```

| ID | Check | □ |
| :--- | :--- | :--- |
| D-13.1 | Golden vectors in `tests/unit/core/golden.test.ts` pass | |
| D-13.2 | `bun run test:arch` — consumer proxy graph constraints | |
| D-13.3 | `bun run check:exports` (if public exports changed) | |
| D-13.4 | Producer host: Payload import map includes share UI path from package | |
| D-13.5 | Consumer host: edge proxy / `api/draft` import **config-only** (`draft.config`); `defineDraftPages` only via `register-pages.ts` on `DraftPage` route | |
| D-13.6 | Hosts import `@klnap/draft` / subpath exports only — no deep `src/core` paths | |

---

## Suggested order (multi-day)

| Day | ID range | Estimated time |
| :--- | :--- | :---: |
| 1 | D-0.*, D-1.*, D-2.*, D-5.1–D-5.6 | 2–3 h |
| 2 | D-3.*, D-4.*, D-6.* | 2–3 h |
| 3 | D-7.*, D-8.* | 2–3 h |
| 4 | D-9.*–D-12.*, D-10.* | 2 h |
| 5 | D-11.*, D-13.*, random regression | 1–2 h |

## Summary sheet

| Area | Pass | Fail | Skip | Notes |
| :--- | ---: | ---: | ---: | :--- |
| Host wiring (D-0) | | | | |
| Plugin / schema | | | | |
| Live Preview | | | | |
| Share draft | | | | |
| Published link | | | | |
| Bootstrap HTTP | | | | |
| Draft surface / pages | | | | |
| Lifecycle / proxy | | | | |
| Security | | | | |
| i18n / paths | | | | |
| Config flags | | | | |
| Host responsibilities | | | | |

**Signed:** _______________ **Date:** _______________
