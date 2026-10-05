<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const errorMessage = ref('')

const email = ref('')
const password = ref('')
const loading = ref(false)

// the auth middleware sends people here with ?reason=auth&redirect=/wherever
// when they tried to open a page while signed out, instead of just
// silently dropping them on the login screen with no explanation
const cameFromProtectedRoute = computed(() => route.query.reason === 'auth')
const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/'
})

// errors from this app's own api already carry a readable statusMessage
function readableError(error: unknown, fallback: string): string {
  return (error as any)?.data?.statusMessage || fallback
}

async function signIn() {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/session', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })

    // the session cookie is set now, but useUserSession()'s reactive state
    // (used by the global auth middleware) doesn't know that yet, refresh
    // it before navigating or the middleware won't see us as logged in
    await refreshSession()

    await navigateTo(redirectTarget.value)
  } catch (error) {
    console.error('[login]', error)
    errorMessage.value = readableError(error, 'Sign in failed, please check your email and password.')
  } finally {
    loading.value = false
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
        Sign in with the email you were invited with.
      </p>

      <form class="space-y-3 text-left" @submit.prevent="signIn">
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
          :loading="loading"
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
