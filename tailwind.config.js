/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand red reads on both themes; the rest are CSS variables that flip in
        // .dark (see globals.css), as RGB triplets so opacity modifiers still work.
        brand: {
          DEFAULT: '#F70909',
          600: '#E00808',
          700: '#B0111B',
          800: '#7C0D14',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        wash: 'rgb(var(--wash) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        ok: { DEFAULT: '#2f9e44', wash: 'rgb(var(--ok-wash) / <alpha-value>)' },
        warn: { DEFAULT: '#c98a00', wash: 'rgb(var(--warn-wash) / <alpha-value>)' },
      },
      fontFamily: {
        sans: ['var(--font-urbanist)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in 0.25s ease-out' },
    },
  },
  plugins: [],
};
