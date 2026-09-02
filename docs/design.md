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
  fontFamily: "Poppins, system-ui, sans-serif"
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
- Use the approved Home page as the visual reference for spacing, surfaces,
  borders, typography and interaction patterns on other pages.
- Avoid displaying the same information more than once within the same page
  context unless repetition materially improves usability.

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

Use **Poppins** with the weights 400, 500, 600 and 700. Use the system
sans-serif fallback only when the web font cannot be loaded.

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

Cards that are fully interactive must also look interactive. On mobile, use a
clear, concise affordance such as `Ansehen`, `Details` or `Öffnen` with a
directional icon when the click behavior would otherwise be unclear.

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

Icons must match the meaning of the associated action, status or metric. Do not
use a merely decorative icon when a more semantically appropriate one is
available.

Avoid repeating an obvious icon with a visible label in compact cards. When the
meaning is clear from the icon and its value, show only those two elements and
retain the label as accessible text. Keep a visible label whenever the icon
could be misunderstood.

## Reusable UI Patterns

Use the shared React UI components instead of recreating their appearance in a
page stylesheet:

- `Button`: primary, secondary, ghost and destructive actions; use
  `danger-ghost` for compact removal icons that should not dominate the page
- `Card`: default, muted, accent and interactive surfaces
- `StatusBadge`: consistent text and colors for evening statuses
- `ActionNotice`: contextual tasks, warnings and informational actions
- `SegmentedControl`: a small set of mutually exclusive choices
- `Switch`: binary settings that take effect independently

Use the shared domain components for recurring game-night behavior:

- `EveningCard`: date, status, location, participants and optional results or actions
- `ParticipationControl`: the consistent `Dabei` / `Nicht dabei` selection

Page styles should arrange these components but must not redefine their core
colors, sizes or interaction states. A page stylesheet must never be imported
by another page.

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

Use subtle warning styling for tasks that require attention and soft primary
styling for active or informational tasks. Only show task cards when the task is
currently relevant to the user.

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
5. Location
6. Participants
7. Number of games when it helps users scan the overview

Treat the location as its own piece of event data. If no custom location is
stored, use `Bei [Spielleiter]` as the fallback so the location remains visible
and automatically follows a change of game leader. In overview cards, retain
the game leader's profile image as the visual reference for this default venue.

Do not display every available property in overview cards.

Do not add a separate metadata row by default. Time, participant count and game
count may form one compact icon-and-value group. Values such as season year
belong only in views where they support the user's immediate task.

Use abbreviated month names in all game-night overview cards so dates remain
compact and consistent on mobile.

Today's game night and the next upcoming game night may receive stronger visual emphasis.

Use a slim status-colored inline-start border on overview cards. Keep the card
surface neutral and retain the text badge so status is never communicated by
color alone.

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

Show voters primarily as a compact stack of profile images. Limit the visible
stack and summarize additional voters with `+n`; reveal names only when the
available width can accommodate them without crowding the option.

Keep the comparison axes stable at every width: date and vote count align to
the left, while time and the voter stack align to the right.

Use a native checkbox or equivalent accessible selection control inside the
full touch target. Selection must remain visible through shape or iconography,
not color alone. Fixing a date is a separate action and requires confirmation.

Restore the signed-in user's saved choices when an open poll is loaded so a
vote can be adjusted rather than recreated from an empty state. In the poll
creation dialog, use the same combined `datetime-local` control as the game
night date editor. Normalize suggestions to 15-minute intervals before saving.
Do not dismiss a data-entry modal when the user clicks its backdrop; require an
explicit cancel or save action so partially entered values are not lost.

## Results

Results may be slightly more playful than administrative screens.

Emphasize:

- winner
- user's own placement
- user's own score

A trophy icon or subtle highlighted winner card is appropriate.

Avoid excessive podium, glow or gaming effects.

Multiple winners must receive equal visual treatment.

## History

Use a compact, horizontally scrollable year selector when more years are
available than fit at the minimum mobile width. The selected year must remain a
clear pressed state with a full touch target.

Prioritize the annual winner, followed by a small set of comparable yearly
metrics. Render archived game nights with the shared `EveningCard` result
variant instead of maintaining a separate history-card design.

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

## Profile

Treat the profile identity, statistics and settings as separate content groups.
Keep the identity card compact and reserve the avatar action for changing the
profile image; do not repeat the primary yearly metrics in this header.

Use the shared `SegmentedControl` for switching between one year and the
cross-year view. Show the most useful metrics first and keep secondary metrics
behind one explicit expansion action. On small screens, metric cards use a
two-column grid and charts show one selected visualization at a time.

Render administrative modes as settings with the shared `Switch`, not as
custom action buttons. Game-night history entries must remain fully tappable
and show their date, points and placement without recreating a full
`EveningCard` from incomplete statistics data.

## Settings

Group settings by purpose and keep device-specific controls separate from
account-wide preferences. Use the shared `Switch` for independently saved
notification categories and disclose long preference lists only when the user
opens them. Security actions use shared secondary buttons and focused dialogs.

Settings and other data-entry dialogs must preserve partially entered values:
do not close them from a backdrop tap. Use explicit cancel and submit actions,
touch-friendly form controls and concise inline feedback.

## Administrative Lists

Administrative overview pages remain mobile first even when they contain
search, filtering and several row actions. Keep filters collapsible, render
records as stacked cards on small screens and progressively align identity,
status and actions into columns on wider screens.

Use shared status badges and icon-only buttons for compact row actions, with
accessible labels and tooltips. Never use browser `prompt` or `confirm` for
administrative workflows; use focused form and confirmation dialogs with clear
busy, error and destructive states.

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

- emojis as interface icons or decorative UI elements
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
