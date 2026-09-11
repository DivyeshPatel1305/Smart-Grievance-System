/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary government navy blue (CPGRAMS-inspired)
        primary: {
          50:  '#e8edf5',
          100: '#c5d0e8',
          200: '#9fb0d8',
          300: '#7890c8',
          400: '#5a77bc',
          500: '#3c5db0',
          600: '#1a3a6b',   // main gov blue
          700: '#15305a',
          800: '#0f2449',
          900: '#081938',
        },
        // Saffron accent (Indian tricolor)
        saffron: {
          50:  '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#FF671F',   // India saffron
          600: '#ea580c',
        },
        // India green
        igreen: {
          500: '#138808',   // India flag green
          600: '#0f6b06',
          700: '#0b5204',
        },
        // Neutral grays for content
        neutral: {
          50:  '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'Inter', 'system-ui', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      boxShadow: {
        'gov':    '0 2px 8px rgba(26,58,107,0.12)',
        'gov-md': '0 4px 16px rgba(26,58,107,0.16)',
        'gov-lg': '0 8px 32px rgba(26,58,107,0.20)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-in-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                              '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
