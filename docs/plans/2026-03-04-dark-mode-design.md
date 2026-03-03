# Dark Mode Design

## Summary

Add dark mode to the Kazran Alliance System with automatic OS preference detection and a manual override toggle. The app follows the user's macOS (or other OS) light/dark setting by default, with the option to manually choose Light, Dark, or System.

## Decisions

- **Approach:** Tailwind CSS `dark:` variant with class-based selector strategy
- **Toggle:** Light / Dark / System, placed in the Header bar as an icon button
- **Default:** System (follows OS preference)
- **Persistence:** localStorage (`themePreference` key)
- **Dark palette:** Stone dark backgrounds + amber accents (consistent with existing brand)

## Architecture

### ThemeProvider (React Context)

A new context provider wrapping the app. Manages:

- **User preference** -- `"light" | "dark" | "system"`, stored in localStorage
- **Resolved theme** -- actual `"light" | "dark"` after resolving system preference
- **DOM sync** -- toggles `dark` class on `<html>` element

Uses `window.matchMedia('(prefers-color-scheme: dark)')` with an event listener for real-time OS preference changes.

### Tailwind Configuration

In `index.css`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

Enables class-based dark mode via the `dark` class on `<html>`.

### Toggle UI

Icon button in Header cycling: System -> Light -> Dark -> System.

- Sun icon = Light mode
- Moon icon = Dark mode
- Monitor icon = System mode

## Color Mapping

| Element | Light | Dark |
|---------|-------|------|
| App background | `bg-stone-100` | `dark:bg-stone-900` |
| Cards/modals | `bg-white` | `dark:bg-stone-800` |
| Modal overlay | `bg-stone-900/60` | `dark:bg-black/70` |
| Primary text | `text-stone-900` | `dark:text-stone-100` |
| Secondary text | `text-stone-600` | `dark:text-stone-400` |
| Borders | `border-stone-200/300` | `dark:border-stone-700` |
| Inputs | `bg-white border-stone-300` | `dark:bg-stone-700 dark:border-stone-600` |
| Section backgrounds | `bg-stone-50/100/200` | `dark:bg-stone-800/850` |
| Header | `bg-stone-900` (unchanged) | Same |
| Toast (success) | `bg-emerald-50` | `dark:bg-emerald-900/30` |
| Toast (error) | `bg-red-50` | `dark:bg-red-900/30` |
| Toast (info) | `bg-blue-50` | `dark:bg-blue-900/30` |
| Toast (warning) | `bg-amber-50` | `dark:bg-amber-900/30` |
| Accent colors | `amber-500/600` | `amber-400/500` (slightly brighter for contrast) |

## Tier Color Functions

Update `utils.ts` tier color utility functions to return both light and dark Tailwind classes. Example: `getTierColor(1)` returns `"bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"`.

## Data Flow

```
User clicks toggle
  -> ThemeProvider updates preference in state + localStorage
  -> Resolves actual theme (if "system", check matchMedia)
  -> Sets/removes "dark" class on <html>
  -> Tailwind dark: variants activate/deactivate
  -> matchMedia listener fires on OS change (when in "system" mode)
     -> Re-resolves and updates <html> class
```

## Error Handling

- localStorage unavailable: fall back to "system" preference (in-memory only)
- matchMedia unsupported: default to light theme

## Files to Modify

- `src/index.css` -- add dark mode custom variant
- `src/App.tsx` -- wrap with ThemeProvider
- `src/utils.ts` -- update tier color functions for dark variants
- `src/components/Header.tsx` -- add theme toggle button
- `src/components/Footer.tsx` -- add dark: classes
- `src/components/Toast.tsx` -- add dark: classes
- `src/components/ConfirmModal.tsx` -- add dark: classes
- `src/components/InputModal.tsx` -- add dark: classes
- `src/components/MemberEditModal.tsx` -- add dark: classes
- `src/components/MemberSearchModal.tsx` -- add dark: classes
- `src/components/ArchivedMembersManager.tsx` -- add dark: classes
- `src/components/BulkPasswordUpdate.tsx` -- add dark: classes
- `src/components/SinglePasswordUpdate.tsx` -- add dark: classes
- `src/pages/Login.tsx` -- add dark: classes
- `src/pages/AdminDashboard.tsx` -- add dark: classes
- `src/pages/GuildDashboard.tsx` -- add dark: classes

## New Files

- `src/ThemeContext.tsx` -- ThemeProvider context and useTheme hook
