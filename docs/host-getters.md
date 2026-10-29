# Host `get*` API (`@klnap/draft/consumers/next`)

Three names for integration beside `defineDraft` / `DraftPage`:

| | Use |
| --- | --- |
| **`getDraft()`** | Registered config (`defineDraft` output): registries, secret, locales, preview URLs. |
| **`getDraftLocale()`** | Optional `locale` for layout chrome (from proxy header after `/draft?locale=`). `undefined` if absent. |
| **`getDraftContext()`** | Current request: `{ active, session, enforceDraft }` — Payload draft reads, live-preview API gates. |

Locale forwarding (middleware, not `get*`):

- `draftPreviewLocaleProxy(req)` — recommended on `/draft`
- `forwardDraftPreviewLocaleHeaders(...)` — manual proxy chain

`buildDraftSurfacePath` / `/draft?resource=` stay **producer/bootstrap** vocabulary; hosts rarely need them.

See [i18n-agnostic-preview.md](./i18n-agnostic-preview.md).
