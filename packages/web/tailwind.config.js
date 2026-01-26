/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary (Azul petróleo moderno)
        primary: {
          DEFAULT: '#1E3A5F',
          light: '#2B4F7A',
          dark: '#162B45',
        },
        // Accent (Verde oportunidad)
        accent: {
          DEFAULT: '#3BB273',
          soft: '#E6F6EE',
        },
        // Estados
        state: {
          new: '#3B82F6',
          contacted: '#F59E0B',
          captured: '#10B981',
          rejected: '#EF4444',
        },
        // Escala de grises personalizada
        surface: {
          light: '#F8FAFC',
          dark: '#0F172A',
        },
        card: {
          light: '#FFFFFF',
          dark: '#020617',
        },
        border: {
          light: '#E2E8F0',
          dark: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover':
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
    },
  },
  plugins: [],
};
