export function localeCode(locale: unknown): string | null {
  if (typeof locale === 'string' && locale.length > 0) return locale
  if (locale && typeof locale === 'object' && 'code' in locale) {
    const code = String((locale as { code: string }).code)
    return code.length > 0 ? code : null
  }
  return null
}
