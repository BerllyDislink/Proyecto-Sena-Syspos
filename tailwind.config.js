/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          300: '#7dd4a8',
          400: '#4db882',
          500: '#1e9a62',
          600: '#16734D',
          700: '#125c3e',
          800: '#0d452f',
          900: '#082e1f',
          950: '#041a11',
        },
        secondary: {
          300: '#7dd49a',
          400: '#4db86e',
          500: '#1e9a4d',
          600: '#16733A',
          700: '#125c2f',
          800: '#0d4524',
          900: '#082e18',
          950: '#041a0e',
        },
      },
    },
  },
  plugins: [],
}
