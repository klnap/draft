export const DRAFT_MODES = ['live', 'share'] as const

export const LIVE_TTL_SECONDS = 3600
export const SHARE_TTL_SECONDS = 86_400

export const TOKEN_MAGIC = 'NDM1' as const
/** @deprecated NDS1 — `openSessionWithKey` rejects; use NDS2 binding wire. */
export const SESSION_MAGIC = 'NDS1' as const
export const SESSION_MAGIC_V2 = 'NDS2' as const

export const SESSION_RESOURCE_UTF8_MAX = 64
export const SESSION_ID_UTF8_MAX = 256
export const SESSION_DESTINATION_UTF8_MAX = 512
export const SESSION_ENTRY_SLUG_UTF8_MAX = 256

export const SESSION_COOKIE_NAME = '__ndm_session' as const
export const PREVIEW_REQUEST_HEADER = 'x-ndm-preview-request' as const
/** Set by {@link forwardDraftPreviewLocaleHeaders} from `/draft?locale=` (optional i18n). */
export const DRAFT_PREVIEW_LOCALE_HEADER = 'x-draft-preview-locale' as const

export const CLOCK_SKEW_SECONDS = 60
export const DEFAULT_BOOTSTRAP_PATH = '/api/draft' as const

export const TOKEN_HKDF_PURPOSE = 'next-draft-mode/v1/token' as const
export const SESSION_HKDF_PURPOSE = 'next-draft-mode/v1/session' as const
