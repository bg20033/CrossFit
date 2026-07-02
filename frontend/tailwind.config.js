import tailwindcssAnimate from "tailwindcss-animate"

/**
 * Stand Up CrossFit — design tokens (README → Design Tokens).
 * Flat, minimal: warm canvas, black/white, single red accent #EE3A24.
 *
 * Strategy: the app uses `coral-*` for the brand accent and `gray-*` for
 * neutrals throughout. We remap both scales to the spec palette so every
 * existing utility class re-skins consistently, and expose semantic aliases
 * (canvas / surface / ink / line / success) for new code.
 */
export default {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent — single red #EE3A24 (replaces old coral).
        coral: {
          50: "#FBE3DD",  // accent-soft
          100: "#F8CFC6",
          200: "#F3A99B",
          300: "#EF8270",
          400: "#F05C42",
          500: "#EE3A24",  // accent (primary)
          600: "#D32E1A",  // accent hover
          700: "#B03A26",  // accent-ink (text on accent-soft)
          800: "#8A2A1B",
          900: "#6B2014",
        },
        // Neutrals — warm-tinted to match the canvas/ink system.
        gray: {
          50: "#F7F5F0",
          100: "#ECE8E0",  // line-subtle / inset chips
          200: "#DCD7CD",  // line / borders
          300: "#C7C0B4",  // hover borders
          400: "#9A938A",  // faint / tertiary labels
          500: "#6E665C",  // ink-soft / secondary text
          600: "#574F46",
          700: "#403A33",
          800: "#2A2620",  // dark panel inset
          900: "#16130F",  // ink / primary text
        },
        // Semantic aliases (spec names) for new components.
        canvas: "#ECEAE4",
        surface: "#FFFFFF",
        "surface-alt": "#F4F2EC",
        ink: {
          DEFAULT: "#16130F",
          soft: "#6E665C",
          faint: "#9A938A",
        },
        line: {
          DEFAULT: "#DCD7CD",
          subtle: "#ECE8E0",
        },
        accentsoft: "#FBE3DD",
        accentink: "#B03A26",
        success: "#1F9D55",

        // Public marketing site palette (Landing / PublicLayout only).
        // Warm cream + clay/terracotta + olive, per the marketing design ref.
        cream: "#F4EFE6",          // page background
        sand: "#EAE2D4",           // alt section background
        paper: "#FCFAF5",          // card background
        cocoa: "#241F18",          // dark ink / footer / pricing bg
        clay: {
          DEFAULT: "#B0603A",      // primary accent (terracotta)
          light: "#E9A57E",        // headline accent on dark
          mid: "#D08A63",          // eyebrow on dark
        },
        olive: "#6B6E44",          // secondary accent (tags, success line)

        // shadcn CSS-var bindings (kept; values rewired in index.css).
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Hanken Grotesk"', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
        // Marketing display serif (public pages).
        newsreader: ['"Newsreader"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      borderRadius: {
        lg: "var(--radius)",                  // 14px cards
        md: "calc(var(--radius) - 4px)",      // 10px buttons/inputs
        sm: "calc(var(--radius) - 6px)",      // 8px chips
        xl: "16px",
        '2xl': "20px",
      },
      boxShadow: {
        DEFAULT: "none",
        sm: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
        card: "none",
        phone: "none",
        soft: "none",
      },
      backgroundImage: {
        striped:
          "repeating-linear-gradient(135deg, #F1EEE7 0 7px, #F7F4EE 7px 14px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
