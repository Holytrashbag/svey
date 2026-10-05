/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  /** API origin; the SPA calls `${VITE_API_URL}/api/...`. */
  readonly VITE_API_URL?: string
  /** Operator details for the Impressum/Datenschutz pages (see src/lib/legal-contact.ts). */
  readonly VITE_LEGAL_NAME?: string
  readonly VITE_LEGAL_STREET?: string
  readonly VITE_LEGAL_CITY?: string
  readonly VITE_LEGAL_EMAIL?: string
  readonly VITE_LEGAL_PHONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
