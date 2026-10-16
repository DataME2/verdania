# Verdania — Design System

A project of **Let's the Data Talk**. Verdania (Latin *viridis*, green) is a fictional country of 2,000,000 synthetic citizens and a public economic-simulation lab asking: **"Can an economy serve humanity?"**

## Product context

- Feels like: economic research lab + interactive strategy simulator + public participation platform. A living country, not a brochure.
- All data is **synthetic** and every simulated figure is a **model output, not a forecast**. All capital is **virtual**; nothing can be paid, redeemed or invested for real. These disclaimers are part of the UI, not fine print.
- Primary CTA everywhere: **Run an Experiment**. "Continue with Google" is secondary, shown only when saving scenarios or joining the virtual investment market. Visitors can explore without an account.
- Never present one opaque "score". Show each metric on its own, aggregate next to distribution (income deciles, regions, gender).

### Primary navigation (in this order)
Discover Verdania · People and Society · Economic Systems · Virtual Investment Market · Social Justice · Run an Experiment · Research and Methodology · Community

### Key pages
1. Home: central question, animated country intro, animated map, live mini-experiment.
2. Discover Verdania: interactive regional map, region drill-down.
3. Run an Experiment (Economic Lab): policy sliders → recalculated indicators, delta vs baseline, mechanisms, uncertainty, assumptions.
4. Virtual Investment Market: allocate 100,000 virtual units across projects; private vs social returns.
5. Social Justice dashboard: Gini, poverty, labour share, market vs disposable income.
6. Research and Methodology: formulas, parameters, model version, limitations.

## Colour tokens (existing Superdesign drafts — do not change)

| Token  | Hex       | Use |
|--------|-----------|-----|
| forest | `#2d5016` | Primary brand, headings, primary buttons |
| leaf   | `#4a7c3a` | Secondary brand, hover, accent text |
| vivid  | `#6db345` | Positive deltas, active states, highlights |
| sage   | `#a8d5ba` | Labels on dark, soft fills |
| cream  | `#f4f7ef` | Page background |
| ink    | `#172015` | Body text |
| sun    | `#e7ba55` | Warnings, uncertainty bands, "changed input" highlight |
| deep   | `#1f3d14` | Dark section background |
| mist   | `#dcebd2` / `#e4edd9` | Light section backgrounds |

Negative deltas use a muted terracotta `#b5523b` (sparingly, text + icon, never colour alone).

## Typography

- Display: **Cabinet Grotesk** 500–800 (Fontshare). Large, tight tracking (`-0.05em` on hero), leading ~0.93.
- Body/UI: **Satoshi** 400–700 (Fontshare).
- Eyebrow labels: 12px, bold, uppercase, `tracking-[.25em]`, leaf (or sage on dark), numbered "01 · The question".
- Numbers in indicators: Cabinet Grotesk, tabular figures.

## Shape, spacing, depth

- Radius: cards `rounded-[2rem]`, buttons/pills `rounded-full`, inputs `rounded-2xl`.
- Section padding: `px-5 py-24` mobile, `lg:px-10 lg:py-32`.
- Shadows: `soft` `0 24px 60px rgba(45,80,22,.12)`, `lift` `0 16px 34px rgba(45,80,22,.18)`.
- Buttons: min height 44px (56px for hero CTAs). Primary = forest fill/white text, hover leaf and `-translate-y-0.5`. Secondary = white with forest/20 border.
- Icons: Iconify `lucide:*`.

## Motion

- Motion explains, never decorates. Every animated number has a visible source label ("Synthetic baseline, model v0.1").
- Scroll-reveal: fade + 16px rise, 500ms ease-out, once.
- Counters: count up 900ms on first view.
- Policy change: changed slider gets a sun ring; affected indicators pulse once, then show delta chip (vivid ▲ / terracotta ▼) vs baseline.
- Recalculating: inline skeleton shimmer on indicator cards plus "Recalculating…" label; never animate a value before the engine returns it.
- Map: regions highlight on hover/focus, selected region gets forest outline + side panel slide-in 300ms.
- `prefers-reduced-motion`: disable counters, reveals and pulses; show final values instantly.

## Accessibility

- WCAG 2.2 AA contrast; visible focus rings (vivid 2px offset).
- All sliders are native range inputs with labels, current value and units; keyboard operable.
- Map regions are focusable buttons with names; a list alternative exists.
- Charts have a text summary and a data table toggle.
- Mobile first; no horizontal scroll at 360px.

## Content rules

- Badges: "Synthetic data", "Model output, not a forecast", "Virtual capital, no real money".
- Model labels: A Market-led capitalism, B Regulated social-market, C Social-democratic mixed, D Collective ownership. Never imply a label determines results.
- Show assumptions and uncertainty ranges next to every result.
