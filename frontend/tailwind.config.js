/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        primary: 'var(--accent)',
        'primary-hover': 'var(--accent-hover)',
        'text-main': 'var(--text-primary)',
        'text-sub': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-custom': 'var(--border)',
        dark: 'var(--dark)',
        'dark-soft': 'var(--dark-soft)',
        'text-on-dark': 'var(--text-on-dark)',

        // Dark Surface System Hierarchy Variables
        'bg-level-0': 'var(--bg-level-0)',
        'bg-level-1': 'var(--bg-level-1)',
        'bg-level-2': 'var(--bg-level-2)',
        'bg-level-3': 'var(--bg-level-3)',
        'bg-level-hover': 'var(--bg-level-hover)',
        'surface-media': 'var(--surface-media)',
        'accent-coral': '#F05A47',
        'accent-hover': '#FF6B57',
        'accent-cool': '#B8AEA5',
        'text-heading': '#F4F0EA',
        'text-body': '#B8AEA5',
        'text-sub': '#81776F',
        'text-muted-meta': '#81776F',
        'border-subtle': '#39322F',
        'border-hover': 'rgba(244, 240, 234, 0.08)',
        'border-accent': 'rgba(240, 90, 71, 0.30)',
      },
      borderRadius: {
        'sm-custom': 'var(--radius-sm)',
        'md-custom': 'var(--radius-md)',
        'lg-custom': 'var(--radius-lg)',
        'xl-custom': 'var(--radius-xl)',
      }
    },
  },
  plugins: [],
}
