<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const errorMessage = ref('')
const loading = ref(false)

// the auth middleware sends people here with ?reason=auth&redirect=/wherever
// when they tried to open a page while signed out, instead of just
// silently dropping them on the login screen with no explanation
const cameFromProtectedRoute = computed(() => route.query.reason === 'auth')
const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/'
})

async function signIn() {
  errorMessage.value = ''
  loading.value = true
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const result = await signInWithPopup($firebaseAuth, provider)
    const idToken = await result.user.getIdToken()

    const appUser = await $fetch<{ active: boolean }>('/api/auth/session', {
      method: 'POST',
      body: { idToken },
    })

    // the session cookie is set now, but useUserSession()'s reactive state
    // (used by the global auth middleware) doesn't know that yet, refresh
    // it before navigating or the middleware won't see us as logged in
    await refreshSession()

    await navigateTo(appUser.active ? redirectTarget.value : '/pending-approval')
  } catch (error) {
    console.error('[login]', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Sign in failed, please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div
      class="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 text-center
             dark:border-white/20 dark:bg-black"
    >
      <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Bookme QA Tool
      </h1>

      <p
        v-if="cameFromProtectedRoute"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700
               dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
      >
        Please log in to continue.
      </p>
      <p v-else class="mb-6 text-sm text-gray-600 dark:text-white/60">
        Sign in with any Google account to continue.
      </p>

      <Button
        label="Continue with Google"
        class="w-full"
        :loading="loading"
        @click="signIn"
      />

      <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>