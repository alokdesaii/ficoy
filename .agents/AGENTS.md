# Project-Specific Rules & Guidelines for AI Assistant

You are working in the Ficoy project workspace. Adhere strictly to the following rules when creating, modifying, or refactoring code.

---

## 1. Tech Stack & Library Constraints
- **Core Framework**: React 18 with TypeScript.
- **Build System**: Vite 6.
- **Styling**: Tailwind CSS v4.
- **Components**: Radix UI primitive wrappers styled with Tailwind.
- **Imports**: Always use the path alias `@/` to import files from `src/` (e.g. `@/app/components/ui/button` instead of relative paths).

---

## 2. Directory Structure Conventions
- **Shared UI Elements**: Place/find reusable UI primitives in [src/app/components/ui/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/app/components/ui). Never duplicate these components.
- **Screen/Feature Assets**: Place screen-specific imports, images, SVGs, or components in subfolders under [src/imports/](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/imports) (e.g. `@/imports/01Login/`).
- **Styles**: Custom theme variables are defined in [theme.css](file:///Users/alokdesai/alok/work/hnh/hnh/tech-platforms/ficoy/ficoy-code/src/styles/theme.css). Do not define CSS overrides inside other styles folders unless strictly localized.

---

## 3. Styling & Tailwind CSS Rules
- **Tailwind v4 Variables**: Use the core theme variables in CSS or Tailwind utility classes when styling.
  - E.g., Use `bg-primary`, `text-primary-foreground`, `bg-secondary`, `text-foreground`, `border-border`.
- **Dynamic Classes**: Always use the `cn()` helper from `@/app/components/ui/utils` to merge class lists conditionally.
- **Responsive Layouts**:
  - Prioritize standard Flexbox/Grid systems and responsive utilities over absolute positions.
  - For full-viewport or container-scaled elements, use fluid scaling (e.g., `clamp()`, viewport percentage spacing) to ensure correct layouts on small and large screens.
- **Fonts**: Default font families are `Inter` and `Instrument Sans` (imported in `fonts.css`).

---

## 4. Brand Design System Cheat Sheet
- **Primary Brand Blue**: `#023e63` (hover: `#02568a`, active: `#012b45`). Use for principal buttons/actions and focus borders.
- **Accent Teal**: `#01b1ab`. Use for labels, highlights, indicators, and status indicators.
- **Muted Colors**: `#c5d4e7` (border), `#8096b2` (input labels), and `#f3f3f5` (input background).
- **Default Text/Dark**: `#212121` for dark headers and high contrast text.
- **Border Radius**: Use `--radius` based values:
  - `rounded-sm` -> 6px
  - `rounded-md` -> 8px
  - `rounded-lg` -> 10px
  - `rounded-xl` -> 14px

---

## 5. Coding & Refactoring Standards
- **Keep Files Short**: Keep React components under 250 lines. Extract UI details or auxiliary sections if they grow too large.
- **Clean SVG Pathing**: Do not inline huge SVG path strings in JSX. Store them in external helper files (e.g., `svg-*.ts`) as string properties and import them inside SVGs.
- **Component Signatures**: Always use modern React typing conventions, `React.ComponentProps`, and standard functional components.
