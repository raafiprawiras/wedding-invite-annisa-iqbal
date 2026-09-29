/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,css}'],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#3A1A1E',
          deep: '#2B1114',
          light: '#5C2E31',
        },
        cream: '#F7F1E3',
        ink: '#2B1114',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        content: '30rem',
      },
    },
  },
  plugins: [],
};
