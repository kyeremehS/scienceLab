# ScienceLab — Layout Architecture

Structural skeletons for the four primary surfaces: **Teacher Dashboard**,
**Student Dashboard**, **Experiment Workspace**, **Admin Panel**. Every file
in this folder shares one grid, one spacing scale, one breakpoint system —
so a teacher moving from dashboard → assignment → experiment preview never
feels a structural seam.

Stack assumed: Next.js 16 App Router, Tailwind 4, shadcn/ui `Card`
primitives. Files are structural skeletons — copy them into
`app/(role)/.../page.tsx` and wire in real data/queries.

---

## 1. Grid

12-column CSS grid, fixed-width rail + fluid content — never an evenly
split N-up stack.

```
┌────────────┬──────────────────────────────────────────────────────────┐
│            │  main (fluid, grid-cols-12 gap-6 within)                 │
│  aside     │  ┌───────────────────────────────┬──────────────────┐    │
│  280px     │  │ primary column (col-span-8)    │ rail (col-span-4)│    │
│  fixed     │  │                                 │                  │    │
│            │  └───────────────────────────────┴──────────────────┘    │
└────────────┴──────────────────────────────────────────────────────────┘
```

- Sidebar: `w-[280px] shrink-0` — never part of the 12-col grid, a
  structurally separate region with its own scroll/sticky behavior.
- Main content: `grid grid-cols-12 gap-6`. The dominant task lives at
  `col-span-8` (or `col-span-7`/`col-span-9` when a page's content is
  asymmetric on purpose — see Experiment Workspace), secondary/contextual
  content at the remaining columns. This is a deliberate 2/3–1/3
  relationship, not a 6/6 half-split — the eye should land on one thing
  first.
- Full-width rows (activity feeds, tables) span `col-span-12` and sit
  *below* the split row, not interleaved with it.

## 2. Spacing rhythm

Spacing scale is used to encode grouping (Gestalt), not decoration —
tighter values bind related micro-elements, larger values separate
unrelated containers.

| Token | Value | Used for |
|---|---|---|
| `gap-1` (4px) | micro | icon + its label, a single stat + its delta |
| `gap-2` (8px) | tight | tag/badge clusters, filter chip rows |
| `gap-3` (12px) | related | rows inside one list item (name + meta line) |
| `gap-4` (16px) | grouped | fields inside one form section |
| `p-5` / `gap-5` | card interior | default Card padding |
| `gap-6` | grid gutter | between cards in the 12-col grid |
| `p-8` / `gap-8` | macro | between page sections, sidebar internal sections |

Rule of thumb applied throughout: **padding inside a container is always
smaller than the gap between containers.** A stat card uses `p-4` between
its own icon/value/label but sits `gap-6` from its sibling card — so
containment reads before adjacency does.

## 3. Containment

- `Card` (shadcn) for every discrete content region: `border
  border-border/60 bg-card shadow-sm rounded-lg`. No stacked shadows, no
  border **and** heavy shadow on the same element — pick one elevation
  cue per nesting depth.
- Nested containment (e.g. a student row inside a "Needs Attention"
  card) drops the border and uses only a `bg-muted/40` tint + spacing,
  so the eye doesn't count borders-within-borders.
- Dividers (`border-t border-border/50`) are used only *inside* a card
  to separate rows of the same kind — never between unrelated cards,
  where spacing alone should suffice.

## 4. Breakpoints

| Breakpoint | Sidebar | Grid | Notes |
|---|---|---|---|
| `< 768px` (base) | Hidden; becomes a slide-in `Sheet` drawer, triggered by a hamburger in the sticky header | `grid-cols-1`, every card stacks full-width | Primary action moves to a fixed bottom bar |
| `768–1023px` (`md`) | Collapses to a 72px icon rail (`md:w-[72px]`, labels hidden, tooltips on hover) | `md:grid-cols-6` — 2/3+1/3 split becomes `col-span-4`/`col-span-2` | Secondary rail content may collapse into an accordion |
| `≥ 1024px` (`lg`) | Full 280px rail with labels | `lg:grid-cols-12`, full 8/4 or 9/3 split | Full layout as specified above |

## 5. Interactive zones (sticky / scroll / fixed)

Mapped independently per page below, but the shared contract:

- **Sticky header** — `sticky top-0 z-30 h-16 backdrop-blur bg-background/90
  border-b`. Always present, always the same height, so vertical rhythm
  doesn't shift between pages.
- **Sidebar scroll** — the sidebar's nav list scrolls independently
  (`overflow-y-auto`) from main content; the teacher/student identity
  block at the bottom of the sidebar stays pinned (`mt-auto`).
- **Main scroll** — `overflow-y-auto` on the content region only, so the
  header and sidebar never move.
- **Fixed action bar** — reserved for the *one* primary commitment
  action per page (Assign Experiment, Save & Continue, Publish). Desktop:
  lives in the sticky header's right side. Mobile: drops to a
  `fixed bottom-0` bar so it's reachable by thumb.
