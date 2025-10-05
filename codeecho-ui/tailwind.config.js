/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      animation: {
        'progress-indeterminate': 'progress-indeterminate 1.5s infinite ease-in-out',
        'success-ring': 'success-ring 0.8s ease-in-out forwards',
        'success-checkmark': 'success-checkmark 0.5s ease-in-out forwards 0.3s',
        'success-fade-in': 'success-fade-in 0.5s ease-in-out forwards',
        'success-slide-up': 'success-slide-up 0.5s ease-in-out forwards',
        'success-particle': 'success-particle 0.8s ease-out forwards',
      },
      keyframes: {
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'success-ring': {
          '0%': {
            transform: 'scale(0)',
            opacity: 1,
            borderWidth: '4px',
            borderColor: 'rgb(34 197 94)', // green-500
          },
          '100%': {
            transform: 'scale(2)',
            opacity: 0,
            borderWidth: '1px',
            borderColor: 'rgb(34 197 94)', // green-500
          },
        },
        'success-checkmark': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'success-fade-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'success-slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'success-particle': {
          '0%': { transform: 'rotate(var(--particle-angle)) translateY(-16px) scale(0)', opacity: 1 },
          '100%': { transform: 'rotate(var(--particle-angle)) translateY(-64px) scale(1)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}