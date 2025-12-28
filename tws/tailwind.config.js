/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#fbbf24',
        cyan: '#06b6d4',
        // TWS 拍卖系统颜色
        'tws-red': '#D32F2F',
        'tws-dark-red': '#8B0000',
        'tws-gold': '#FFD700',
        'tws-green': '#00C851',
        'tws-black': '#0a0a0a',
        'tws-card': '#1a1a1a',
      },
      backgroundImage: {
        'blood-trail': 'linear-gradient(to bottom, #0a0a0a, #2a0a0a)',
      },
      animation: {
        'spin-slow': 'spin 6s linear infinite',
        marquee: 'marquee 20s linear infinite',
        'fade-in-down': 'fade-in-down 0.6s ease forwards',
        'fade-in-left': 'fade-in-left 0.6s ease forwards',
        shine: 'shine 1.2s ease-out forwards',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
        }
      },
    },
  },
  plugins: [],
};



