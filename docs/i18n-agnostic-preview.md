# i18n-agnostic draft preview

Draft preview is **query-surface** (`/draft?resource=&id=&locale=`). Locale is optional everywhere.

## Matrix (what works without extra host code)

| | Payload localized | Payload not localized |
| --- | --- | --- |
| **CMS Live Preview** | `locale` from admin → `buildDraftSurfacePath` | URL without `locale`; `DraftPage` uses `defineDraft.defaultLocale` or `''` in `load()` |
| **Share draft** | `surface.locale` in share API body | same, locale omitted |
| **Next `DraftPage`** | `?locale=` passed to `load({ locale })` | omit `locales` / `defaultLocale` in `defineDraft` or set only `defaultLocale` |
| **Layout shell** (header/messages) | optional `draftPreviewLocaleProxy` + `getDraftLocale()` | shell uses host default when helper returns `undefined` |

No next-intl, react-intl, or Payload types in `@klnap/draft` core paths.

## Host responsibilities (minimal)

1. **Edge / proxy** — before i18n middleware redirects `/draft`, call `draftPreviewLocaleProxy(req)` (or chain manually). Skips when `?locale=` absent.
2. **Draft layout** (optional chrome) — `const locale = await getDraftLocale()` then wire your own `LocaleLayout` / messages. Package does not ship UI shell.
3. **`defineDraft({ locales?, defaultLocale? })`** — optional allowlist for `DraftPage` only; omit for single-locale sites.

## What the package does *not* do

- Validate locale codes (no `hasLocale`, no BCP-47).
- Choose fallbacks for layout — `getDraftLocale()` returns `undefined` when missing.
- Replace site i18n routing — published routes stay in `app/[locale]/…` (or equivalent); `/draft` is intentionally outside `[locale]` segment.

## next-intl (Stolbek)

Keep `next-intl` middleware for published routes; for `/draft` return early with `draftPreviewLocaleProxy` so `locale` is not stripped and is visible in RSC via header.

## Other stacks

Middleware forwards `?locale=` into a header so layouts call `getDraftLocale()` — see [host-getters.md](./host-getters.md).
