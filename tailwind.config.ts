import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',   // <- critical: match `dark:` variants to the `.dark` class on <html>

  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
    // PrimeVue components pass through Tailwind classes too:
    './node_modules/primevue/**/*.{vue,js,ts}',
  ],

  theme: {
    extend: {},
  },

  plugins: [],
}