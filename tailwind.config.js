/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta MG Revenda
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
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
