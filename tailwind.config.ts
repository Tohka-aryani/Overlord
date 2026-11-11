import type { Config } from "tailwindcss";

/**
 * Tailwind v4 primarily uses CSS-first config via `@theme` in globals.css.
 * This file documents project tokens for tooling and future theme extensions.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#12141a",
          elevated: "#1a1d26",
        },
        threat: {
          DEFAULT: "#f5a524",
          muted: "#c4851c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
