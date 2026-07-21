/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette, taken from the Ralia design system.
        brand: {
          DEFAULT: '#F70909',
          600: '#E00808',
          700: '#B0111B',
          800: '#7C0D14',
        },
        ink: '#2A1516',
        body: '#3A2C2D',
        muted: '#8A7877',
        rule: '#EEDEDE',
        wash: '#FCF6F6',
        paper: '#FFFFFF',
        ok: { DEFAULT: '#349933', wash: '#E9F4E9' },
        warn: { DEFAULT: '#C98A00', wash: '#FBF1DA' },
      },
      fontFamily: {
        sans: ['var(--font-urbanist)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,21,22,0.04), 0 8px 24px rgba(42,21,22,0.05)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in 0.25s ease-out' },
    },
  },
  plugins: [],
};
