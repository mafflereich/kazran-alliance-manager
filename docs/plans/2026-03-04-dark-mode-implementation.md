# Dark Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dark mode with OS preference detection and Light/Dark/System toggle to the Kazran Alliance System.

**Architecture:** Tailwind CSS `dark:` variant with class-based selector. A ThemeProvider context manages preference state, persists to localStorage, listens to `prefers-color-scheme` media query, and toggles the `dark` class on `<html>`. Each component gets `dark:` prefixed utility classes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4 (Vite plugin), Lucide React icons

---

### Task 1: Configure Tailwind dark mode and create ThemeContext

**Files:**
- Modify: `src/index.css`
- Create: `src/ThemeContext.tsx`
- Modify: `src/App.tsx`

**Step 1: Add dark mode custom variant to index.css**

Replace the contents of `src/index.css` with:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

**Step 2: Create ThemeContext.tsx**

Create `src/ThemeContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'themePreference';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredPreference()));

  const applyTheme = (theme: ResolvedTheme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setResolvedTheme(theme);
  };

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    try { localStorage.setItem(STORAGE_KEY, pref); } catch {}
    applyTheme(resolveTheme(pref));
  };

  const cycleTheme = () => {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(preference) + 1) % order.length];
    setPreference(next);
  };

  // Apply theme on mount
  useEffect(() => {
    applyTheme(resolveTheme(preference));
  }, []);

  // Listen for OS preference changes when in "system" mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (preference === 'system') {
        applyTheme(getSystemTheme());
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

**Step 3: Wrap App with ThemeProvider**

In `src/App.tsx`, add the import and wrap:

```tsx
// Add import at top
import { ThemeProvider } from './ThemeContext';

// Change the App export to wrap with ThemeProvider:
export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContentWrapper />
      </AppProvider>
    </ThemeProvider>
  );
}
```

**Step 4: Add dark classes to AppContentWrapper root div**

In `src/App.tsx`, change the root div in `AppContentWrapper`:

From:
```tsx
<div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
```
To:
```tsx
<div className="min-h-screen bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans">
```

Also update the Suspense fallback:
From:
```tsx
<div className="flex items-center justify-center min-h-screen">Loading...</div>
```
To:
```tsx
<div className="flex items-center justify-center min-h-screen text-stone-500 dark:text-stone-400">Loading...</div>
```

**Step 5: Verify the app still builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add src/index.css src/ThemeContext.tsx src/App.tsx
git commit -m "feat: add ThemeContext with dark mode support and Tailwind dark variant"
```

---

### Task 2: Add theme toggle to Header

**Files:**
- Modify: `src/components/Header.tsx`

**Step 1: Add theme toggle button to Header**

In `src/components/Header.tsx`:

1. Add imports at top:
```tsx
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../ThemeContext';
```

2. Inside the `Header` function, add after the existing destructuring:
```tsx
const { preference, cycleTheme } = useTheme();
```

3. Add the theme toggle button. Place it inside the `div` that has `className="flex items-center gap-4 border-l border-stone-800 pl-4"` -- add the button BEFORE the volume div (`<div className="relative">` that contains the volume button). Add this as the first child of that container div:

```tsx
<button
  onClick={cycleTheme}
  className="flex items-center justify-center hover:text-amber-400 transition-colors p-1"
  title={preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}
>
  {preference === 'light' && <Sun className="w-4 h-4" />}
  {preference === 'dark' && <Moon className="w-4 h-4" />}
  {preference === 'system' && <Monitor className="w-4 h-4" />}
</button>
```

**Step 2: Add dark classes to the LoginModal inside Header.tsx**

Update the LoginModal's classNames (the modal that opens when clicking the login button in the header):

- Overlay: `bg-stone-900/60` -> add `dark:bg-black/70`
- Modal container: `bg-white` -> add `dark:bg-stone-800`
- Modal header: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-200` -> add `dark:border-stone-600`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Close button hover: `hover:bg-stone-200` -> add `dark:hover:bg-stone-600`
- Close icon: `text-stone-500` -> add `dark:text-stone-400`
- Labels: `text-stone-600` -> add `dark:text-stone-400`
- Input icons: `text-stone-400` -> add `dark:text-stone-500`
- Inputs: `border-stone-300` -> add `dark:border-stone-600`; `bg-white` -> add `dark:bg-stone-700`; add `dark:text-stone-100`
- Error div: `bg-red-50` -> add `dark:bg-red-900/30`; `border-red-100` -> add `dark:border-red-800`; `text-red-600` -> add `dark:text-red-400`
- Submit button: `bg-stone-800 hover:bg-stone-700` -> add `dark:bg-stone-600 dark:hover:bg-stone-500`

**Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add theme toggle button to Header with dark mode for login modal"
```

---

### Task 3: Update tier color utility functions

**Files:**
- Modify: `src/utils.ts`

**Step 1: Update getTierColor**

```typescript
export const getTierColor = (tier: number) => {
  switch (tier) {
    case 1: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
    case 2: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    case 3: return 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-600';
    case 4: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
    default: return 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700';
  }
};
```

**Step 2: Update getTierBorderHoverClass**

```typescript
export const getTierBorderHoverClass = (tier: number) => {
  switch (tier) {
    case 1: return 'hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/20';
    case 2: return 'hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20';
    case 3: return 'hover:border-stone-400 hover:bg-stone-50/30 dark:hover:bg-stone-700/30';
    case 4: return 'hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/20';
    default: return 'hover:border-amber-300 hover:bg-stone-100 dark:hover:bg-stone-800';
  }
};
```

**Step 3: Update getTierTextHoverClass**

```typescript
export const getTierTextHoverClass = (tier: number) => {
  switch (tier) {
    case 1: return 'group-hover:text-orange-600 dark:group-hover:text-orange-400';
    case 2: return 'group-hover:text-blue-600 dark:group-hover:text-blue-400';
    case 3: return 'group-hover:text-stone-600 dark:group-hover:text-stone-400';
    case 4: return 'group-hover:text-green-600 dark:group-hover:text-green-400';
    default: return 'group-hover:text-amber-700 dark:group-hover:text-amber-400';
  }
};
```

Note: `getTierTextColorDark`, `getTierHighlightClass`, and `getTierHoverClass` are used in the sidebar (which already has a dark `bg-stone-900` background), so they do not need dark: variants -- their colors already work against dark backgrounds.

**Step 4: Commit**

```bash
git add src/utils.ts
git commit -m "feat: add dark mode variants to tier color utility functions"
```

---

### Task 4: Dark mode for Toast component

**Files:**
- Modify: `src/components/Toast.tsx`

**Step 1: Update toastConfig with dark variants**

```typescript
const toastConfig: Record<ToastType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    color: 'text-emerald-900 dark:text-emerald-200',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    color: 'text-red-900 dark:text-red-200',
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800'
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    color: 'text-blue-900 dark:text-blue-200',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800'
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    color: 'text-amber-900 dark:text-amber-200',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800'
  }
};
```

**Step 2: Add dark class to close button hover**

Change `hover:bg-black/5` to `hover:bg-black/5 dark:hover:bg-white/10`.

**Step 3: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat: add dark mode to Toast component"
```

---

### Task 5: Dark mode for Footer and simple modals

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/ConfirmModal.tsx`
- Modify: `src/components/InputModal.tsx`

**Step 1: Update Footer.tsx**

Change `text-stone-400` to `text-stone-400 dark:text-stone-500` on the footer element.

**Step 2: Update ConfirmModal.tsx**

Apply these dark classes:

- Overlay: add `dark:bg-black/70` to `bg-stone-900/60`
- Modal container: add `dark:bg-stone-800` to `bg-white`
- Icon background (non-danger): `bg-amber-100` -> add `dark:bg-amber-900/30`
- Icon background (danger): `bg-red-100` -> add `dark:bg-red-900/30`
- Title: `text-stone-900` -> add `dark:text-stone-100`
- Message: `text-stone-600` -> add `dark:text-stone-400`
- Footer bar: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-100` -> add `dark:border-stone-600`
- Cancel button: `text-stone-600` -> add `dark:text-stone-300`; `hover:bg-stone-200` -> add `dark:hover:bg-stone-600`

**Step 3: Update InputModal.tsx**

Apply these dark classes:

- Overlay: add `dark:bg-black/70`
- Modal container: add `dark:bg-stone-800` to `bg-white`
- Header: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-100` -> add `dark:border-stone-600`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Close button: `hover:bg-stone-200` -> add `dark:hover:bg-stone-600`; `text-stone-500` -> add `dark:text-stone-400`
- Message text: `text-stone-600` -> add `dark:text-stone-400`
- Input: `border-stone-300` -> add `dark:border-stone-600`; add `dark:bg-stone-700 dark:text-stone-100`
- Cancel button: `text-stone-600` -> add `dark:text-stone-300`; `hover:bg-stone-100` -> add `dark:hover:bg-stone-700`

**Step 4: Commit**

```bash
git add src/components/Footer.tsx src/components/ConfirmModal.tsx src/components/InputModal.tsx
git commit -m "feat: add dark mode to Footer, ConfirmModal, and InputModal"
```

---

### Task 6: Dark mode for MemberEditModal

**Files:**
- Modify: `src/components/MemberEditModal.tsx`

**Step 1: Apply dark classes**

Key classNames to update:

- Overlay: add `dark:bg-black/70`
- Main container: `bg-stone-100` -> add `dark:bg-stone-900`
- Top header: `bg-white` -> add `dark:bg-stone-800`; `border-stone-200` -> add `dark:border-stone-700`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Subtitle: `text-stone-500` -> add `dark:text-stone-400`
- Close button: `hover:bg-stone-100` -> add `dark:hover:bg-stone-700`; `text-stone-500` -> add `dark:text-stone-400`
- Character card: `bg-white` -> add `dark:bg-stone-800`; `border-stone-200` -> add `dark:border-stone-700`
- Character card header: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-200` -> add `dark:border-stone-600`
- Character name: `text-stone-800` -> add `dark:text-stone-200`
- UR exclusive label: update stone variants for dark
- Toggle switch background: `bg-stone-200` -> add `dark:bg-stone-600`
- Costume row hover: `hover:bg-stone-50/50` -> add `dark:hover:bg-stone-700/50`
- Image border: `border-stone-200` -> add `dark:border-stone-600`; `bg-stone-100` -> add `dark:bg-stone-700`
- Costume name: `text-stone-800` -> add `dark:text-stone-200`
- Level label: `text-stone-500` -> add `dark:text-stone-400`
- Level button (inactive): `bg-stone-100 text-stone-600 hover:bg-stone-200` -> add `dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600`
- Bottom footer: `bg-white` -> add `dark:bg-stone-800`; `border-stone-200` -> add `dark:border-stone-700`
- Cancel button: `text-stone-500 hover:bg-stone-100` -> add `dark:text-stone-400 dark:hover:bg-stone-700`
- Dividers: `divide-stone-100` -> add `dark:divide-stone-700`

**Step 2: Commit**

```bash
git add src/components/MemberEditModal.tsx
git commit -m "feat: add dark mode to MemberEditModal"
```

---

### Task 7: Dark mode for MemberSearchModal

**Files:**
- Modify: `src/components/MemberSearchModal.tsx`

**Step 1: Apply dark classes**

Key classNames to update:

- Overlay: add `dark:bg-black/70`
- Modal container: `bg-white` -> add `dark:bg-stone-800`
- Header: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-200` -> add `dark:border-stone-600`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Search icon: `text-stone-500` (in header) -> add `dark:text-stone-400`
- Close button: `hover:bg-stone-200` -> add `dark:hover:bg-stone-600`; `text-stone-500` -> add `dark:text-stone-400`
- Search input icon: `text-stone-400` -> add `dark:text-stone-500`
- Search input: `border-stone-300` -> add `dark:border-stone-600`; `bg-stone-50` -> add `dark:bg-stone-700`; `focus:bg-white` -> add `dark:focus:bg-stone-600`; add `dark:text-stone-100`
- Search button: `bg-stone-800 hover:bg-stone-700` -> add `dark:bg-stone-600 dark:hover:bg-stone-500`
- Checkbox label: `text-stone-600` -> add `dark:text-stone-400`
- Results header: `text-stone-500` -> add `dark:text-stone-400`
- Pagination: `text-stone-600` -> add `dark:text-stone-400`; `hover:bg-stone-100` -> add `dark:hover:bg-stone-700`
- Results container: `border-stone-200` -> add `dark:border-stone-700`; `divide-stone-100` -> add `dark:divide-stone-700`
- Result row: `hover:bg-stone-50` -> add `dark:hover:bg-stone-700`
- Member name: `text-stone-800` -> add `dark:text-stone-200`
- Guild name: `text-stone-500` -> add `dark:text-stone-400`
- View guild button: `text-amber-700 bg-amber-50 hover:bg-amber-100` -> add `dark:text-amber-400 dark:bg-amber-900/30 dark:hover:bg-amber-900/50`
- Archived button: `bg-stone-100 text-stone-400` -> add `dark:bg-stone-700 dark:text-stone-500`
- No results icon: `text-stone-300` -> add `dark:text-stone-600`
- No results text: `text-stone-500` -> add `dark:text-stone-400`
- Search hint: `text-stone-400` -> add `dark:text-stone-500`

**Step 2: Commit**

```bash
git add src/components/MemberSearchModal.tsx
git commit -m "feat: add dark mode to MemberSearchModal"
```

---

### Task 8: Dark mode for ArchivedMembersManager

**Files:**
- Modify: `src/components/ArchivedMembersManager.tsx`

**Step 1: Apply dark classes**

Key classNames to update:

- Loading text: `text-stone-500` -> add `dark:text-stone-400`
- Section heading icon: `text-stone-600` -> add `dark:text-stone-400`
- Section heading: `text-stone-800` -> add `dark:text-stone-200`
- Table container: `bg-white` -> add `dark:bg-stone-800`; `border-stone-200` -> add `dark:border-stone-700`
- Table head: `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-200` -> add `dark:border-stone-600`; `text-stone-600` -> add `dark:text-stone-300`
- Table body dividers: `divide-stone-100` -> add `dark:divide-stone-700`
- Empty state: `text-stone-500` -> add `dark:text-stone-400`
- Row hover: `hover:bg-stone-50` -> add `dark:hover:bg-stone-700`; expanded `bg-stone-50` -> add `dark:bg-stone-700`
- Member name: `text-stone-800` -> add `dark:text-stone-200`
- Guild name column: `text-stone-600` -> add `dark:text-stone-400`
- Date column: `text-stone-500` -> add `dark:text-stone-400`
- Count badge: `bg-stone-100` -> add `dark:bg-stone-700`; `text-stone-600` -> add `dark:text-stone-300` (but this is in the count span)
- History button active: `bg-amber-100 text-amber-700` -> add `dark:bg-amber-900/30 dark:text-amber-400`
- History button inactive: `text-stone-500 hover:bg-stone-100` -> add `dark:text-stone-400 dark:hover:bg-stone-700`
- Unarchive button: `bg-green-50 text-green-600 hover:bg-green-100` -> add `dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50`
- History expanded area: `bg-stone-50/50` -> add `dark:bg-stone-800/50`
- History label: `text-stone-500` -> add `dark:text-stone-400`
- Timeline line: `before:bg-stone-200` -> add `dark:before:bg-stone-600`
- Timeline dot: `bg-stone-200 border-white` -> add `dark:bg-stone-600 dark:border-stone-800`
- History card: `bg-white border-stone-200` -> add `dark:bg-stone-700 dark:border-stone-600`
- History number: `text-stone-400` -> add `dark:text-stone-500`
- History guild text: `text-stone-800` -> add `dark:text-stone-200`
- History date: `text-stone-500` -> add `dark:text-stone-400`
- Reason badge: `text-stone-600 bg-stone-50 border-stone-100` -> add `dark:text-stone-300 dark:bg-stone-600 dark:border-stone-500`
- Pagination buttons: `bg-white border-stone-200 text-stone-600 hover:bg-stone-50` -> add `dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-700`
- Page info: `text-stone-600` -> add `dark:text-stone-400`
- Unarchive modal: apply same modal dark patterns (overlay, bg-white->dark:bg-stone-800, etc.)
- Warning banner in unarchive modal: `bg-amber-50 border-amber-400 text-amber-800` -> add `dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200`
- Select input: `border-stone-300 bg-white` -> add `dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100`
- Label: `text-stone-600` -> add `dark:text-stone-400`
- Confirm unarchive button: keep as-is (green-600 works in dark)
- Cancel button: `bg-stone-200 text-stone-700 hover:bg-stone-300` -> add `dark:bg-stone-600 dark:text-stone-200 dark:hover:bg-stone-500`

**Step 2: Commit**

```bash
git add src/components/ArchivedMembersManager.tsx
git commit -m "feat: add dark mode to ArchivedMembersManager"
```

---

### Task 9: Dark mode for password management components

**Files:**
- Modify: `src/components/BulkPasswordUpdate.tsx`
- Modify: `src/components/SinglePasswordUpdate.tsx`

**Step 1: Update BulkPasswordUpdate.tsx**

Key classNames:

- Container: `bg-white border-stone-200` -> add `dark:bg-stone-800 dark:border-stone-700`
- Header border: `border-stone-100` -> add `dark:border-stone-700`
- Title icon: `text-amber-600` (keep as-is, works in dark)
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Step number: `bg-stone-800` (keep, already dark)
- Step title: `text-stone-700` -> add `dark:text-stone-300`
- Step description: `text-stone-500` -> add `dark:text-stone-400`
- Export button: `bg-stone-100 text-stone-700 hover:bg-stone-200` -> add `dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600`
- Section divider: `border-stone-100` -> add `dark:border-stone-700`
- File input: `text-stone-500` -> add `dark:text-stone-400`
- Status success: `bg-emerald-50 text-emerald-700 border-emerald-100` -> add `dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800`
- Status error: `bg-rose-50 text-rose-700 border-rose-100` -> add `dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800`
- Warning box: `bg-amber-50 border-amber-100 text-amber-800` -> add `dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200`

**Step 2: Update SinglePasswordUpdate.tsx**

Key classNames:

- Container: `bg-white border-stone-200` -> add `dark:bg-stone-800 dark:border-stone-700`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Labels: `text-stone-600` -> add `dark:text-stone-400`
- Input icon: `text-stone-400` -> add `dark:text-stone-500`
- Select/inputs: `border-stone-300 bg-white` -> add `dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100`
- Disabled select: `disabled:bg-stone-50` -> add `dark:disabled:bg-stone-800`
- Password inputs: `border-stone-300` -> add `dark:border-stone-600`; add `dark:bg-stone-700 dark:text-stone-100`
- Status success: same as BulkPasswordUpdate
- Status error: same as BulkPasswordUpdate
- Submit button: `bg-stone-800 hover:bg-stone-700` -> add `dark:bg-stone-600 dark:hover:bg-stone-500`

**Step 3: Commit**

```bash
git add src/components/BulkPasswordUpdate.tsx src/components/SinglePasswordUpdate.tsx
git commit -m "feat: add dark mode to password management components"
```

---

### Task 10: Dark mode for Login page

**Files:**
- Modify: `src/pages/Login.tsx`

**Step 1: Apply dark classes**

Key classNames:

- Page background: `bg-stone-200` -> add `dark:bg-stone-950`
- Main card: `bg-white` -> add `dark:bg-stone-800`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Guild section container: `border-stone-200 bg-stone-50` -> add `dark:border-stone-700 dark:bg-stone-700`
- Section title (with icon): keep current
- Loading spinner text: `text-stone-500` -> add `dark:text-stone-400`; spinner `border-stone-500` -> add `dark:border-stone-400`
- No guilds text: `text-stone-500` -> add `dark:text-stone-400`
- Guild buttons: `bg-white` -> add `dark:bg-stone-800`; other classes depend on tier -- keep the tier color functions (already updated) and update the hardcoded hover backgrounds:
  - `hover:bg-orange-50 border-orange-200` -> add `dark:hover:bg-orange-900/20 dark:border-orange-800`
  - `hover:bg-blue-50 border-blue-200` -> add `dark:hover:bg-blue-900/20 dark:border-blue-800`
  - `hover:bg-stone-50 border-stone-300` -> add `dark:hover:bg-stone-700 dark:border-stone-600`
  - `hover:bg-green-50 border-green-200` -> add `dark:hover:bg-green-900/20 dark:border-green-800`
  - `hover:bg-stone-50 border-stone-200` -> add `dark:hover:bg-stone-700 dark:border-stone-700`
- Disabled button: `border-stone-200` -> add `dark:border-stone-700`; `text-stone-800` -> add `dark:text-stone-300`
- Enabled button text: `text-stone-800` is default (gets dark via tier functions)
- Icon: `text-stone-400` -> add `dark:text-stone-500`
- Guild login modal: apply same modal dark pattern as Header LoginModal (overlay, bg-white, etc.)
- Error message: `text-red-600 bg-red-50 border-red-100` -> add `dark:text-red-400 dark:bg-red-900/30 dark:border-red-800`
- Login input: same dark patterns as Header LoginModal
- Submit button: `bg-stone-800 hover:bg-stone-700` -> add `dark:bg-stone-600 dark:hover:bg-stone-500`

**Step 2: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat: add dark mode to Login page"
```

---

### Task 11: Dark mode for AdminDashboard page

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`

**Step 1: Apply dark classes to the main AdminDashboard layout and TabButton**

Main layout:
- `bg-stone-100` -> add `dark:bg-stone-900`
- Stats text: `text-stone-400` -> add `dark:text-stone-500`
- Tab bar border: `border-stone-300` -> add `dark:border-stone-700`
- Content container: `bg-white border-stone-200` -> add `dark:bg-stone-800 dark:border-stone-700`

TabButton function:
- Active: `text-amber-600 border-amber-600` (keep, works in dark)
- Inactive: `text-stone-500 hover:text-stone-800` -> add `dark:text-stone-400 dark:hover:text-stone-200`

**Step 2: Apply dark classes to passwords tab inline content**

- Warning banner: `bg-amber-50 border-amber-400 text-amber-800` -> add `dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200`
- Code element: `bg-amber-100` -> add `dark:bg-amber-900/50`
- Section titles: `text-stone-800` -> add `dark:text-stone-200`
- Section descriptions: `text-stone-500` -> add `dark:text-stone-400`
- Dividers: `border-stone-100` -> add `dark:border-stone-700`

**Step 3: Apply dark classes to GuildsManager, CostumesManager, BackupManager, ToolsManager, SettingsManager**

These are internal components within AdminDashboard.tsx. Apply the same patterns:

For all of them, the common patterns are:
- `bg-white` -> add `dark:bg-stone-800`
- `bg-stone-50` -> add `dark:bg-stone-700`
- `text-stone-800` -> add `dark:text-stone-200`
- `text-stone-600` -> add `dark:text-stone-400`
- `text-stone-500` -> add `dark:text-stone-400`
- `border-stone-200` -> add `dark:border-stone-700`
- `border-stone-100` -> add `dark:border-stone-700`
- `border-stone-300` -> add `dark:border-stone-600`
- `hover:bg-stone-100` -> add `dark:hover:bg-stone-700`
- `hover:bg-stone-200` -> add `dark:hover:bg-stone-600`
- `bg-stone-100` (backgrounds) -> add `dark:bg-stone-700`
- Input fields: add `dark:bg-stone-700 dark:border-stone-600 dark:text-stone-100`
- `bg-stone-800` buttons (already dark, keep)
- Warning/info banners: same pattern as other modals

Since AdminDashboard.tsx is a large file (~1650 lines), work through it methodically section by section. Use search-and-replace where class patterns repeat.

**Step 4: Commit**

```bash
git add src/pages/AdminDashboard.tsx
git commit -m "feat: add dark mode to AdminDashboard and all admin sub-components"
```

---

### Task 12: Dark mode for GuildDashboard page

**Files:**
- Modify: `src/pages/GuildDashboard.tsx`

**Step 1: Apply dark classes**

Key areas:

Permission denied view:
- `bg-stone-100` -> add `dark:bg-stone-900`
- Card: `bg-white border-stone-200` -> add `dark:bg-stone-800 dark:border-stone-700`
- Title: `text-stone-800` -> add `dark:text-stone-200`
- Text: `text-stone-500` -> add `dark:text-stone-400`
- Button: `bg-stone-800 hover:bg-stone-700` -> add `dark:bg-stone-600 dark:hover:bg-stone-500`

Main layout:
- `bg-stone-100` -> add `dark:bg-stone-900`

Sidebar overlay:
- `bg-stone-900/50` (keep, already dark-friendly)

Sidebar:
- Already uses `bg-stone-900` -- no changes needed

Sub-header:
- `bg-white` -> add `dark:bg-stone-800`
- `hover:bg-stone-100` -> add `dark:hover:bg-stone-700`
- Menu icon: `text-stone-600` -> add `dark:text-stone-400`
- Guild name: `text-stone-800` -> add `dark:text-stone-200`
- Member count: `text-stone-500` -> add `dark:text-stone-400`
- Over-30 warning: `text-red-500 bg-red-50` -> add `dark:bg-red-900/30`
- Search button: `text-stone-400 hover:text-stone-600 hover:bg-stone-100` -> add `dark:text-stone-500 dark:hover:text-stone-300 dark:hover:bg-stone-700`

Table:
- Container: `bg-white border-stone-200` -> add `dark:bg-stone-800 dark:border-stone-700`
- Loading overlay: `bg-white/50` -> add `dark:bg-stone-800/50`; loading card `bg-white border-stone-100` -> add `dark:bg-stone-700 dark:border-stone-600`; spinner `border-stone-200 border-t-stone-800` -> add `dark:border-stone-600 dark:border-t-stone-200`; loading text `text-stone-600` -> add `dark:text-stone-400`
- Table header: `bg-stone-50 text-stone-600` -> add `dark:bg-stone-700 dark:text-stone-300`
- Sticky header cells: all `bg-stone-50` -> add `dark:bg-stone-700`; `border-stone-200` -> add `dark:border-stone-600`; `hover:bg-stone-100` -> add `dark:hover:bg-stone-600`; `shadow-[1px_0_0_0_#e7e5e4]` -> will need updating for dark mode, use `dark:shadow-[1px_0_0_0_#44403c]` (stone-700 hex)
- Image container: `bg-stone-100 border-stone-200` -> add `dark:bg-stone-700 dark:border-stone-600`
- Costume name/character name text: uses text-stone classes, add dark variants
- Table rows: `border-stone-100 hover:bg-stone-50` -> add `dark:border-stone-700 dark:hover:bg-stone-700`
- Sticky left cell: `bg-white group-hover:bg-stone-50 border-stone-200` -> add `dark:bg-stone-800 dark:group-hover:bg-stone-700 dark:border-stone-600`
- Member name: `text-stone-800` -> add `dark:text-stone-200`
- Role badges: `bg-red-100 text-red-800` -> add `dark:bg-red-900/30 dark:text-red-300`; `bg-amber-100 text-amber-800` -> add `dark:bg-amber-900/30 dark:text-amber-300`
- Updated date: `text-stone-400` -> keep (works)
- Archive remark: `text-amber-600` -> keep
- Sticky right cell: same as left sticky pattern
- Edit button: `bg-amber-100 text-amber-700 hover:bg-amber-200` -> add `dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50`
- No costume text: `text-stone-300` -> add `dark:text-stone-600`
- No members text: `text-stone-500` -> add `dark:text-stone-400`
- Shadow values for sticky columns: update for dark with `dark:shadow-[...]` using stone-700 colors

**Step 2: Commit**

```bash
git add src/pages/GuildDashboard.tsx
git commit -m "feat: add dark mode to GuildDashboard"
```

---

### Task 13: Final verification and build

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 2: Visual verification checklist**

Run `npm run dev` and manually verify each view in both light and dark modes:

- [ ] Login page: backgrounds, guild cards, guild login modal
- [ ] GuildDashboard: sidebar, table header/rows, sticky columns, member edit modal
- [ ] AdminDashboard: tabs, all tab contents (guilds, costumes, archived, passwords, backup, tools, settings)
- [ ] Toast notifications: all 4 types
- [ ] Theme toggle: cycles correctly System -> Light -> Dark -> System
- [ ] System mode: follows OS preference and updates in real-time
- [ ] Persistence: refreshing the page remembers the theme choice

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: dark mode visual adjustments"
```
