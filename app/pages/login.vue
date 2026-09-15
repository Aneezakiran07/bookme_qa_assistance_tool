<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { fetch: refreshSession } = useUserSession()
const errorMessage = ref('')
const loading = ref(false)

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

    await navigateTo(appUser.active ? '/' : '/pending-approval')
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
      <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
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