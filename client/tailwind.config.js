/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1115',
        panel: '#161922',
        border: '#262b36',
        accent: '#7c9cff',
        accent2: '#57c785',
        muted: '#8a90a0',
      },
    },
  },
  plugins: [],
};
