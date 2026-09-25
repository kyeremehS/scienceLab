# ScienceLab UI Design

> Design contract for implementers. This document describes visual and interaction
> rules only. It introduces no product behavior; all behavior is owned by
> `REQUIREMENTS.md`, `USER_FLOWS.md`, and `API.md`. Where this document is
> silent, match the existing restrained interface rather than inventing new patterns.

## 0. Locked Visual Language

> Near-black + off-white + cyan/teal scientific accent + thin borders +
> technical diagrams + restrained geometry.

### Philosophy

ScienceLab looks like a product built around learning through experiments,
not a CRUD application for schools. Reference points: modern educational
product × precise technical tool × laboratory notebook — never admin-dashboard
software. Personality comes from typography, scientific diagrams, subtle grid
textures, spacing, and interaction states — not decoration.

### Layout philosophy

Sidebar + hero-as-current-state + summary cards + content cards, with
context sections (teachers, activity, first steps) in a quiet full-width
row below the main content — never a side rail competing with it. The
dashboard answers "what should I do next?", not "what records
exist?". The hero shows the student's live learning state (continue panel
when an attempt exists, orientation otherwise); the teacher hero shows
operational state. Every block is backed by live queries; upcoming slots are
omitted or honestly labeled — never faked.

### Design tokens (`src/app/globals.css`)

Components consume these tokens, never raw palette values:

| Token | Light | Dark |
|---|---|---|
| Page background (`--background`/`bg-canvas`) | `#FAFAF9` (warm off-white) | Near-black `#0A0A0A` |
| Surface (`bg-surface`) | `#FFFFFF` | `#141414` |
| Elevated (`bg-raised`, hovers) | `#F5F5F4` | `#1C1C1C` |
| Border (`border-line`) | Black 10% | White 12% |
| Primary text (`text-ink`) | `#171717` | `#F5F5F5` |
| Secondary text (`text-ink-2`) | `#525252` | `#A3A3A3` |
| Muted text (`text-ink-3`) | `#737373` | `#737373` |
| Accent (`--accent`: diagrams, indicators, focus, selection) | `#20C9C3` (single token, both themes) | `#20C9C3` |
| Accent text (`text-accent-ink`: links) | `#0B6E6A` (readable cut of the accent) | `#5EEAD4` (readable cut of the accent) |
| Circuit accent (`--circuit-accent`) | Follows `--accent` | Follows `--accent` |
| Error (`text-error`) | `#DC2626` | `#F87171` |
| Warm copper (`text-copper`: progress traces, completion glow) | `#D97A2B` | `#E08A3C` |
| Copper glow (`--copper-glow`: illustration highlights) | `#F5A524` | `#F5A524` |
| Diagram linework (`--diagram-line`: neutral graphite, never interactive teal) | `#6B6F76` | `#8A8F98` |
| Focus ring | 2px `var(--accent)`, offset 2px (global rule) | Same |

Teal is interactive-only (links, active states, focus, selection).
Copper is progress/completion only, never a link or focus color.
Diagram linework is graphite + copper glow so illustrations never read
as clickable.

### Display type

Headings use Space Grotesk (`font-display`, 500–700) for a technical,
instrument character; body and UI text stay quiet Geist. Eyebrow labels
use sentence case — hierarchy comes from size/weight/color, never
tracking or all-caps. Meta facts get separate visual slots, never
middle-dot-joined strings. Forward motion uses a chevron icon element,
never a typed arrow character.

Light mode is a luminance shift of the same identity, never a separate look.

**Motion:** subtle and purposeful only (label swaps, loading states). No
decorative animation.

**Tone:** technical, educational, practical. Landing and product copy state
what ScienceLab does (the Learn → Perform → Observe → Reflect → Assess loop);
never inflated claims ("AI-powered", "revolutionary", "personalized", "future of").

## 1. Visual Direction

Modern scientific publication + educational product + restrained interface.

- Light-first: token canvas surfaces, ink text. Dark mode mirrors with near-black surfaces.
- One accent color: the single `--accent` token for primary actions and key highlights. No additional accent colors.
- Scientific identity comes from **content-relevant illustration** (the simple electrical circuit — the MVP's first experiment), a faint measurement-grid backdrop, and precise typography — never from decorative gradients, blobs, or stock imagery.
- Depth is flat: 1px borders (token line), no drop shadows on cards, restrained radii (`rounded-lg` for inputs and buttons).

## 2. Auth Experience

### 2.1 Layout (desktop ≥1024px)

Split screen:

- **Left ~45%**: panel holding one composed, vertically centered block:
  ScienceLab wordmark, the statement "Learn science by doing.", supporting
  text, then the line-art circuit illustration. No large gaps between block
  elements. The panel follows the active theme (light: surface/ink;
  dark: near-black/off-white) with the circuit accent adapting via
  `--circuit-accent` — the whole page flips as one surface, never half-lit.
- **Right ~55%**: plain background, vertically centered form column capped at
  520px (`max-w-[520px]`), pulled toward the divider (`lg:justify-start` with
  left padding) so the middle gap stays narrow. The two surfaces stay
  distinct (panel `surface` vs page `canvas`) with no hard divider.

### 2.2 Layout (mobile <1024px)

Single column, stacked as one flow: compact brand block (wordmark, statement,
short description, circuit illustration at natural width), then the form
column. The mobile page must not feel like the squeezed desktop split — brand
and form are sequential sections, each vertically compact.

Circuit prominence tiers:

- `<480px`: small circuit (`max-w-[280px]`); the form gets priority.
- `480–1023px`: medium circuit (`max-w-sm`).
- `≥1024px`: full circuit (`max-w-md`) in the split-screen brand panel.

The brand panel is a full-bleed surface on mobile (no framed/bordered
container). The page uses normal document flow with no locked viewport
heights, so an open keyboard scrolls naturally and the form stays usable.

### 2.3 Login

- Heading `Welcome back`, subheading `Sign in to continue learning.`
- Fields: Email, Password (with in-field eye-icon toggle, `aria-label` + `aria-pressed`).
- Primary button: full-width `Sign in`, loading state `Signing in…` (disabled while pending).
- Secondary: `Forgot password?`, then `No account yet? Register`.
- Errors shown in a single `role="alert"` paragraph above the button: invalid input messages from server, or generic `Invalid email or password.` Never indicate which field failed.

### 2.4 Registration

- Heading `Create your account`, subheading `Start learning science by doing.`
- Fields per requirements (`FR-STU-01`, `FR-TEA-01`): Full name, Email, Password (min 8, shown as helper text), Confirm password (client-side match check only — never sent, never validated server-side), role selector `I am a…` (Student/Teacher radio, legend visually hidden but present for screen readers).
- Role selection chooses the endpoint (`/api/auth/register/student` vs `/teacher`); the body carries only name/email/password. The selector renders as two selectable cards (Student / Teacher) in a `fieldset` + `legend`; the native radio is visually hidden but remains the accessible control. Selected card: accent border + very subtle tint (`bg-accent/[0.05]`) — state, not emphasis. No Admin option exists anywhere in registration — the server exposes no admin-registration route and ignores body-provided roles.
- Primary button: full-width `Create account`, loading state `Creating account…`.
- Secondary: `Already have an account? Log in`.
- Errors in `role="alert"`: field validation, or `An account with this email already exists.` on duplicate. No terms/privacy text (no such pages exist in the MVP).

## 3. Form Components

- Labels: `text-sm font-medium`, always associated via `htmlFor`.
- Inputs: transparent background, 1px border, `rounded-lg`, `px-3 py-2`. Password fields use an in-field eye icon button (44px touch target, `aria-label`, `aria-pressed`); no separate text toggle. Focus: visible outline (default focus-visible ring, never removed).
- Buttons (primary): `rounded-lg`, solid foreground fill, disabled at 50% opacity while pending.
- Radio/fieldset: `fieldset` + `legend` for the role selector.

## 4. Validation, Loading, and Error States

- Client performs only format pre-checks (required attributes, `type="email"`, `minLength`); the server verdict is authoritative and its message is what renders.
- While pending: button disabled + loading label. Form stays interactive except submission.
- Errors: single assertive region (`role="alert"`), error-token text, preserved across renders until next submit.

## 5. Responsive Behavior

- Breakpoint: `lg` (1024px). Below it the brand panel stacks above the form.
- **Every UI change must be verified in both mobile and desktop viewports
  before it is considered done**: layout composition, control placement
  (nothing floating mid-page), illustration sizing tier, theme behavior on
  both surfaces, and scroll/keyboard usability. A change that works on only
  one viewport is incomplete.
- Form column width: capped at 520px on desktop; `max-w-md` on mobile.
- Brand and form blocks are each internally compact with no large vertical gaps; both sides vertically centered on desktop.
- No layout shift between idle/loading/error states (button label swaps, region reserved by flow).

## 6. Accessibility (`CR-11`)

- Keyboard: all controls reachable in logical order (brand panel is non-interactive); visible focus on every control.
- Labels for every input; `aria-label` on the password toggle (`Show password`/`Hide password`); `aria-describedby` for the password helper.
- Errors announced via `role="alert"`. State never communicated by color alone (text message always present).
- Secondary text meets contrast minimums in both themes; nav links follow §8.1 (never color-only: label text always present).

## 7. Typography and Spacing

- Typeface: Geist (sans + mono), as configured in `layout.tsx`. Headings semibold, tight tracking; body regular.
- Scale: brand statement ~3xl semibold; form heading 2xl semibold; subheading sm ink-2; labels sm medium.
- Product type scale: display (hero statements, 4xl tight) → page heading
  (2xl semibold) → section eyebrow (xs semibold, tracking wide, ink-3) →
  card title (base semibold) → metadata (sm ink-2, mono where codes/counts)
  → body (sm/base ink-2).
- Spacing: form fields `gap-4`, sections `gap-1` label-to-input, page padding `px-4 sm:px-6`, dashboard sections `gap-10`.
- Content width, global: every authenticated `main` is `max-w-6xl` so card
  grids use the space between sidebar and browser edge; grids add a third
  column at `lg` where cards would otherwise stretch.

## 8. Color Usage

| Token | Light | Dark |
|---|---|---|
| Page background (form side) | token canvas | token canvas |
| Brand panel | token surface | token surface |
| Primary text | token ink | token ink |
| Secondary text | token ink-2 | token ink-2 |
| Borders | token line | token line |
| Primary button | foreground fill | foreground fill |
| Error text | token error | token error |
| Accent (illustration, focus, selection) | token accent | token accent |
| Links | `NavLink` (`src/app/NavLink.tsx`), never raw values | Same |

## 8.1 Nav links (`NavLink`)

All back/nav-style links site-wide render through `src/app/NavLink.tsx`:

- Text `#5dcaa5`, no underline, `13px`, medium weight.
- Hover lightens to `#9fe1cb` with a `150ms` color transition.
- Arrow links (`←` / `→`) render the arrow as a separate `aria-hidden`
  span with a `6px` flex gap to the label.
- Title links (e.g. class names), buttons, and sidebar nav keep their own
  treatments — `NavLink` is for inline navigation only.

## 8.2 Theme (light/dark)

- Both themes are first-class: light default, dark mirror via class-based
  `dark:` variants (`@custom-variant` in `globals.css`).
- A sun/moon toggle is present on the landing page, auth screens, and both
  dashboards. On auth screens it sits in the brand header row on mobile
  (`lg:hidden`) and at the form corner on desktop — never floating mid-page.
  It persists to `localStorage` (`sciencelab-theme`) and falls back
  to the OS `prefers-color-scheme` setting; a head script applies the stored
  theme before paint (no flash). Storage failure degrades to session-only.

## 9. Do Not Use

- Purple/blue gradients, glassmorphism, floating blobs, AI sparkles, stock photos.
- Drop shadows on cards; radii larger than `rounded-lg`.
- Additional accent colors beyond the single accent + `NavLink` teal (§8.1) + neutrals + error.
- Terms/privacy links, onboarding wizards, social-login buttons, or any field beyond name/email/password(+confirm)/role.
- Client-side enforcement of any server rule (role, gating, eligibility).
- Statistics, charts, or progress bars without real backing data.
- Non-functional navigation entries (no dead links; search arrives with the catalogue in Phase 3).

## 10. Landing Alignment

The landing page shares the brand language: wordmark, `Learn science by doing.`
statement, product-loop subtext, and the same two actions (Get started / Log in). It must not introduce components, colors, or illustration styles that contradict this document.

Below the actions sits a LearningLoopDiagram (Learn → Perform → Observe →
Reflect → Assess with a return arc) — visually distinct from the auth circuit,
tied to the product loop. CTA buttons use the standard `rounded-lg` geometry.

## 11. Transactional Email

Restrained product emails, not marketing pages. Implementation:
`src/lib/email-templates.ts` (shared shell) + `src/lib/mailer.ts` (channel).

- Shared shell: header (SCIENCELAB) → content → single CTA → footer
  (ScienceLab / Learn science by doing.). Verification templates are omitted:
  email verification is deferred from the MVP.
- Always light (white/off-white body, near-black text) for client
  compatibility; accent CTA + readable link cut. Inline styles + table layout
  only.
- One CTA button plus a plain-link fallback underneath ("If the button
  doesn't work…"). Both HTML and plain-text MIME parts.
- Security (all already enforced, restated as contract): 256-bit RNG tokens,
  hash-only storage, 60-minute expiry, atomic single-use burn, no token
  logging, enumeration-safe endpoint responses, production origin comes from
  the request (HTTPS domain in prod, never hardcoded).

## 12. Teacher UI System

Dashboards answer three questions in order: what needs doing, what is
managed, what is happening. Section eyebrows (`text-xs` semibold tracking)
separate YOUR CLASSES / ACTIVE ASSIGNMENTS / RECENT ACTIVITY (teacher) and
equivalent student sections. Class names are the visual anchor on cards;
codes are mono with a copy action.

- Empty states are honest: they name the missing capability and the phase
  that delivers it. Never fake data, never dead buttons, never card-sprawl
  for its own sake — a serious tool, not a SaaS admin template.
- Authenticated pages share `PageHeader`: title + subtitle, utility controls
  (theme, logout) top-right on desktop and wrapped to their own row on
  mobile. Same header on every dashboard and detail page.
- Class detail order: workspace stat strip → tabs (Overview / Students /
  Assignments with counts). Assignment and progress sections stay as honest
  placeholders until Phases 6–7 implement them.
- Summary stats show only real numbers (class/student counts from live
  queries; assignments honestly 0 until Phase 7). No charts for charts' sake.

## 12.1 Product visual language

Circuit diagrams, measurement marks, experiment numbering, subtle lab-grid
backdrops, small technical labels. These appear as functional or orienting
elements (auth circuit, empty-state motif, workspace diagrams in Phase 4+),
never decoration. ScienceLab must not read as Linear-with-a-science-logo:
the student experience stays experiential, the teacher one managerial.

## 12.2 Student dashboard target (lands with Phases 4–7 data)

CONTINUE EXPERIMENT (current attempt: experiment, step x/y clamped to the
total, next action, copper progress trace, Continue CTA with chevron —
dominant card: larger padding, stronger border) → YOUR ASSIGNED WORK
(per-assignment progress) → RECENTLY COMPLETED. Catalogue cards carry a
per-topic motif (circuit / flask / leaf, graphite + copper glow), topic
and level in separate slots, and a featured first item (double width +
Assigned marker where applicable). No part is built or faked before its
data exists.

## 13. Authenticated App Shell

Authenticated pages render inside a persistent sidebar shell
(`dashboard/layout.tsx` + `AppShell`). Top strip handles identity, sidebar
handles actions — never duplicated. Per-page floating controls are forbidden.

- Sidebar (desktop, `w-60`, surface): single-line wordmark; icon + label
  nav (Student: Dashboard, Experiments, My Classes; Teacher: Dashboard,
  Classes — no dead entries). No account controls in the sidebar.
  Active route: subtle accent-tinted surface + ink
  text (`aria-current="page"`). The sidebar is complete
  navigation: every primary destination is reachable from it, so
  dashboards stay quick-access summaries (hero next-action, real-number
  stats, entry-point lists) and never the only path to a capability.
- Profile block (both viewports): unit pinned to the right — avatar
  circle, then a left-aligned text column with the name on its own line
  and the role (`Student`/`Teacher`) on the next line starting at the
  same left edge as the name, plus a chevron. A theme icon sits beside
  the trigger, next to the name. The whole block is a menu
  trigger (`aria-haspopup="menu"`, `aria-expanded`, hover highlight):
  clicking opens the account dropdown: `224px` wide, `bg-raised` (one
  shade above card surfaces), `12px` radius, soft elevation shadow
  (`0 8px 24px rgba(0,0,0,0.4)` — the one place shadows are allowed),
  `150ms` fade-and-rise entrance (disabled under
  `prefers-reduced-motion`). Right edge pinned to the trigger (`right-0`,
  `8px` gap). The menu holds the ghost Log out row (`40px`, `12px`
  horizontal padding, muted rest, red hover). The menu closes
  on outside click, Escape, navigation, or logout. Generous vertical
  padding (`py-6`), relaxed avatar-to-text gap. Desktop renders it as a
  full-width strip under the sidebar row; mobile renders the same block
  under the top bar. Neither the sidebar nor the top bar carries account
  controls; the drawer reveals nav links only.
- Hero: live-state panel (date eyebrow + state-driven title, subline, and
  primary CTA), not decoration. Student: continue-experiment panel when an
  in-progress attempt exists, otherwise orientation (join/browse).
  Teacher: operational summary + manage-classes CTA.
- Summary cards: 3–4 real numbers only. Context sections (teachers /
  upcoming / activity from live queries; honest empties otherwise) sit
  below the main content in one quiet row, not beside it.

## 14. Empty States (designed, not blank)

An empty section is a bordered surface containing: a plain-language state
("No students yet"), one sentence of what unlocks it, and the action or
artifact inline (e.g. the class code + copy button inside the empty members
state). Name the delivering phase when the capability is future work.

## 15. Components

- Navigation: active route gets a raised-surface pill + ink text
  (`aria-current="page"`), not color alone. Same treatment desktop/mobile.
- Cards: surface, 1px line border, `rounded-lg`; title semibold, metadata
  ink-2, mono for codes/counts. Fewer, larger, purposeful — never grids of
  identical mini-cards.
- Fact strips: `dl` of uppercase mono labels + semibold values (experiment
  detail meta, workspace stats).
- Buttons: primary foreground fill; secondary line-bordered; destructive
  actions (member removal) use two-step confirm inline.
- Accent appearances are allow-listed: active nav pill, `NavLink` nav links
  (§8.1), selection rings, focus rings, progress traces, diagrams.
  Body copy and metadata never use accent as plain text color.

## 16. Loading, Error, and Discovery States

- Loading: button label swap + disabled; skeletons only for known-length
  content (dashboard cards); no spinners for sub-second transitions.
- Errors: single assertive region with the server message; route-level
  failures redirect to the nearest list (unknown class/experiment →
  parent index).
- Discovery (catalogue): diagram-first cards (diagram panel, topic eyebrow,
  title, step/duration meta, single CTA). Catalogue never shows
  drafts/archived; counts come from live queries.

## 17. Experiment Workspace + Assessment Targets (Phases 4–6, not built)

- Workspace, focus mode: one step at a time. Slim progress header
  (`STEP x OF y` + thin accent trace + required-observation count, with
  `role="progressbar"`); step dots for jumping (labeled, `aria-current`,
  never color-only — backward review preserved); single focus column
  (eyebrow, title, instructions, in-flow observations without heavy
  containers); one action row (primary "Mark step complete & continue",
  quiet "Back"); AI help collapsed behind a disclosure, appearing only
  when asked. Diagram is functional context, not decoration.
- Assessment: quiet single-column form; conceptual-clarity AI only;
  submit-once with safe retry. No part built before its backend phase.
