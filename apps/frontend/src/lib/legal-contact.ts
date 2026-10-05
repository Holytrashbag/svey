// Operator contact details for the Impressum and Datenschutz pages.
//
// They are injected at build time (VITE_LEGAL_*) rather than committed, so the
// public repository carries no personal address or phone number. Unset values
// render as bracketed placeholders, which the legal pages' draft banner already
// tells the operator to fill in.

export type LegalContact = {
  name: string
  street: string
  city: string
  email: string
  phone: string
}

function value(raw: string | undefined, placeholder: string): string {
  const trimmed = raw?.trim()
  return trimmed ? trimmed : placeholder
}

export const legalContact: LegalContact = {
  name: value(import.meta.env.VITE_LEGAL_NAME, '[Name]'),
  street: value(import.meta.env.VITE_LEGAL_STREET, '[Straße Hausnummer]'),
  city: value(import.meta.env.VITE_LEGAL_CITY, '[PLZ Ort]'),
  email: value(import.meta.env.VITE_LEGAL_EMAIL, '[E-Mail]'),
  phone: value(import.meta.env.VITE_LEGAL_PHONE, '[Telefon]'),
}
