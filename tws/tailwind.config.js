/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#fbbf24',
        cyan: '#06b6d4',
      },
      animation: {
        'spin-slow': 'spin 6s linear infinite',
        marquee: 'marquee 20s linear infinite',
        'fade-in-down': 'fade-in-down 0.6s ease forwards',
        'fade-in-left': 'fade-in-left 0.6s ease forwards',
        shine: 'shine 1.2s ease-out forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in-down': {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in-left': {
          '0%': { opacity: 0, transform: 'translateX(10px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%) skewX(-12deg)', opacity: 0 },
          '50%': { opacity: 0.6 },
          '100%': { transform: 'translateX(200%) skewX(-12deg)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};



