import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',   // <- critical: match `dark:` variants to the `.dark` class on <html>

  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/composables/**/*.{js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/utils/**/*.{js,ts}',
    './app/middleware/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
    // PrimeVue components pass through Tailwind classes too:
    './node_modules/primevue/**/*.{vue,js,ts}',
  ],

  theme: {
    extend: {
      // semantic surface, border and text tokens, the values live in assets/css/main.css
      // and switch on the dark class, so components never need dark variants for these
      colors: {
        background: 'var(--color-bg-background)',
        foreground: 'var(--color-bg-foreground)',
        secondary: 'var(--color-bg-secondary)',
        border: 'var(--color-border-default)',
        heading: 'var(--color-text-heading)',
        body: 'var(--color-text-body)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
      },
    },
  },

  plugins: [],
}