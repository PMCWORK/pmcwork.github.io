import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/react/node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'Plus Jakarta Sans', 'sans-serif'],
        display: ['"Chakra Petch"', 'Space Grotesk', 'Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#f4f5f8",
            foreground: "#191c22",
            primary: {
              50: "#eaf5fd",
              100: "#d0e9fb",
              200: "#a5d5f8",
              300: "#6dc3f5",
              400: "#4fa8f0",
              500: "#2f8fe0",
              600: "#1d72be",
              700: "#185a95",
              800: "#164c7d",
              900: "#164067",
              DEFAULT: "#2f8fe0",
              foreground: "#ffffff",
            },
            focus: "#2f8fe0",
          },
        },
        dark: {
          colors: {
            background: "#12151b",
            foreground: "#edeff3",
            primary: {
              50: "#164067",
              100: "#164c7d",
              200: "#185a95",
              300: "#1d72be",
              400: "#2f8fe0",
              500: "#4fa8f0",
              600: "#6dc3f5",
              700: "#a5d5f8",
              800: "#d0e9fb",
              900: "#eaf5fd",
              DEFAULT: "#4fa8f0",
              foreground: "#091b2c",
            },
            focus: "#4fa8f0",
          },
        },
      },
    }),
  ],
};
