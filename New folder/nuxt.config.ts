import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// Modern, cool-toned purple (Linear/Vercel-adjacent, violet/indigo family)
// replacing Aura's default blue as the primary accent. Only the `primary`
// semantic ramp is overridden — every PrimeVue component that reads
// `--p-primary-*` (buttons, focus rings, links, active states) picks this
// up automatically, in both light and dark mode.
const PurplePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
      950: '#2e1065',
    },
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  future: { compatibilityVersion: 4 },

  app: {
    head: {
      title: 'Bookme QA Tool',
      titleTemplate: '%s',
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@primevue/nuxt-module',
    '@nuxtjs/color-mode',
  ],

  // flat component names regardless of subfolder, so components/ui/BaseButton.vue
  // is <BaseButton/> everywhere, not <UiBaseButton/>. every shared component in
  // this codebase (ui/, form/, layout/) is written assuming this flat naming
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  tailwindcss: {
  cssPath: '~/assets/css/main.css',
},

  colorMode: {
    classSuffix: '',        // emits `.dark` / `.light` on <html>, matching PrimeVue's selector
    preference: 'dark',     // default theme for first-time visitors
    fallback: 'dark',       // used during SSR if no preference is known yet
    storageKey: 'bookme-qa-theme',
  },

  primevue: {
    components: {
      prefix: '',
    },
    options: {
      theme: {
        preset: PurplePreset,
        options: {
          darkModeSelector: '.dark',   // keep — matches what color-mode emits
          cssLayer: {
            name: 'primevue',
            order: 'tailwind-base, primevue, tailwind-utilities',
          },
        },
      },
    },
  },

 css: [
  'primeicons/primeicons.css',
  '~/assets/css/main.css',
],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    cronSecret: process.env.CRON_SECRET,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    firebaseAdmin: {
      // these fall back to build time values but get overridden at runtime
      // by NUXT_FIREBASE_ADMIN_PROJECT_ID, NUXT_FIREBASE_ADMIN_CLIENT_EMAIL,
      // and NUXT_FIREBASE_ADMIN_PRIVATE_KEY if those are set on the server
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
    oneSignal: {
      appId: process.env.ONESIGNAL_APP_ID,
      apiKey: process.env.ONESIGNAL_REST_API_KEY,
    },
    session: {
      password: process.env.NUXT_SESSION_PASSWORD,
    },
    public: {
      appUrl: process.env.APP_URL,
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      },
    },
  },
})