/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--border)", // mapping input border to same as general border
        ring: "rgb(var(--accent-1-rgb))", // focus rings use accent
        background: "var(--bg)",
        foreground: "var(--text)",
        primary: {
          DEFAULT: "var(--accent-1)",
          foreground: "var(--on-accent, #ffffff)",
        },
        secondary: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted)",
        },
        accent: {
          DEFAULT: "var(--accent-1)",
          foreground: "var(--on-accent, #ffffff)",
        },
        popover: {
          DEFAULT: "var(--bg)",
          foreground: "var(--text)",
        },
        card: {
          DEFAULT: "var(--bg)",
          foreground: "var(--text)",
        },
      },
      borderRadius: {
        lg: "var(--radius, 16px)",
        md: "calc(var(--radius, 16px) - 2px)",
        sm: "calc(var(--radius, 16px) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

