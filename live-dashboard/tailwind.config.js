/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#090a0f',
          850: '#0f111a',
          800: '#161926',
          700: '#23273c',
        }
      }
    },
  },
  plugins: [],
}