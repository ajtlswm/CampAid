/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest': {
          DEFAULT: '#1E3F20',
          600: '#2C5E3B',
        },
        'aid-red': {
          DEFAULT: '#FF4D4D',
          600: '#E63946',
        },
        'surface': '#F1F3F5',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
