/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // Akışkan tip ölçeği: 360px → 1920px aralığında orantılı büyür,
        // konum/yerleşim kırılmadan çözünürlüğe göre ölçeklenir.
        'fluid-hero': 'clamp(2.5rem, 1.15rem + 2.9vw, 3.75rem)',
        'fluid-h1': 'clamp(2.25rem, 0.4rem + 2.9vw, 3rem)',
        'fluid-h2': 'clamp(1.5rem, 1rem + 2.6vw, 3rem)',
        'fluid-h3': 'clamp(1.25rem, 0.95rem + 1.6vw, 1.875rem)',
        'fluid-body': 'clamp(0.8125rem, 0.55rem + 0.5vw, 1rem)',
      },      colors: {
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
