/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark':       '#0a1710',
        'bg-main':       '#1a4228',
        'bg-learn':      '#122b1e',
        'card-bg':       '#f5eedc',
        'card-alt':      '#e8deca',
        'card-hover':    '#dfd4be',
        'card-border':   '#e5dcce',
        'neon-cyan':     '#00d4c4',
        'neon-hover':    '#00c4b4',
        'text-cream':    '#141f1b',
        'text-cream-sub':'#5c6c66',
        'gold':          '#f59e0b',
        'danger':        '#ef4444',
      },
    },
  },
  plugins: [],
}
