# Developer Guidelines

This document outlines the guidelines, architectural standards, and styling systems for the project. All developers (and AI assistants) must adhere to these rules when building or refactoring code.

---

## 1. Technical Stack
* **Core Framework**: React 18 with TypeScript.
* **Build Tool**: Vite 6, using `@tailwindcss/vite` plugin.
* **Package Manager**: `pnpm` (configured via `pnpm-workspace.yaml`).
* **UI Components**: Radix UI primitives styled with Tailwind (similar to shadcn/ui).
* **Icons**: [lucide-react](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/package.json#L49).

---

## 2. Directory Structure & Path Aliases
* **Path Alias**: `@/` maps directly to the `src/` directory. Always use `@/` for imports instead of relative paths (e.g., use `@/app/components/ui/button` instead of `../../components/ui/button`).
* **Directory Breakdown**:
  * [src/app/components/ui/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/app/components/ui) - Reusable design system primitives (Button, Card, Input, etc.).
  * [src/app/components/figma/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/app/components/figma) - Custom helper components (e.g., `ImageWithFallback.tsx`).
  * [src/imports/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/imports) - Figma-generated assets and raw exports grouped by feature/screen (e.g., `01Login/`).
  * [src/styles/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/styles) - CSS configurations, fonts, and custom themes.

---

## 3. Styling & CSS System
* **Tailwind v4**: The project uses Tailwind CSS v4. Config imports are in [index.css](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/styles/index.css):
  ```css
  @import './fonts.css';
  @import './tailwind.css';
  @import './theme.css';
  ```
* **Theme Tokens**: Core theme variables are declared in [theme.css](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/styles/theme.css) inside `:root` and `.dark` blocks.
* **Base Styles**: Elements like headings (`h1`-`h4`), inputs, buttons, and labels have baseline typography definitions under `@layer base`. Avoid overriding these with custom inline styles unless specifically required for a unique page design.
* **Class Merging**: Use the `cn()` helper from `@/app/components/ui/utils` to combine Tailwind class lists conditionally:
  ```tsx
  import { cn } from "@/app/components/ui/utils";
  
  function CustomComponent({ className }) {
    return <div className={cn("bg-card text-foreground p-4", className)} />;
  }
  ```

---

## 4. Brand Design Tokens
Always align layouts and UI elements with the following design patterns:

### Typography
* **Primary Font**: `Inter` (used for main app interface, forms, buttons).
* **Secondary Font**: `Instrument Sans`.
* **Default font size**: `16px` (`html` font-size is set to `var(--font-size)`).

### Colors
* **Primary Brand Blue**: `#023e63` (interactive state variants: hover: `#02568a`, active: `#012b45`). Use this for submit buttons, primary actions, and focus rings.
* **Accent Teal**: `#01b1ab`. Use this for subheadings, indicators, active status highlights, and supporting callouts.
* **Muted/Borders**: `#c5d4e7` (borders), `#8096b2` (input labels), and `#f3f3f5` (input backgrounds).
* **Dark Neutral**: `#212121`. Used for card headers, input values, and standard body text.

### Border Radius
* **Base Radius**: `--radius: 0.625rem` (`10px`).
* **Scale**:
  * `sm` -> `6px` (`calc(var(--radius) - 4px)`)
  * `md` -> `8px` (`calc(var(--radius) - 2px)`)
  * `lg` -> `10px` (`var(--radius)`)
  * `xl` -> `14px` (`calc(var(--radius) + 4px)`)

---

## 5. Coding & Performance Rules
* **Modularity**: Keep components small. If a component grows past 250 lines, extract helper components or layout sections into separate sub-files.
* **Clean SVG Management**: Avoid embedding very long SVG path strings inside main component files. Store path definitions in a separate file (e.g., `svg-*.ts` helper) and import them as needed to keep JSX clean and readable.
* **Layouts & Responsiveness**:
  * Default to responsive Flexbox or Grid layouts.
  * Use relative scaling sizes (`clamp()`, `vw`, `vh`) for viewport-filling landing/login pages to handle diverse screen resolutions gracefully.
  * Only use absolute positioning when replicating precise pixel-perfect illustrations.
