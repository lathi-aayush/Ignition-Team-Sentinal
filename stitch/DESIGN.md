# Design System Specification

## 1. Overview & Creative North Star: "The Digital Ledger"

This design system is built for a high-stakes, professional environment where AI meets blockchain. The Creative North Star is **"The Digital Ledger"**—an editorial-first approach that treats digital interfaces with the precision of a high-end financial broadsheet and the technical clarity of modern developer documentation.

To move beyond the "SaaS template" look, we reject the heavy use of lines and boxes. Instead, we use **Tonal Architecture**: defining structure through sophisticated layering of gray values and intentional asymmetry in type. The result is an interface that feels authoritative, silent, and premium.

---

## 2. Colors & Surface Architecture

The palette is rooted in a "cool-lithic" grayscale, punctuated by a commanding Navy and a technical Teal.

### The "No-Line" Rule
Traditional 1px borders are a crutch. In this system, boundaries are created by **background color shifts**. A component doesn't sit "inside" a box; it exists on a different "plateau." Use `--surface-container-low` for large content areas and `--surface-container-lowest` for cards to create distinction without visual noise.

### Surface Hierarchy (Nesting)
*   **Base Layer:** `--surface` (#F9F9F9) - The global canvas.
*   **Secondary Layer:** `--surface-container-low` (#F3F3F3) - For sidebars or secondary navigation.
*   **Component Layer:** `--surface-container-lowest` (#FFFFFF) - For the primary active content or cards.
*   **Elevated Layer:** `--surface-container-high` (#E8E8E8) - For hover states or distinct inset sections.

### The Glass & Texture Exception
While the base system is flat, use **Glassmorphism** for floating elements like dropdown menus or toast notifications. Use a semi-transparent `--surface-container-lowest` with a `20px` backdrop-blur. This ensures the "Ledger" feels multi-dimensional rather than static.

---

## 3. Typography: Editorial Authority

We pair the geometric confidence of **Sora** with the utilitarian precision of **DM Sans**.

| Level | Token | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Sora | 3.5rem | 600 | Hero metrics / High-impact stats |
| **Headline**| `headline-md`| Sora | 1.75rem | 600 | Section headers |
| **Title**   | `title-md`   | DM Sans | 1.125rem | 500 | Component titles / Card headers |
| **Body**    | `body-md`    | DM Sans | 0.875rem | 400 | Primary readable content |
| **Label**   | `label-sm`   | DM Sans | 0.6875rem | 600 | Metadata / Micro-copy (All Caps) |

**Asymmetric Rhythm:** Lean into large vertical spacing between headlines and body text. Use tight tracking (-2%) on Sora headlines to give them a "printed" feel.

---

## 4. Elevation & Depth: Tonal Layering

We convey hierarchy through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** To separate a code snippet from a description, do not draw a box. Place the code on `--surface-container-highest` and the description on `--surface-container-lowest`. 
*   **Ambient Shadows:** If a component must float (e.g., a modal), use a high-diffusion shadow: `0 20px 40px rgba(3, 22, 52, 0.06)`. Note the use of the primary Navy color in the shadow to keep it "branded" and natural.
*   **The "Ghost Border":** If accessibility requires a container boundary, use `--outline-variant` at **15% opacity**. This creates a suggestion of a border that disappears into the background upon quick glance.

---

## 5. Components

### Buttons (The "Six-Pixel" Standard)
All components use a strict **6px radius** (`--md`). No pills.
*   **Primary:** `--primary` (#031634) with `--on-primary` text. This is your "Executive Action" button.
*   **Secondary:** `--surface-container-highest` (#E2E2E2) with `--on-surface` text. Low contrast for utility.
*   **Tertiary:** No background. Bold `--on-surface-variant` text with an 18px Lucide icon.

### Input Fields
*   **Structure:** No 4-sided borders. Use a `--surface-container-high` background with a 2px bottom-accent in `--primary` only when focused.
*   **State:** Errors must use `--error` text and a subtle `--error-container` background wash.

### Data Cards & Prompt Lists
**Forbid divider lines.** Use `24px` or `32px` of vertical white space to separate list items. Each prompt entry should be treated as an "article," using `label-sm` for blockchain transaction hashes to keep the interface feeling like a professional tool.

### Transaction Chips
Small, rectangular tags using `--secondary-container` (#6FF9DC) with `--on-secondary-container` (#007261) text. These represent "Success" or "Verified on Algorand" states.

---

## 6. Do’s and Don’ts

### Do:
*   **Use White Space as a Separator:** If you feel the urge to add a line, add 16px of padding instead.
*   **Align to the Type Baseline:** Ensure icons (18px) are vertically centered with the x-height of DM Sans body text.
*   **Use Subtle Color Blending:** Let the teal of the success states be the only "vibrant" moment in a sea of gray and navy.

### Don’t:
*   **Don't use Pill Shapes:** They are too "consumer-tech." Stay with 6px corners to maintain the fintech rigor.
*   **Don't use Pure Black:** Always use `--on-background` (#1A1C1C) for text to prevent visual vibration against the white base.
*   **Don't use Gradients:** All surfaces must be solid and "architectural," unless using the semi-transparent glass effect for overlays.