# Module 13: Design system and i18n

**Duration:** 40 min · **Level:** Beginner–Intermediate · **Prerequisites:** [Module 11](11-frontend-architecture.md)

Svey should feel like one product in two languages. Two systems make that happen: Tailwind design tokens with a small set of primitives, and typed translations with a test that keeps English and German in lockstep.

## Learning objectives

After this module you can:

- Use the design tokens (surfaces, text, accents, mana colors) instead of raw hex.
- Pick the right primitive (`Sb*`) and follow the bottom-sheet accessibility rule.
- Add a translated string correctly, including attributes, plurals of data, and markup inside sentences.
- Explain why pure helpers return i18n keys, not strings.
- Explain how notifications are localised on the client.

---

## Unit 1: The look

The brief is a **modern sports-stats app**: jewel tones on near-black, rounded cards, tabular numbers. **Not** fantasy kitsch: no parchment, no runes, no "Thou hast been vanquished". Dark mode is the default and only mode. Every layout must work at **360 px** wide.

Three fonts, self-hosted via `@fontsource`:

| Token | Font | Use |
|---|---|---|
| `font-display` | Space Grotesk | Headlines, stats, names |
| `font-body` | Manrope | Body text, buttons |
| `font-mono` | JetBrains Mono | Codes (invite codes, `DELETE` confirmation) |

---

## Unit 2: Tokens

Tailwind v4 has **no `tailwind.config.ts`**. Tokens are CSS variables in `@theme` inside [`src/style.css`](../../apps/frontend/src/style.css), and Tailwind generates utilities from them:

```css
@import "tailwindcss";

@theme {
  --color-bg-0: #06070D;     /* page */
  --color-bg-1: #0E1120;     /* cards */
  --color-bg-2: #181C30;     /* raised controls */
  --color-bg-3: #232845;     /* hover */

  --color-fg-0: #F5F4FB;     /* primary text … */
  --color-fg-4: #3A3A4D;     /* … deepest muted */

  --color-arcane: #8B5CF6;   /* purple: primary actions, "you" */
  --color-tide:   #14B8A6;   /* teal: live/positive accents */
  --color-crown:  #F4B942;   /* gold: winners, owner, guests */

  --color-success: #34D399;  --color-warning: #FBBF24;  --color-danger: #F87171;

  --color-mtg-w: #F3E4B5;  --color-mtg-u: #4A8FE7;  --color-mtg-b: #6B5B85;
  --color-mtg-r: #E8654E;  --color-mtg-g: #4BAE6E;  --color-mtg-c: #B8B8C8;

  --color-divider: rgba(255, 255, 255, 0.06);   /* plus overlay-1…5, scrim, *-wash … */

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --text-eyebrow: 9px;  --text-meta: 11px;  /* … */  --text-display: 28px;
}
```

So `--color-bg-1` becomes `bg-bg-1`, `text-bg-1`, `border-bg-1`; `--text-meta` becomes `text-meta`; `--color-arcane` supports opacity modifiers like `bg-arcane/10`.

**Rules:**

- Use tokens, not raw hex. You'll find some hex in older inline `:style` bindings and in [`lib/mtg.ts`](../../apps/frontend/src/lib/mtg.ts). The latter is legitimate: mana colors are needed as values to build gradients at runtime (`colorStripBg`, `deckIconBg`).
- `rounded-xl` / `rounded-2xl` for cards, `rounded-full` for pills and badges.
- `transition-*` utilities for interactive states; `active:scale-[0.97]` is the house press effect.
- No `<style scoped>` except for animations or third-party overrides. If a class combination repeats, make a component, not an `@apply`.

---

## Unit 3: Primitives

[`components/ui/`](../../apps/frontend/src/components/ui) holds the `Sb*` primitives: `SbAvatar`, `SbBadge`, `SbBottomNav`, `SbBracketBar`, `SbButton`, `SbChip`, `SbColorSpine`, `SbIcon`, `SbIconButton`, `SbPip`, `SbSpinner`, `SbStat`, `SbTabStrip`, `SbUpdateToast`. Check here before styling a button or a badge from scratch.

[`SbButton.vue`](../../apps/frontend/src/components/ui/SbButton.vue) shows the variant pattern: typed props and lookup tables of classes.

```ts
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'crown' | 'danger' | 'fab'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>(), { variant: 'primary', size: 'md', disabled: false })

const variantClasses: Record<string, string> = {
  primary:   'bg-arcane text-white hover:bg-arcane-2 active:bg-arcane-d',
  secondary: 'bg-bg-2 text-fg-0 border border-white/12 hover:bg-bg-3',
  danger:    'bg-danger/14 text-danger hover:bg-danger/20',
  // …
}
```

### Bottom sheets stay mounted

Sheets slide in from the bottom (`translate-y-full` ↔ `translate-y-0`) rather than mounting and unmounting, so the animation works both ways. A hidden sheet must not be focusable or announced by screen readers. Hence the rule, from [`GsBottomSheet.vue`](../../apps/frontend/src/components/game-setup/GsBottomSheet.vue):

```vue
<div
  class="absolute left-0 right-0 bottom-0 z-40 … transition-transform duration-260"
  :inert="!open"
  :class="open ? 'translate-y-0' : 'translate-y-full'"
>
```

`inert` removes the subtree from the tab order and the accessibility tree. **Every sheet binds `:inert="!open"`.**

---

## Unit 4: i18n setup

[`src/i18n/`](../../apps/frontend/src/i18n):

| File | Role |
|---|---|
| `index.ts` | `createI18n({ legacy: false, locale: detectInitialLocale(), fallbackLocale: 'en', … })`; keeps `<html lang>` in sync |
| `detect.ts` | `SUPPORTED = ['en', 'de']`; picks the saved choice (`localStorage['svey.locale']`), then the browser language, then `en` |
| `messages.ts` | Imports the JSON namespaces; **`en` defines the `MessageSchema` type** |
| `formats.ts` | Named date and number formats (`d(date, 'medium')`, `n(x, 'percent')`) |
| `locales/{en,de}/*.json` | `common`, `auth`, `decks`, `playgroups`, `game`, `profile`, `home`, `time`, `legal` |

The language switch is on the profile page ([`useLocaleStore`](../../apps/frontend/src/stores/useLocaleStore.ts) → `setI18nLocale`).

### The completeness test

[`messages.test.ts`](../../apps/frontend/src/i18n/messages.test.ts) flattens both trees and fails if:

1. `de` doesn't define **exactly** the same keys as `en`;
2. a translation has different `{params}` than English (e.g. `{name}` dropped);
3. any message is empty.

So a missing German string fails CI, not production.

---

## Unit 5: Writing translated UI

**Everything user-facing goes through `t()`**, including `aria-label`, `placeholder` and `title`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <button :aria-label="t('common.close')" @click="emit('close')">…</button>
  <span>{{ t('game.survey.howFelt', { name: currentPlayer.name }) }}</span>
</template>
```

**Markup inside a sentence** uses `<i18n-t>` with slots, so word order stays a translator's choice (see [`JoinSheet.vue`](../../apps/frontend/src/components/playgroups/JoinSheet.vue)):

```vue
<i18n-t keypath="playgroups.joinSheet.intro" tag="span">
  <!-- named slots fill {placeholders} in the message -->
</i18n-t>
```

**Pure helpers return keys, not strings.** `lib/` must stay framework-free and testable, so it returns i18n keys or tokens and the component translates:

```ts
// lib/game-tracker.ts
export function deathCauseKey(cause: DeathCause | null): string {
  // … returns e.g. 'game.deathCause.cmdr'
}

export type RelDeathToken = { key: 'game.relDeath.secAgo' | 'game.relDeath.minAgo'; n: number } | null

// lib/time.ts → composables/useFormat.ts
function relative(iso: string | null): string {
  const token = relativeTimeToken(iso)
  return 'n' in token ? t(token.key, { n: token.n }) : t(token.key)
}
```

**Dates and numbers** go through `useFormat()` (`relative`, `date`, `founded`) or `d()`/`n()` with a named format, never `toLocaleString()` with hard-coded options.

### Copy rules

- German uses informal **"du"**.
- **"Playgroup"** and **"Pod"** stay untranslated in German.
- Voice: playful but functional, witty microcopy, no fantasy clichés.
- Legal pages (Impressum, Datenschutz, Terms) are **German only** by design; operator details come from `VITE_LEGAL_*` at build time.

---

## Unit 6: Localised notifications

The server can't know the reader's language when it writes a notification, so it stores **`type` + `params`** and English `title`/`body` fallbacks. [`NotificationSheet.vue`](../../apps/frontend/src/components/home/NotificationSheet.vue) renders:

```ts
function titleKey(n: NotificationItem): string {
  const base = `home.notifications.types.${n.type}`
  return n.type === 'role_changed' ? `${base}.${n.params?.role ?? ''}` : `${base}.title`
}

function titleFor(n: NotificationItem): string {
  const key = titleKey(n)
  return n.params && te(key) ? t(key, n.params) : n.title   // fallback for old rows without params
}
```

`te(key)` checks that a translation exists. Rows written before migration `008` have no `params` and show the stored English title.

**Adding a notification type** therefore touches: a migration (`ALTER TYPE notification_type ADD VALUE`), `schema.ts`, the `NotificationType` union, the emitting service (with `params`), `home.notifications.types.<type>` in **both** locales, and the icon map in `NotificationSheet.vue`.

### Known gap: server error messages

API error messages (e.g. "You have already imported this deck.") are English and shown as-is. The error envelope already carries a stable `code`, which the client could map to translated messages.

---

## Summary

- Tokens live in `@theme` in `style.css`; use `bg-bg-1`, `text-fg-2`, `text-arcane`, never raw hex in templates.
- Check `components/ui/` for a primitive before building one; sheets stay mounted with `:inert="!open"`.
- Every string via `t()` (attributes too), `<i18n-t>` for markup in sentences, both locales always; a test enforces parity.
- Pure helpers return keys; notifications are localised from `type` + `params` with an English fallback.

## Knowledge check

**1. You add a button with only an icon. What does it need?**

- A) Nothing; icons are self-explanatory
- B) `:aria-label="t('…')"` with the key in both `en` and `de`
- C) A `title` attribute in English
- D) `aria-hidden="true"`

<details><summary>Answer</summary>

**B.** Accessible names are user-facing strings and go through i18n.
</details>

**2. You add `"tagline": "Hi {name}!"` to `en/home.json` and `"tagline": "Hallo!"` to `de/home.json`. What happens?**

- A) Works; German just omits the name
- B) `messages.test.ts` fails because the interpolation params differ
- C) A runtime error in German
- D) The key falls back to English

<details><summary>Answer</summary>

**B.** The test compares the `{params}` of every key across locales.
</details>

**3. Why does `deathCauseKey` return `'game.deathCause.cmdr'` instead of "Commander damage"?**

- A) Performance
- B) `lib/` stays framework-free and unit-testable; components translate keys with `t()`
- C) The text is too long
- D) Vue can't render strings from `lib/`

<details><summary>Answer</summary>

**B.**
</details>

**4. A hidden bottom sheet is still reachable with the Tab key. What's missing?**

- A) `v-if="open"`
- B) `:inert="!open"` on the sheet panel
- C) `tabindex="-1"` on the backdrop
- D) `display: none` in a scoped style

<details><summary>Answer</summary>

**B.** Sheets stay mounted for the slide animation; `inert` takes them out of focus order and the accessibility tree.
</details>

**5. You need a purple accent background at 10% opacity. Which class?**

- A) `bg-[#8B5CF6]/10`
- B) `bg-arcane/10`
- C) `style="background: rgba(139,92,246,.1)"`
- D) `bg-purple-500/10`

<details><summary>Answer</summary>

**B.** Use the token with Tailwind's opacity modifier.
</details>

---

**Next:** [Module 14: Testing and code quality →](14-testing-and-quality.md)
