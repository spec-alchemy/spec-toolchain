import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "1rem",
        md: "0.875rem",
        sm: "0.75rem"
      },
      colors: {
        background: "#f5f1e8",
        foreground: "#2e2a25",
        card: "#fffbf2",
        "card-foreground": "#2e2a25",
        border: "#d6c8af",
        input: "#d6c8af",
        ring: "#a88e65",
        muted: "#f3ece0",
        "muted-foreground": "#75695a",
        accent: "#efe5d0",
        "accent-foreground": "#2e2a25",
        primary: "#8d5c2f",
        "primary-foreground": "#fffdf8"
      },
      boxShadow: {
        viewer: "0 18px 40px rgba(79, 62, 38, 0.12)"
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: [animate]
} satisfies Config;
