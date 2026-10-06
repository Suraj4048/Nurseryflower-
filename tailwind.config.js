/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './partner/index.html', './office/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 500: '#22a559', 600: '#16803d', 700: '#146c34', 800: '#14532d', 900: '#0f3d21' },
      },
      fontFamily: { sans: ['system-ui', '"Noto Sans"', '"Segoe UI"', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
