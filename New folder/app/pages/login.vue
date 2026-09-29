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

// firebase client errors come back as long technical strings, so the
// common ones become something a person can act on. errors from this
// app's own api already carry a readable statusMessage
function readableError(error: unknown, fallback: string): string {
  const apiMessage = (error as any)?.data?.statusMessage
  if (apiMessage) return apiMessage

  const code = (error as any)?.code as string | undefined
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  ) {
    return 'Incorrect email or password.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts, please wait a few minutes and try again.'
  }
  // closing the google popup is not an error worth showing
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return ''
  }
  return fallback
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
    errorMessage.value = readableError(error, 'Sign in failed, please try again.')
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
    errorMessage.value = readableError(error, 'Sign in failed, please check your email and password.')
  } finally {
    passwordLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-foreground p-8 text-center"
    >
      <h1 class="mb-2 text-xl font-semibold text-heading">
        Bookme QA Tool
      </h1>

      <p
        v-if="cameFromProtectedRoute"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700
               dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
      >
        Please log in to continue.
      </p>
      <p v-else class="mb-6 text-sm text-body">
        Sign in with the account you were invited with.
      </p>

      <Button
        label="Continue with Google"
        class="w-full"
        :loading="loading"
        :disabled="passwordLoading"
        @click="signIn"
      />

      <div class="my-5 flex items-center gap-3">
        <div class="h-px flex-1 bg-secondary" />
        <span class="text-xs uppercase tracking-wide text-gray-400 dark:text-white/40">or</span>
        <div class="h-px flex-1 bg-secondary" />
      </div>

      <form class="space-y-3 text-left" @submit.prevent="signInWithPassword">
        <div>
          <label class="mb-1 block text-xs font-medium text-body">
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
          <label class="mb-1 block text-xs font-medium text-body">
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
        severity="primary"
        :loading="passwordLoading"
        :disabled="loading"
      />
      </form>

      <NuxtLink
        to="/forgot-password"
        class="mt-4 inline-block text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]"
      >
        Forgot password?
      </NuxtLink>

      <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>