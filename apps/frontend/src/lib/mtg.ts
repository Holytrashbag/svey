export const MANA: Record<string, { bg: string; fg: string }> = {
  W: { bg: '#F3E4B5', fg: '#3a2e0c' },
  U: { bg: '#4A8FE7', fg: '#08213f' },
  B: { bg: '#6B5B85', fg: '#0d0915' },
  R: { bg: '#E8654E', fg: '#2c0a02' },
  G: { bg: '#4BAE6E', fg: '#03200f' },
  C: { bg: '#B8B8C8', fg: '#0b0b14' },
}

export const GT_TINT: Record<string, string> = {
  W: 'rgba(243,228,181,0.07)',
  U: 'rgba(74,143,231,0.10)',
  B: 'rgba(107,91,133,0.14)',
  R: 'rgba(232,101,78,0.10)',
  G: 'rgba(75,174,110,0.09)',
  none: 'rgba(255,255,255,0.02)',
}

export const MANA_BG: Record<string, string> = {
  W: '#F3E4B5', U: '#4A8FE7', B: '#6B5B85', R: '#E8654E', G: '#4BAE6E', C: '#B8B8C8',
}

export const AVATAR_ROLE = {
  you:     { bg: '#3A2B5C', fg: '#C4B5FD' },
  crown:   { bg: '#3D2E10', fg: '#F4B942' },
  admin:   { bg: '#2A2256', fg: '#A78BFA' },
  default: { bg: '#232845', fg: '#A8AABF' },
} as const

export function colorStripBg(colors: string[], direction: 'horizontal' | 'vertical' = 'horizontal'): string {
  if (!colors.length) return 'rgba(255,255,255,0.04)'
  if (colors.length === 1) return MANA[colors[0]!]?.bg ?? '#888'
  const step = 100 / colors.length
  const stops: string[] = []
  colors.forEach((c, i) => {
    const hex = MANA[c]?.bg ?? '#888'
    stops.push(`${hex} ${step * i}%`, `${hex} ${step * (i + 1)}%`)
  })
  const angle = direction === 'vertical' ? '180deg' : '90deg'
  return `linear-gradient(${angle}, ${stops.join(', ')})`
}

export function deckIconBg(colors: string[]): string {
  if (!colors.length) return '#181C30'
  return `linear-gradient(135deg, ${colors.map(c => (MANA[c]?.bg ?? '#888') + '70').join(', ')})`
}
