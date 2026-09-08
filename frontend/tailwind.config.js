/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ceep: {
          green: {
            DEFAULT: "#059669",
            light: "#10B981",
            dark: "#047857",
            subtle: "#ECFDF5",
          },
          navy: {
            DEFAULT: "#0B192C",
            light: "#1E3E62",
            dark: "#060D17",
            card: "#0F2238",
          },
          slate: {
            50: "#F8FAFC",
            100: "#F1F5F9",
            200: "#E2E8F0",
            300: "#CBD5E1",
            700: "#334155",
            800: "#1E293B",
            900: "#0F172A",
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
