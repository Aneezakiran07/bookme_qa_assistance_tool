import ToastService from 'primevue/toastservice'

// @primevue/nuxt-module auto-registers the core PrimeVue plugin and
// auto-imports components (Toast, Select, etc.) and composables
// (useToast), but it does NOT auto-register the separate service
// plugins (ToastService, ConfirmationService, DialogService). Without
// this, useToast().add(...) calls into a service that was never
// installed on the Vue app, so the <Toast/> mounted in app.vue never
// receives anything and nothing ever appears on screen -- it fails
// completely silently, no console error either.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ToastService)
})
