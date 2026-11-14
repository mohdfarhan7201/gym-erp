import animate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Barlow Condensed'", "Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
        lime: { DEFAULT: "hsl(var(--lime) / <alpha-value>)", foreground: "hsl(var(--lime-foreground) / <alpha-value>)", soft: "hsl(var(--lime-soft) / <alpha-value>)" },
        navy: { DEFAULT: "hsl(var(--navy) / <alpha-value>)" },
        destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
        success: { DEFAULT: "hsl(var(--success) / <alpha-value>)", soft: "hsl(var(--success-soft) / <alpha-value>)" },
        warning: { DEFAULT: "hsl(var(--warning) / <alpha-value>)", soft: "hsl(var(--warning-soft) / <alpha-value>)" },
        danger: { DEFAULT: "hsl(var(--danger) / <alpha-value>)", soft: "hsl(var(--danger-soft) / <alpha-value>)" },
        info: { DEFAULT: "hsl(var(--info) / <alpha-value>)", soft: "hsl(var(--info-soft) / <alpha-value>)" },
        muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
        popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
        card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
        sidebar: { DEFAULT: "hsl(var(--sidebar) / <alpha-value>)", foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)", muted: "hsl(var(--sidebar-muted) / <alpha-value>)", border: "hsl(var(--sidebar-border) / <alpha-value>)" },
      },
      borderRadius: { xl: "calc(var(--radius) + 4px)", lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)",
        lift: "0 10px 30px -12px rgba(16,24,40,.18)",
        glow: "0 0 0 1px hsl(var(--lime) / .35), 0 8px 24px -8px hsl(var(--lime) / .45)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "badge-pop": { "0%": { transform: "scale(.6)" }, "60%": { transform: "scale(1.15)" }, "100%": { transform: "scale(1)" } },
        "pulse-ring": { "0%": { transform: "scale(.9)", opacity: ".7" }, "100%": { transform: "scale(1.8)", opacity: "0" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        "badge-pop": "badge-pop .4s ease-out",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(.2,.6,.4,1) infinite",
      },
    },
  },
  plugins: [animate],
};
