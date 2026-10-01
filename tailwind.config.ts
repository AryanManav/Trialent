import type { Config } from "tailwindcss";

/**
 * Colours come from CSS variables in src/app/tokens.css, one set for light and
 * one for dark, so every class (bg-ink-50, text-brand-700, …) follows the
 * theme. Each colour has one job so it always means something:
 *   brand (olive→lime) — every action: links, selected states, active navigation.
 *                      Built around the logo's lime: 300 is the logo colour,
 *                      600 carries white text, 700 is link text.
 *   money (green)    — fees, success, accepted work
 *   accent (orange)  — attention: unread counts, updates, highlights
 *   rose             — danger only (delete, reject, errors)
 *   amber            — waiting (under review)
 *   sky (teal)       — information, and the HIRE ONLY badge
 *   lime             — the brand signature, from the logo: selection, the
 *                      "you are here" marks, a few marketing moments. Purely
 *                      decorative — never the only signal, never for focus
 *                      (it's too light on white to meet contrast).
 *
 * The palette is deliberately restrained (GitHub-inspired): neutral surfaces
 * separated by borders, one olive-lime for action, colour only where it means
 * something.
 */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function ramp(name: string): Record<number, string> {
  return Object.fromEntries(
    STEPS.map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`])
  );
}

function token(name: string): string {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const grey = ramp("ink");
const indigo = ramp("brand");
const teal = ramp("money");
const orange = ramp("accent");

/**
 * Type: a conventional product scale (12 → 60px) with tight leading on
 * headings. Dense UI text lives at `sm` (14px); `base` is reading text.
 *
 * Space: a 4px grid. The `fibN` names are historical — they now resolve to the
 * nearest grid step, so every screen that used them sits on the same grid.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Semantic ramps — prefer these in new code.
        brand: indigo,
        accent: orange,
        money: teal,
        ink: grey,

        // Built-in names re-pointed at the same tokens, so older classes theme too.
        indigo,
        emerald: teal,
        slate: grey,
        amber: ramp("amber"),
        rose: ramp("rose"),
        sky: ramp("sky"),
        // Replaces Tailwind's lime ramp: one brand colour, not a scale.
        lime: {
          DEFAULT: token("lime"),
          fg: token("lime-fg"),
          soft: token("lime-soft"),
        },

        // Surfaces, from back to front: the page, a card, something above a card.
        canvas: token("canvas"),
        surface: token("surface"),
        raised: token("raised"),
        "surface-muted": token("canvas"),
        line: token("line"),
        "line-strong": token("line-strong"),
        // Inverted emphasis (dark on light, light on dark) and fixed dark bands.
        inverse: token("inverse"),
        "inverse-fg": token("inverse-fg"),
        night: token("night"),
        "night-line": token("night-line"),
      },
      ringOffsetColor: {
        DEFAULT: token("surface"),
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11 — overline, dense meta
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12 — caption, label
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14 — UI body
        base: ["1rem", { lineHeight: "1.5rem" }], // 16 — reading body
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18 — body large, H4
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }], // 20 — H3
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }], // 24 — H2
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }], // 30 — H1
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }], // 36
        "5xl": ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.03em" }], // 48 — display
        "6xl": ["3.75rem", { lineHeight: "4rem", letterSpacing: "-0.035em" }], // 60
      },
      spacing: {
        fib1: "0.125rem", // 2
        fib2: "0.25rem", // 4
        fib3: "0.375rem", // 6
        fib4: "0.5rem", // 8
        fib5: "0.75rem", // 12
        fib6: "1.25rem", // 20
        fib7: "2rem", // 32
        fib8: "3rem", // 48
        fib9: "5rem", // 80
      },
      borderRadius: {
        sm: "0.25rem", // 4
        DEFAULT: "0.375rem", // 6
        md: "0.375rem", // 6
        lg: "0.375rem", // 6 — controls
        xl: "0.5rem", // 8 — cards, panels
        "2xl": "0.5rem", // 8 — cards (legacy name)
        "3xl": "0.75rem", // 12 — large surfaces
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "0 0 0 1px rgb(var(--brand-600) / 0.12)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
