# Design System Master File — ScienceLab

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
> Normative visual contract: `docs/UI_DESIGN.md`. Tokens: `src/app/globals.css`.

---

**Project:** ScienceLab
**Approved:** lab-instrument identity — warm dark surfaces, teal interactive accent,
copper progress/completion accent, graphite diagram linework, Space Grotesk
display + Geist body/mono. Rejected: playful/kids styles, green volumetric
themes, hover lifts, card shadows, marketing page patterns.

---

## Global Rules

### Color Palette

| Role | Light | Dark | Tailwind | Job |
|---|---|---|---|---|
| Page bg | `#FAFAF9` | `#0C0A09` | `bg-canvas` | canvas |
| Surface | `#FFFFFF` | `#151210` | `bg-surface` | cards |
| Raised | `#F5F5F4` | `#1E1A16` | `bg-raised` | hovers, wells |
| Line | black 10% | white 12% | `border-line` | 1px borders |
| Ink | `#171717` | `#F5F5F5` | `text-ink` | primary text |
| Ink 2 | `#525252` | `#A3A3A3` | `text-ink-2` | secondary text |
| Ink 3 | `#737373` | `#737373` | `text-ink-3` | metadata |
| Accent (teal) | `#20C9C3` | `#20C9C3` | `bg-accent` | progress-adjacent indicators only |
| Accent ink | `#0B6E6A` | `#5EEAD4` | `text-accent-ink` | links, active icons, markers |
| Copper | `#D97A2B` | `#E08A3C` | `text-copper`/`bg-copper` | progress traces, completion, priority edge |
| Copper glow | `#F5A524` | `#F5A524` | — | LED/glow highlights in diagrams |
| Diagram line | `#6B6F76` | `#8A8F98` | `text-diagram-line` | illustration graphite, never clickable |
| Success | `#15803D` | `#34D399` | `text-success` | correct answers, completed states |
| Warning | `#B45309` | `#FBBF24` | `text-warning` | attention states |
| Error | `#DC2626` | `#F87171` | `text-error` | errors, destructive confirm |

**Color Notes:** teal is interactive-only (links, active nav, focus, selection);
copper is progress/completion-only; diagrams never reuse interactive teal;
semantic colors never decorate. No gradients except the single dashboard-hero
brand wash where specified; no glassmorphism; no stock imagery.

### Typography

- **Display:** Space Grotesk 500–700 (`font-display`) — headings only.
- **Body/UI:** Geist sans (`font-sans`, default). **Mono/readouts:** Geist Mono
  (`font-mono`) — codes, counts, eyebrows, instrument-style labels.
- **Scale:** hero/display 4xl tight → page 2xl semibold → eyebrow xs semibold
  tracking-wide ink-3 → card title base semibold → metadata sm ink-2 → body sm/base.
- **Case rule:** sentence case everywhere. No all-caps labels, no dot-joined
  meta strings (separate visual slots), no typed arrow characters (chevron SVGs).

### Spacing Variables

| Token | Value | Usage |
|---|---|---|
| `gap-1` / `gap-2` | 4px / 8px | micro: icon+label, chips, deltas |
| `gap-3` / `gap-4` | 12px / 16px | related rows, grouped fields |
| `p-5` / `gap-5` | 20px | card interior |
| `gap-6` | 24px | grid gutters, section gaps |
| `gap-8` / `p-8` | 32px | macro: page sections, hero padding |
| Page padding | `px-4 sm:px-6`, `py-6 sm:py-8` | content column |
| Content width | `max-w-6xl` | every authenticated `main` |

Rule: padding inside a container is always smaller than the gap between
containers. 12-col grid, asymmetric 8/4 (never 6/6 without reason);
full-width rows sit below split rows.

### Borders, Radii, Elevation

- Borders: 1px token line. Radii: `rounded-lg` inputs/buttons/cards,
  `rounded-2xl` hero only, `rounded-full` pills/dots.
- Elevation: flat — no card shadows (single exception: elevated account
  dropdown). Depth comes from borders and fills, never shadows.

### Responsive

- `<768px`: single column, stacked sections, drawer nav via hamburger,
  primary actions stay in-flow (no floating bars except specified menus).
- `768–1023px` (`md`): 72px icon rail, 6-col grids where specified.
- `≥1024px` (`lg`): full 280px rail (dashboard shell) or page grids.
- Sticky elements: shell header, workspace topbar (desktop only), tab bars.
  Scroll content must never hide behind them; verify both viewports per change.

### Accessibility

- Global 2px accent `:focus-visible` ring, offset 2px — never removed.
- Labels on every input; `aria-label` on icon buttons; `role="alert"` errors;
  `aria-expanded` disclosures; `role="progressbar"` with values;
  `aria-current` nav/steps; state never by color alone.
- Skip-to-content link first in authenticated layout.
- `prefers-reduced-motion`: the single 150ms dropdown entrance disables;
  smooth scroll degrades; no other animation exists to gate.
- Contrast: body ≥4.5:1 both themes; verify, never assume across themes.

---

## Component Specs

Primitives live in `src/app/ui/` and `src/app/dashboard/`. Pages compose
them; pages never re-specify button/input/card geometry.

### Buttons (`ui/Button.tsx`)

- Primary: solid foreground fill, white text, `rounded-lg`, static label
  (never swaps while pending), disabled at 50% opacity.
- Secondary: 1px bordered. Destructive: two-step inline confirm, error text.
- Ghost/link rows: chevron icon elements, never typed arrows.

### Inputs (`ui/Field.tsx` + native elements)

- Label (`text-sm font-medium`, `htmlFor`), transparent 1px-bordered
  `rounded-lg` `px-3 py-2` control, helper `text-xs ink-3`, single assertive
  error region. Password eye toggle: 44px target, `aria-label`+`aria-pressed`.
- Selects, textareas, radios (fieldset+legend), checkboxes, datetime-local,
  filter chips (`aria-pressed`), toggles (`aria-pressed`) follow the same geometry.

### Cards (`ui/Card.tsx`)

- Surface, 1px line border, `rounded-lg`, `p-5` (`p-6` hero-scale only).
- Card header pattern: eyebrow label + title + optional count/link row.
- Dividers (`border-t`) only *inside* a card between same-kind rows.
- Catalogue cards: motif visual band, topic/level badge slots, clamped
  two-line display title, meta row, chevron CTA; featured item spans double
  with an Assigned marker where applicable.

### Badges

- Status pills: `rounded-full px-2 py-0.5 text-xs font-medium`, tinted
  fills (accent/success/error with 8–10% opacity fills); never bare color dots.
- Count badges: mono xs ink-3. Codes: mono semibold + copy button with
  `aria-live` confirmation.

### Navigation (`dashboard/AppShell.tsx`)

- Sidebar 280px (72px rail md, drawer mobile): wordmark/brand row, icon+label
  links, `aria-current="page"`, active = subtle accent tint + ink text.
- Profile block (avatar initials, name over role, chevron) opens the account
  dropdown (theme row, divider, log out; closes on outside/Escape/nav/logout).
- No account controls in the sidebar; no dead links anywhere.

### Dialogs

- Native `<dialog>` + `showModal`, `m-auto` centering (preflight reset
  requires it), dimmed backdrop, Escape + backdrop-click close,
  `aria-labelledby`. Used for join-class and similar single-task flows.

### Feedback states

- Errors: single assertive region with the server message. Loading: static
  label + disabled (no layout shift). Skeletons only for known-length
  content. Empty states: plain-language state + what unlocks it + inline
  action; name the delivering phase for future work.

---

## Style Guidelines

**Style:** restrained lab-instrument modernism.

**Keywords:** precise, quiet, technical, trustworthy, calm, readable.

**Best For:** secondary-school STEM practicals, teacher operations.

**Key Effects:** 150ms color transitions, focus rings, progress traces —
nothing else moves.

### Page Pattern

**Pattern Name:** task-first dashboard.

- **Conversion Strategy:** the single next action is visually dominant
  (continue/resume CTA); everything else is honest context. No marketing
  funnels, no sticky hero CTAs, no social proof — this is a tool, not a
  landing page.
- **CTA Placement:** one primary action per context, in-flow.
- **Section Order:** identity/context strip → hero next-action →
  assigned/current work → catalogue/browse → history/review → reference rail.

---

## Anti-Patterns (Do NOT Use)

- ❌ **Playful kids theming** — no rounded-toy cards, bubbly fonts, mascot
  illustration, or "avoid dark mode" direction.
- ❌ **Volumetric green/indigo marketing themes** — no replacements of the
  approved token set, no Exo/Roboto restacks, no hover lifts, no card shadows.
- ❌ **Emojis as icons** — hand SVGs only, `aria-hidden` when decorative.
- ❌ **Missing cursor affordances** — all clickables show pointer + hover feedback.
- ❌ **Layout-shifting hovers** — no transforms that move surrounding content.
- ❌ **Low contrast text** — 4.5:1 minimum both themes, verified per change.
- ❌ **Instant state changes** — 150ms color transitions; reduced-motion respected.
- ❌ **Invisible focus states** — global accent ring, never removed.
- ❌ **Faked data/UI** — no invented numbers, dead buttons, or capabilities
  without backend (search, notifications, streaks/goals, predictive flags).
- ❌ **New UI frameworks or icon libraries** — zero new deps without an
  approved MVP need (ENGINEERING.md dependency discipline).

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Tokens only, no raw hex outside `globals.css`
- [ ] Sentence case; chevron icons; separate meta slots; display headings
- [ ] `cursor-pointer` + hover feedback on clickables; static button labels
- [ ] Text contrast 4.5:1 both themes; dividers visible both themes
- [ ] Focus visible; labels/roles/states announced; reduced motion safe
- [ ] Responsive: 375px + desktop; no overlap; no horizontal scroll
- [ ] `tsc`, `eslint`, `vitest`, relevant Playwright journey green
