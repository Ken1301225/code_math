# code_math Home Time Theme and Pixel Dashboard Design Spec

**Date:** 2026-03-22
**Location:** `blog/code_math`
**Status:** Approved in conversation, written for implementation planning

## Goal

Upgrade the existing `code_math` site with a time-driven visual system that:

- adds a homepage time controller and pixel dashboard inspired by the provided retro React reference
- applies the same time theme across homepage and article pages
- keeps article reading interactions unchanged
- preserves the current static-site architecture and Markdown authoring workflow

This feature is a design and presentation enhancement on top of the existing `code_math` site, not a rewrite of the content model or build pipeline.

## Product Decisions Already Confirmed

- The homepage should absorb the reference design's time-switching logic and pixel dashboard language.
- Article pages should follow the same theme state.
- Article interaction logic must stay unchanged:
  - no changes to pair highlighting behavior
  - no changes to anchor/hash reading flow
  - no new article-page controls beyond lightweight theme display
- Theme switching behavior is:
  - automatic by local browser time by default
  - user can manually override it
  - manual override persists across page navigation
  - user can return to automatic mode from the homepage control surface
- The homepage remains the only place with the main time control UI.
- Article pages only consume the selected theme state visually.
- Listing pages also consume the same theme state visually for navigation consistency, but expose no controls.

## Non-Goals

- No React migration.
- No Gemini chat, AI draft generation, or modal overlays from the reference code.
- No full character-room scene recreation.
- No particle system in v1.
- No changes to the article protocol, parser, or article-page reading structure.
- No changes to article-page interaction logic beyond visual theming.

## Why This Exists

The current site already has a strong editorial/pixel hybrid direction, but the homepage can become more memorable and more obviously “alive” by borrowing the reference code's strongest ideas:

- a visible time state
- strong palette shifts by time period
- pixel-box instrumentation modules
- dashboard-like hierarchy

The feature should make the homepage feel like a research terminal, while keeping article pages focused on reading.

## User Experience Summary

## 1. Homepage

The homepage becomes a time-aware dashboard.

### Homepage behavior

- On load, the page computes a current hour from the browser's local time.
- If a manual override exists in local storage, it takes precedence.
- The homepage shows:
  - current hour
  - current theme label
  - a slider for adjusting the hour
  - an auto/manual status indicator
  - a reset action that returns the system to automatic local-time mode
  - a pixel sun or moon indicator
- When the user changes the slider:
  - the theme updates immediately
  - the current hour is persisted
  - override mode becomes active
  - the persisted value applies on article pages too
- When the user clicks the reset action:
  - override mode is cleared
  - the page re-derives the current hour from local browser time
  - the displayed state and persisted state return to automatic mode

### Homepage structure

The homepage should keep the existing high-level information architecture:

- Hero / identity zone
- Guide section
- Archive section

But the hero becomes a dashboard control surface, and the statistics region becomes more visibly pixel-instrumented.

## 2. Article Pages

Article pages remain reading-first surfaces.

### Article-page behavior

- They read the same persisted time theme state as the homepage.
- They update background, accent color, panel tone, and code/proof presentation accordingly.
- They do not expose the homepage slider.
- Existing article JS behavior stays intact.

## 3. Listing Pages

Listing pages should visually participate in the same theme system so navigation does not feel discontinuous.

### Listing-page behavior

- They load the shared theme runtime.
- They adopt the same active theme state as homepage and article pages.
- They do not render time controls.
- They remain structurally simple archive/navigation surfaces.

## Article-page constraints

- No additional dynamic widgets in the reading column.
- No animation that competes with source/annotation reading.
- No restructuring of the left-right pair layout.
- Existing article-page visual modules remain structurally unchanged and are only re-themed.

## Theme Model

The system uses four named time states:

- `night`
- `morning`
- `work`
- `evening`

These are derived from hour ranges:

- `night`: 22:00-05:59
- `morning`: 06:00-09:59
- `work`: 10:00-17:59
- `evening`: 18:00-21:59

The homepage slider controls the hour directly; the state name is derived from that hour.

## Default and Fallback Theme

The deterministic no-JavaScript and first-paint fallback theme is `work`.

Reason:

- it provides the highest readability baseline
- it best matches the existing editorial paper palette
- it avoids the risk of a very dark article page before runtime executes

## Palette Logic

The implementation should borrow the reference code's palette logic, translated into CSS variables suitable for a content-focused site.

### Night

- deep plum-black and charcoal surfaces
- cool blue or indigo glow
- lower-contrast paper panels with controlled highlights

### Morning

- cream paper base
- apricot, sand, and pale amber accents
- softer, optimistic contrast

### Work

- brightest paper tone
- teal or mint monitor glow
- clearest data contrast for dashboard modules

### Evening

- warm brick, caramel, and burnt orange tones
- heavier shadows and warmer highlights
- more dramatic ambient background

## Key Implementation Principle

The theme state should be expressed through a small, consistent set of CSS custom properties. Components should consume variables rather than hardcoding per-state colors.

## Homepage Design

## 1. Hero Control Surface

The hero should become a combined identity panel and theme controller.

### Required hero elements

- site identity / mark
- site subtitle or descriptor
- visible current hour
- visible current time-state label
- visible auto/manual mode label
- time slider
- reset action for returning to automatic mode
- sun/moon pixel indicator

### Visual tone

- explicitly retro-computing inspired
- clearly pixel-box framed
- still legible and editorial rather than toy-like

## 2. Pixel Dashboard Modules

The homepage should include exactly three dashboard modules directly inspired by the reference code's boxy statistic cards.

### Required module set

- `Weekly Output`
  - pixel bar chart
  - derived from article publication activity grouped by weekday over the latest 14 published days
- `Type Balance`
  - pixel meter or box-plot-like balance display
  - derived from code vs math article counts
- `Release Pulse`
  - pixel activity grid / pulse module
  - derived from article publication dates over the latest 30 calendar days

`Tag Spectrum` may remain as a secondary summary elsewhere only if it fits cleanly, but it is not part of the required v1 dashboard contract for this feature.

### Data source constraint

All dashboard modules must use site data already available in the static build output:

- article counts
- type counts
- tag counts
- recent publication dates
- pair counts

No fake analytics should be introduced.

## 3. Guide and Archive Integration

The existing homepage navigation sections remain, but their visual treatment should be adapted to the new dashboard language:

- stronger pixel-box borders
- more terminal-like hover feedback
- time-theme-aware accents
- clearer hierarchy between “control area” and “reading navigation area”

## Article Page Design

Article pages should not become dashboards.

### Allowed changes

- theme-aware page background
- theme-aware panel colors
- theme-aware code/proof area colors
- small status badge or state hint

### Disallowed changes

- no time slider
- no new chart modules
- no layout changes to pair structure
- no change to current reading interactions

## Technical Architecture

This feature should be implemented as a thin runtime layer added to the current static site.

## Runtime split

### Shared theme runtime

Create one shared browser script responsible for:

- deriving the current local hour
- reading persisted override state from local storage
- writing the effective hour and theme state to the DOM
- updating the hour when a homepage slider changes
- keeping the DOM and storage in sync
- gracefully falling back when local storage is unavailable

### Article interaction script

The existing article behavior script must remain responsible only for pair interaction behavior.

The new theme runtime must not absorb article reading logic.

## DOM contract

The runtime should write state in DOM-friendly ways, such as:

- `data-time-state`
- `data-time-hour`
- `data-time-mode` with `auto` or `manual`
- optional text nodes for current displayed label/hour

This allows CSS to respond declaratively without coupling layout to large JS mutations.

### Authoritative host element

The authoritative host element is `<html>`.

The runtime updates:

- `document.documentElement.dataset.timeState`
- `document.documentElement.dataset.timeHour`
- `document.documentElement.dataset.timeMode`

### Homepage hook points

The homepage template must expose explicit hook points for the runtime:

- one range input for the hour slider
- one text node or container for the displayed hour
- one text node or container for the displayed time-state label
- one text node or container for the displayed auto/manual mode label
- one indicator host for the pixel sun/moon state
- one reset control for returning to automatic mode

These hooks should be expressed through stable `data-` attributes so the runtime does not depend on fragile selector text.

## Persistence Model

The theme runtime should persist:

- selected hour
- whether the hour is manually overridden

Suggested storage model:

- one local storage key for hour
- one local storage key for override mode

Behavior:

- if override is active, use stored hour
- otherwise, derive from local time on each page load
- if storage read fails, silently fall back to automatic mode
- if storage write fails, update the current page state but skip persistence

## Accessibility and Interaction Requirements

- The time slider must remain keyboard accessible.
- Current hour/state must be visible as text, not only color.
- Theme changes must not hide content or reduce readability below the current baseline.
- Motion should be restrained:
  - smooth palette transitions are fine
  - avoid distracting repeated motion in article pages

## Performance Constraints

- The runtime should be small and framework-free.
- Theme switching must only update attributes/variables, not trigger expensive DOM rebuilds.
- Pixel dashboard modules should be rendered server-side where possible and only recolored/animated lightly at runtime.

## File Responsibilities

The implementation should decompose into clear units.

### Template responsibilities

- `home-page.mjs`
  - renders the homepage time controller
  - renders homepage dashboard modules
- `article-page.mjs`
  - exposes theme hook points
  - does not own theme logic itself
- `listing-page.mjs`
  - exposes theme hook points only as needed for passive theming
  - does not render time controls

### Asset responsibilities

- `site.css`
  - defines shared theme variables and component styles
- new theme runtime script, emitted as `/assets/js/time-theme.js`
  - owns time detection, persistence, DOM state updates
- existing article interaction script
  - remains focused on pair behavior only

### Builder responsibilities

- ensures the new runtime asset is emitted alongside existing assets
- passes any needed homepage/article metadata for dashboard rendering
- ensures homepage, article, and listing page shells all load the shared runtime asset

## Testing Strategy

The implementation plan should include tests and verification for:

### Build-level checks

- homepage includes the time-control markup
- homepage includes the new runtime asset
- article pages include the shared runtime asset
- listing pages include the shared runtime asset
- article pages still include the existing article interaction asset

### Behavior checks

Manual verification is required for:

- default automatic theme on first load
- manual override persistence across pages
- reset from manual override back to automatic mode
- homepage slider updates visible state immediately
- article pages follow the selected theme
- listing pages follow the selected theme
- article pair reading interactions still behave exactly as before

### Visual verification

Manual verification is required for:

- all four theme states on homepage
- all four theme states on article pages
- desktop and mobile layouts
- readability of code and math content in each state

## Edge Cases

The implementation should explicitly handle:

- missing local storage values
- malformed stored hour
- JavaScript disabled
  - the site should still render in a sane default theme
- article pages loading directly before the homepage has ever been visited

## Implementation Readiness

This feature is scoped as one coherent frontend enhancement:

- shared time-theme runtime
- homepage dashboard redesign
- article-page theme adoption without interaction changes

It is ready to be turned into an implementation plan after review.
