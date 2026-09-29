<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { loggedIn } = useUserSession()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const state = ref<'loading' | 'invalid' | 'finishing' | 'done' | 'failed'>('loading')
const invite = ref<{ email: string; role: string } | null>(null)
const errorMessage = ref('')
const googleLoading = ref(false)

// the invitee already set their password on firebase's own reset page
// before landing here, firebase sent them here through the continueUrl
// this app set when the invite was created. this page does not ask for
// a password again, it only finishes creating the row in this app's own
// users table so the person can log in normally afterward
async function run() {
  // someone who is already signed in has nothing left to do on this page
  if (loggedIn.value) {
    await navigateTo('/')
    return
  }

  if (!token.value) {
    state.value = 'invalid'
    return
  }

  try {
    invite.value = await $fetch<{ email: string; role: string }>('/api/invitations/validate', {
      query: { token: token.value }
    })
  } catch (error) {
    console.error('[accept-invite] validate failed:', error)
    state.value = 'invalid'
    return
  }

  state.value = 'finishing'
  try {
    await $fetch('/api/invitations/finalize', {
      method: 'POST',
      body: { token: token.value }
    })
    state.value = 'done'
  } catch (error) {
    console.error('[accept-invite] finalize failed:', error)
    // a 404 here almost always means this invite was already finished,
    // for example the person opened the same email link twice, in which
    // case the account already exists and this should not look like a
    // failure to them
    if ((error as any)?.statusCode === 404 || (error as any)?.response?.status === 404) {
      state.value = 'done'
      return
    }
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Could not finish setting up your account.'
    state.value = 'failed'
  }
}

await run()

// kept as an alternative for someone who would rather sign in with
// google than set a password at all, this does not depend on the
// password step above
async function acceptWithGoogle() {
  errorMessage.value = ''
  googleLoading.value = true
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account', login_hint: invite.value?.email ?? '' })
    const result = await signInWithPopup($firebaseAuth, provider)
    const idToken = await result.user.getIdToken()

    await $fetch('/api/invitations/accept-google', {
      method: 'POST',
      body: { token: token.value, idToken }
    })

    const { fetch: refreshSession } = useUserSession()
    await $fetch('/api/auth/session', { method: 'POST', body: { idToken } })
    await refreshSession()
    await navigateTo('/')
  } catch (error) {
    console.error('[accept-invite] google accept failed:', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Could not accept this invite with Google, please try again.'
  } finally {
    googleLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
    <div
      class="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 text-center
             dark:border-white/20 dark:bg-black"
    >
      <template v-if="state === 'loading' || state === 'finishing'">
        <p class="text-sm text-gray-500 dark:text-white/60">Setting up your account...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Invite not found
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          This invite link is invalid, expired, or has already been used. If you already set your password, just log in.
        </p>
        <NuxtLink to="/login" class="text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]">
          Back to login
        </NuxtLink>
      </template>

      <template v-else-if="state === 'done'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          You're all set
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          Your account has been created for {{ invite?.email }}. You can now log in with the
          password you just set.
        </p>
        <NuxtLink to="/login" class="text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]">
          Go to login
        </NuxtLink>
      </template>

      <template v-else-if="state === 'failed'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p class="mb-2 text-sm text-gray-600 dark:text-white/60">
          {{ errorMessage }}
        </p>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          If you already set a password, try logging in directly. Otherwise you can also
          continue with Google below.
        </p>

        <Button
          label="Continue with Google"
          class="w-full"
          :loading="googleLoading"
          @click="acceptWithGoogle"
        />

        <p class="mt-4">
          <NuxtLink to="/login" class="text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]">
            Back to login
          </NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>
