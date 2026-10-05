import { describe, it, expect } from 'vitest'
import { messages } from './messages'

type Tree = { [key: string]: string | Tree }

/** Flattens a message tree into `{ 'a.b.c': 'text' }`. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

/** Named interpolation params in a message, e.g. `{name}` → `name`. */
function params(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort()
}

const en = flatten(messages.en as Tree)
const de = flatten(messages.de as Tree)

describe('locale messages', () => {
  it('de defines exactly the same keys as en', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
  })

  it('every translation keeps the same interpolation params', () => {
    const mismatched = Object.keys(en).filter(
      (key) => de[key] !== undefined && params(en[key] ?? '').join() !== params(de[key] ?? '').join(),
    )
    expect(mismatched).toEqual([])
  })

  it('has no empty messages', () => {
    const empty = [...Object.entries(en), ...Object.entries(de)]
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)
    expect(empty).toEqual([])
  })
})
