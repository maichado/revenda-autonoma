/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta RVD Autônoma
        primary: {
          DEFAULT: '#C8A96E',
          50: '#FAF5EC',
          100: '#F2E8D0',
          200: '#E6D2A4',
          300: '#D9BB78',
          400: '#CCA54C',
          500: '#C8A96E',
          600: '#A88B52',
          700: '#7E683E',
          800: '#54452A',
          900: '#2A2315',
        },
        bg: {
          dark: '#0F0F0F',
          light: '#F9F9F7',
        },
        surface: {
          dark: '#1A1A1A',
          light: '#FFFFFF',
        },
        border: {
          dark: '#2A2A2A',
          light: '#E5E5E0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
        'card-dark':
          '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.35)',
        elevated:
          '0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)',
        'elevated-dark':
          '0 2px 8px rgba(0,0,0,0.4), 0 16px 48px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'sheet-in': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.23, 1, 0.32, 1)',
        'modal-in': 'modal-in 0.28s cubic-bezier(0.23, 1, 0.32, 1)',
        'sheet-in': 'sheet-in 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}
