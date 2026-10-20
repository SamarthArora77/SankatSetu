/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f8f5',
          100: '#e1efe8',
          200: '#c4dfd2',
          300: '#9bc6b3',
          400: '#6da78f',
          500: '#488b71',
          600: '#34705a',
          700: '#2a5a49',
          800: '#1b4332',
          900: '#153628',
          950: '#0b2018',
        },
        warm: {
          50: '#fffaf5',
          100: '#ffeedb',
          200: '#ffd9b3',
          300: '#ffbc80',
          400: '#f99547',
          500: '#ea580c',
          600: '#d94d07',
          700: '#c23d05',
          800: '#9a320c',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
