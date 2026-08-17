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
