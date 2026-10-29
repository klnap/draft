# Preview security boundaries (P0)

## Route and session (NDS2)

- NDM1 seals `destinationPath` (pathname for full-page; legacy `/draft?…` for component preview).
- NDS2 seals `destinationPathname`, `authScope`, and `entrySlug`.
- Proxy: full-page uses `requestPathMatchesSessionBinding`; legacy uses `requestMatchesSessionScope`.
- Mismatch → **404**, no preview header injection.

## SSR draft reads (`enforcePreviewDraftReadOptions`)

- Trusted preview (cookie + `PREVIEW_REQUEST_HEADER`) forces **`draft: true`** on SDK reads.
- Does **not** restrict which collections/globals the page may load (§9.0.0e).
- **`PAYLOAD_API_TOKEN`** remains a residual: direct REST to CMS bypasses the web SSR boundary.

## Share issuance (`POST /api/preview/share-url`)

- Requires `req.user`.
- P0 accepts **full-page pathnames** only (legacy `/draft?` → **400**).
- Payload read ACL with `overrideAccess: false` before `bootstrapDraftSurface`.
- Missing doc and denied read → identical **403** body (`{ "error": "Forbidden" }`).

## Live vs share

- **Share:** ACL enforced on the share endpoint at issuance.
- **Live:** minted for an authenticated CMS editor; P0 does not re-run read ACL on every `livePreview.url()`.

## Cross-app contract

- CMS `custom.draft.publishedLink.routes` and web `previewRoutes` must match (`tests/contract/preview-routes.contract.test.ts`).
- Dynamic route segments require a host `resolveCollectionId` (or equivalent) aligned with published path templates.

## Deployment

- Restrict `frame-ancestors` (CSP) to your admin UI origin in production.
- `DRAFT_MODE_SECRET` must match between CMS and web.
