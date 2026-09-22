# ScienceLab UI Design

> Design contract for implementers. This document describes visual and interaction
> rules only. It introduces no product behavior; all behavior is owned by
> `REQUIREMENTS.md`, `USER_FLOWS.md`, and `API.md`. Where this document is
> silent, match the existing restrained interface rather than inventing new patterns.

## 0. Locked Visual Language

> Near-black + off-white + cyan/teal scientific accent + thin borders +
> technical diagrams + restrained geometry.

This language carries through the whole application: dashboards reuse the same
dark foundation and typography (denser for teachers); the experiment workspace
makes diagram/measurement visuals functional; assessment stays quieter so
content gets attention. No page introduces a competing visual template.

## 1. Visual Direction

Modern scientific publication + educational product + restrained interface.

- Light-first: white/zinc surfaces, near-black text. Dark mode mirrors with zinc-950/black surfaces.
- One accent color: teal-700 (`teal-700` light / `teal-400` dark) for primary actions and key highlights. No additional accent colors.
- Scientific identity comes from **content-relevant illustration** (the simple electrical circuit — the MVP's first experiment), a faint measurement-grid backdrop, and precise typography — never from decorative gradients, blobs, or stock imagery.
- Depth is flat: 1px borders (`black/[.08]`), no drop shadows on cards, restrained radii (`rounded-lg` for inputs and buttons).

## 2. Auth Experience

### 2.1 Layout (desktop ≥1024px)

Split screen:

- **Left ~45%**: panel holding one composed, vertically centered block:
  ScienceLab wordmark, the statement "Learn science by doing.", supporting
  text, then the line-art circuit illustration. No large gaps between block
  elements. The panel follows the active theme (light: zinc-100/zinc-900;
  dark: zinc-950/zinc-50) with the circuit accent adapting via
  `--circuit-accent` — the whole page flips as one surface, never half-lit.
- **Right ~55%**: plain background, vertically centered form column capped at
  480px (`max-w-[480px]`), pulled toward the divider (`lg:justify-start` with
  left padding) so the middle gap stays narrow.

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
- Secondary: `No account yet? Register`.
- Errors shown in a single `role="alert"` paragraph above the button: invalid input messages from server, or generic `Invalid email or password.` Never indicate which field failed.

### 2.4 Registration

- Heading `Create your account`, subheading `Start learning science by doing.`
- Fields per requirements (`FR-STU-01`, `FR-TEA-01`): Full name, Email, Password (min 8, shown as helper text), Confirm password (client-side match check only — never sent, never validated server-side), role selector `I am a…` (Student/Teacher radio).
- Role selection chooses the endpoint (`/api/auth/register/student` vs `/teacher`); the body carries only name/email/password. The selector renders as two selectable cards (Student / Teacher) in a `fieldset` + `legend`; the native radio is visually hidden but remains the accessible control. No Admin option exists anywhere in registration — the server exposes no admin-registration route and ignores body-provided roles.
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
- Errors: single assertive region (`role="alert"`), red-600/dark-red-400 text, preserved across renders until next submit.

## 5. Responsive Behavior

- Breakpoint: `lg` (1024px). Below it the brand panel stacks above the form.
- **Every UI change must be verified in both mobile and desktop viewports
  before it is considered done**: layout composition, control placement
  (nothing floating mid-page), illustration sizing tier, theme behavior on
  both surfaces, and scroll/keyboard usability. A change that works on only
  one viewport is incomplete.
- Form column width: capped at 480px on desktop; `max-w-md` on mobile.
- Brand and form blocks are each internally compact with no large vertical gaps; both sides vertically centered on desktop.
- No layout shift between idle/loading/error states (button label swaps, region reserved by flow).

## 6. Accessibility (`CR-11`)

- Keyboard: all controls reachable in logical order (brand panel is non-interactive); visible focus on every control.
- Labels for every input; `aria-label` on the password toggle (`Show password`/`Hide password`); `aria-describedby` for the password helper.
- Errors announced via `role="alert"`. State never communicated by color alone (text message always present).
- Contrast: zinc-600-on-white minimum for secondary text; teal-700-on-white for links/buttons text where used.

## 7. Typography and Spacing

- Typeface: Geist (sans + mono), as configured in `layout.tsx`. Headings semibold, tight tracking; body regular.
- Scale: brand statement ~3xl semibold; form heading 2xl semibold; subheading sm zinc-600; labels sm medium.
- Spacing: form fields `gap-4`, sections `gap-1` label-to-input, page padding `px-6 py-12`.

## 8. Color Usage

| Token | Light | Dark |
|---|---|---|
| Page background (form side) | white/zinc-50 | black |
| Brand panel | zinc-950 (always) | zinc-950 (always) |
| Primary text | zinc-950/black | zinc-50 |
| Secondary text | zinc-600 | zinc-400 |
| Borders | black/[.08–.12] | white/[.145–.2] |
| Primary button | foreground fill | foreground fill |
| Error text | red-600 | red-400 |
| Accent (links, illustration strokes) | teal-700 | teal-400 |

## 8.1 Theme (light/dark)

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
- Drop shadows on cards; radii larger than `rounded-md` (inputs) / `rounded-full` (buttons).
- Additional accent colors beyond teal + neutrals + error red.
- Terms/privacy links, onboarding wizards, social-login buttons, or any field beyond name/email/password(+confirm)/role.
- Client-side enforcement of any server rule (role, gating, eligibility).

## 10. Landing Alignment

The landing page shares the brand language: wordmark, `Learn science by doing.` statement, product-loop subtext, and the same two actions (Get started / Log in). It must not introduce components, colors, or illustration styles that contradict this document.
