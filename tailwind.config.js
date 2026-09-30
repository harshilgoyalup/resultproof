/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'on-background': '#f8fafc',
        background: '#030712',
        surface: '#030712',
        'on-surface': '#f1f5f9',
        'on-surface-variant': '#94a3b8',
        primary: '#38bdf8',
        secondary: '#0284c7',
      },
      fontFamily: {
        headline: ['"Source Sans 3"', 'sans-serif'],
        body: ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
