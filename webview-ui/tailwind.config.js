/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        'ka-blue': '#1a73e8',
        'ka-red': '#e53935',
        'ka-gold': '#ffd700',
        'ka-purple': '#7c3aed',
        'ka-green': '#22c55e',
        'ka-orange': '#f97316',
        'ka-dark': '#0f1923',
        'ka-panel': 'rgba(15, 25, 35, 0.85)',
      },
    },
  },
  plugins: [],
};
