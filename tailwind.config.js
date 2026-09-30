/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        'surface-subtle': '#f1f5f9',
        'on-background': '#0f172a',
        'on-surface': '#1e293b',
        'on-surface-variant': '#64748b',
        primary: '#0f172a',
        brand: '#0284c7',
        'brand-dark': '#0369a1',
        success: '#166534',
        'success-bg': '#f0fdf4',
        warning: '#92400e',
        'warning-bg': '#fefce8',
        border: '#e2e8f0',
        'border-strong': '#cbd5e1',
      },
      fontFamily: {
        headline: ['"Source Sans 3"', 'sans-serif'],
        body: ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
