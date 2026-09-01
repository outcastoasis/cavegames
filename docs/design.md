---
name: Cavegames Light
colors:
  primary: "#6d28d9"
  primary-hover: "#5b21b6"
  primary-soft: "#ede9fe"
  secondary: "#64748b"
  background: "#f8fafc"
  surface: "#ffffff"
  surface-muted: "#f1f5f9"
  on-surface: "#0f172a"
  on-surface-muted: "#64748b"
  border: "#e2e8f0"
  success: "#16a34a"
  warning: "#d97706"
  error: "#dc2626"

typography:
  fontFamily: "Inter, system-ui, sans-serif"
  body-md:
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontSize: 14px
    fontWeight: 500
  heading-sm:
    fontSize: 18px
    fontWeight: 600
  heading-md:
    fontSize: 24px
    fontWeight: 700

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px

layout:
  mobile-first: true
  min-supported-width: 360px
  content-max-width: 1200px

interaction:
  min-touch-target: 44px
---

# Design System

## Overview

Cavegames is a mobile-first web app for a private board-game group.

The interface should feel:

- clean
- modern
- friendly
- slightly playful
- easy to understand at a glance

Use a modern SaaS-like foundation with subtle board-game character.

The app should not look like a corporate administration tool, but also not like a flashy gaming website.

The primary visual priority is smartphone usage.

## Core Principles

- Design mobile first, then expand layouts for larger screens.
- Prioritize clarity and usability over decoration.
- Keep information density balanced.
- Important actions and current states must be immediately recognizable.
- Preserve existing functionality when redesigning UI.
- Prefer improving existing components over replacing the entire frontend.
- Reuse consistent components across all pages.

## Colors

- **Primary** (#6d28d9): Main CTAs, selected states, active navigation, important interactive elements
- **Primary Soft** (#ede9fe): Highlight backgrounds, selected cards, subtle brand accents
- **Background** (#f8fafc): Main application background
- **Surface** (#ffffff): Cards, dialogs and elevated content areas
- **Surface Muted** (#f1f5f9): Secondary sections and subtle grouped content
- **On Surface** (#0f172a): Primary text
- **On Surface Muted** (#64748b): Secondary information and metadata
- **Border** (#e2e8f0): Dividers and card borders
- **Success** (#16a34a): Confirmed states, participation, successful actions
- **Warning** (#d97706): Pending actions and attention states
- **Error** (#dc2626): Errors and destructive actions

Use the primary purple sparingly. Most of the interface should remain neutral and light.

Status must never rely on color alone. Combine color with text, icons or badges.

## Typography

Use **Inter** when available. Otherwise use a clean system sans-serif font.

- **Page headings**: Bold, clear, compact
- **Section headings**: Semi-bold
- **Body text**: Regular, 14–16px
- **Labels**: Medium weight, usually 14px
- **Metadata**: 14px or smaller, muted color

Avoid excessive differences in font size.

Do not use decorative gaming fonts.

## Layout

Use a mobile-first single-column layout by default.

On larger screens, content may progressively use:

- two-column layouts
- card grids
- wider statistic sections

Do not stretch content across the entire width of large monitors.

Avoid horizontal scrolling on mobile.

Use consistent spacing based primarily on:

- 8px
- 16px
- 24px
- 32px

## Navigation

The main navigation contains:

- Home
- Abende
- Umfragen
- Historie
- Profil

For mobile, prioritize quick thumb-friendly access.

A bottom navigation is appropriate for these five primary destinations if compatible with the existing architecture.

Administrative functions should remain separate from the main player navigation.

The active navigation item should be clearly identifiable using the primary color.

## Cards

Cards are the primary container for:

- game nights
- tasks
- polls
- statistics
- results
- players
- games

Cards should use:

- white surface
- 12–16px radius
- subtle border
- little or no shadow
- clear internal hierarchy

Prefer borders and background contrast over heavy elevation.

Avoid unnecessary nested cards.

## Buttons

### Primary
Use for the most important action in a section.

Examples:

- Abstimmen
- Speichern
- Umfrage erstellen
- Abend abschliessen

Use primary purple fill with white text.

### Secondary
Use for supporting actions.

Examples:

- Bearbeiten
- Details
- Termin hinzufügen

Use neutral or subtle primary styling.

### Tertiary
Use for low-priority actions.

Examples:

- Zurück
- Abbrechen
- Weitere anzeigen

Prefer text or ghost styling.

### Destructive
Use red styling only for destructive actions.

Examples:

- Löschen
- Entfernen
- Testdaten zurücksetzen

Do not visually compete with the primary action.

## Touch Interaction

Interactive elements should have a minimum touch area of approximately 44px.

This applies to:

- buttons
- navigation
- form controls
- poll options
- participation controls
- icon buttons

Do not use tiny standalone icons as important controls.

## Home

The Home page is a personal dashboard.

Prioritize content approximately in this order:

1. Greeting
2. Required action
3. Today's or next game night
4. Personal highlights / statistics
5. Last game night
6. Game-related fact or tip

Pending actions should stand out clearly but must not look like errors.

Examples:

- Open poll not yet answered
- User assigned as game leader and needs to create a poll

Do not render empty placeholders for sections that are not currently relevant.

## Game Nights

Game-night cards should prioritize:

1. Date
2. Time
3. Current status
4. Relevant action
5. Game leader / location
6. Participants
7. Additional metadata

Do not display every available property in overview cards.

Today's game night and the next upcoming game night may receive stronger visual emphasis.

## Participation

The current participation status must be immediately understandable.

`Dabei` and `Nicht dabei` should behave like a clear selection state rather than two competing primary buttons.

Use success styling for confirmed participation.

## Polls

Poll options should be easy to compare and tap on mobile.

Each option should emphasize:

- weekday
- date
- time
- vote count
- current user's selection state

The entire option may act as the touch target.

Participant names are secondary information.

## Results

Results may be slightly more playful than administrative screens.

Emphasize:

- winner
- user's own placement
- user's own score

A trophy icon or subtle highlighted winner card is appropriate.

Avoid excessive podium, glow or gaming effects.

Multiple winners must receive equal visual treatment.

## Statistics

Show the most useful statistics first.

Examples:

- total points
- participations
- win rate
- average placement

Less important statistics may be collapsed under a secondary section.

Charts should:

- remain readable on mobile
- use few colors
- favor the primary purple
- avoid unnecessary visual complexity

## Avatars

Profile images are useful because Cavegames represents a small private group.

Use avatars where they improve recognition, especially for:

- participants
- game leader
- results
- winners

Provide a clean initials fallback when no image exists.

## Forms

Use:

- labels above inputs
- large touch-friendly controls
- clear validation
- logical grouping
- native date/time input behavior where appropriate

Keep forms simple on mobile.

## Dialogs

Use dialogs for short, focused workflows such as:

- creating a game night
- creating a poll
- adding a game
- confirming deletion

On small screens, complex dialogs may use most of the available screen width or height.

The primary action should be visually dominant over `Abbrechen`.

## Feedback & States

Provide consistent feedback for:

- loading
- saving
- voting
- uploads
- success
- errors
- destructive actions

Disable duplicate actions while a request is running.

Empty states should explain the situation without looking like an error.

## Playful Elements

Use subtle game-related personality through:

- icons
- trophies
- dice or board-game motifs
- small illustrations
- winner highlights
- friendly empty states

Do not use:

- neon gaming aesthetics
- strong gradients everywhere
- heavy animations
- 3D UI
- decorative elements that reduce clarity

## Do's and Don'ts

- Do prioritize mobile usability.
- Do use the primary purple intentionally and sparingly.
- Do keep cards and controls visually consistent.
- Do make current status and next action obvious.
- Do preserve the existing application's functionality.
- Do reuse existing frontend technologies where practical.
- Do keep game-related styling subtle.

- Don't redesign every page at once.
- Don't introduce a new UI library without a clear benefit.
- Don't create many slightly different versions of the same component.
- Don't overload mobile cards with metadata.
- Don't use excessive shadows, gradients or animations.
- Don't rely only on color to communicate status.
- Don't make the application feel like enterprise software.
- Don't make it look like a flashy gaming website.