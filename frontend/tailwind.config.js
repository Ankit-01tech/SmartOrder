/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#4F46E5',
        secondary: '#06B6D4',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        bg: '#F0F4FF',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(79,70,229,0.10)',
        card: '0 8px 32px rgba(79,70,229,0.12)',
      },
    },
  },
  plugins: [],
};
