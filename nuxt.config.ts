import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// brand blue preset with an eleven stop primary ramp kept in one hue family
// the color scheme block below uses the darker anchor stop in light mode and the brighter anchor stop in dark mode so blue stays readable on black
const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff5fc',
      100: '#d9e6f7',
      200: '#b8cfee',
      300: '#8fb0e3',
      400: '#5B8FE0',
      500: '#3a72cd',
      600: '#245CB1',
      700: '#1d4a8f',
      800: '#173a70',
      900: '#122c54',
      950: '#0a1a34',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
      },
      dark: {
        primary: {
          color: '{primary.400}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)',
        },
      },
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
        preset: BrandPreset,
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