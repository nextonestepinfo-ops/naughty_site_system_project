import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 18, 38, 0.05), 0 8px 24px -10px rgba(11, 18, 38, 0.12)",
        command: "0 18px 45px -24px rgba(11, 18, 38, 0.38)",
      },
      borderRadius: {
        panel: "20px",
        control: "16px",
      },
    },
  },
  plugins: [typography],
};

export default config;
