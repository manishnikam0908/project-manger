/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support toggling theme
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        card: '#1E293B',
        border: '#334155',
        text: '#F8FAFC',
        primary: {
          DEFAULT: '#1E293B',
          foreground: '#F8FAFC',
        },
        secondary: {
          DEFAULT: '#334155',
          foreground: '#F8FAFC',
        },
        accent: {
          DEFAULT: '#22C55E',
          foreground: '#0F172A',
        },
        danger: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Fira Sans', 'sans-serif'],
        code: ['Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
