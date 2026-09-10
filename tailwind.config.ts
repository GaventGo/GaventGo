import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: "#6C2BD9",
          50: "#F3EDFC",
          100: "#E5D8F8",
          600: "#6C2BD9",
          700: "#5A22B3",
          900: "#2E1160",
        },
        orange: {
          DEFAULT: "#FF8A00",
          50: "#FFF3E2",
          600: "#FF8A00",
          700: "#DB7500",
        },
        ink: "#111111",
        canvas: "#F8F8FC",
        success: "#16A34A",
        error: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        card: "0 2px 8px rgba(17, 17, 17, 0.06)",
        "card-hover": "0 12px 32px rgba(108, 43, 217, 0.16)",
        glow: "0 8px 24px rgba(255, 138, 0, 0.25)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #6C2BD9 0%, #8B4FE0 55%, #FF8A00 130%)",
      },
    },
  },
  plugins: [],
};

export default config;
