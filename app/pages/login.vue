<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const errorMessage = ref('')
const loading = ref(false)

const email = ref('')
const password = ref('')
const passwordLoading = ref(false)

// the auth middleware sends people here with ?reason=auth&redirect=/wherever
// when they tried to open a page while signed out, instead of just
// silently dropping them on the login screen with no explanation
const cameFromProtectedRoute = computed(() => route.query.reason === 'auth')
const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/'
})

// invite-only onboarding means every account that can reach /api/auth/session
// successfully is already active, there is no more pending state to branch
// on, so a successful call always sends the person straight to where they
// were headed
async function finishSignIn(idToken: string) {
  await $fetch('/api/auth/session', {
    method: 'POST',
    body: { idToken },
  })

  // the session cookie is set now, but useUserSession()'s reactive state
  // (used by the global auth middleware) doesn't know that yet, refresh
  // it before navigating or the middleware won't see us as logged in
  await refreshSession()

  await navigateTo(redirectTarget.value)
}

async function signIn() {
  errorMessage.value = ''
  loading.value = true
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const result = await signInWithPopup($firebaseAuth, provider)
    const idToken = await result.user.getIdToken()
    await finishSignIn(idToken)
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

async function signInWithPassword() {
  errorMessage.value = ''
  passwordLoading.value = true
  try {
    const result = await signInWithEmailAndPassword($firebaseAuth, email.value, password.value)
    const idToken = await result.user.getIdToken()
    await finishSignIn(idToken)
  } catch (error) {
    console.error('[login]', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Sign in failed, please check your email and password.'
  } finally {
    passwordLoading.value = false
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
        :disabled="passwordLoading"
        @click="signIn"
      />

      <div class="my-5 flex items-center gap-3">
        <div class="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        <span class="text-xs uppercase tracking-wide text-gray-400 dark:text-white/40">or</span>
        <div class="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <form class="space-y-3 text-left" @submit.prevent="signInWithPassword">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-white/60">
            Email
          </label>
          <InputText
            v-model="email"
            type="email"
            placeholder="you@bookme.pk"
            class="w-full"
            autocomplete="email"
            required
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-white/60">
            Password
          </label>
          <Password
            v-model="password"
            placeholder="Your password"
            class="w-full"
            input-class="w-full"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
            required
          />
        </div>

        <Button
          type="submit"
          label="Sign in"
          class="w-full"
          severity="secondary"
          :loading="passwordLoading"
          :disabled="loading"
        />
      </form>

      <NuxtLink
        to="/forgot-password"
        class="mt-4 inline-block text-sm text-purple-600 hover:underline dark:text-purple-400"
      >
        Forgot password?
      </NuxtLink>

      <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>