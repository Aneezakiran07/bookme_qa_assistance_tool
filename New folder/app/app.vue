<template>
  <!-- built-in Nuxt component: shows a slim progress bar at the very top
       of the viewport automatically on every route change and while any
       page-level async data (useFetch/useAsyncData) is pending, no manual
       wiring to individual pages needed. color matches the app's purple
       theme instead of Nuxt's default green -->
  <NuxtLoadingIndicator color="#8b5cf6" :height="3" />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- mounted once, app-wide: call useToast() from anywhere to show a toast -->
  <AppToast />
</template>
