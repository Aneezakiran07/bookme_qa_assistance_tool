<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const state = ref<'loading' | 'invalid' | 'ready'>('loading')
const invite = ref<{ email: string; role: string } | null>(null)

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const savingPassword = ref(false)
const googleLoading = ref(false)

// the invite carries no session of its own, this page validates the token
// on load so a stale, revoked, or already-used link shows an error instead
// of a half-working form
async function loadInvite() {
  if (!token.value) {
    state.value = 'invalid'
    return
  }
  try {
    invite.value = await $fetch<{ email: string; role: string }>('/api/invitations/validate', {
      query: { token: token.value },
    })
    state.value = 'ready'
  } catch (error) {
    console.error('[accept-invite] validate failed:', error)
    state.value = 'invalid'
  }
}

await loadInvite()

async function acceptWithPassword() {
  errorMessage.value = ''

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  savingPassword.value = true
  try {
    await $fetch('/api/invitations/accept', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })

    // the users row now exists with a password set on the Firebase side,
    // sign in for real so we get an idToken to establish the app session
    const result = await signInWithEmailAndPassword($firebaseAuth, invite.value!.email, password.value)
    const idToken = await result.user.getIdToken()

    await $fetch('/api/auth/session', { method: 'POST', body: { idToken } })
    await refreshSession()
    await navigateTo('/')
  } catch (error) {
    console.error('[accept-invite] accept failed:', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Could not accept this invite, please try again.'
  } finally {
    savingPassword.value = false
  }
}

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
      body: { token: token.value, idToken },
    })

    // the users row now exists, the same idToken is still good to
    // establish the app session
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
      <template v-if="state === 'loading'">
        <p class="text-sm text-gray-500 dark:text-white/60">Checking your invite...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Invite not found
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          This invite link is invalid, expired, or has already been used.
        </p>
        <NuxtLink to="/login" class="text-sm text-purple-600 hover:underline dark:text-purple-400">
          Back to login
        </NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-1 text-xl font-semibold text-gray-900 dark:text-white">
          Join Bookme QA Tool
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          {{ invite?.email }} was invited as {{ invite?.role }}.
        </p>

        <Button
          label="Continue with Google"
          class="w-full"
          :loading="googleLoading"
          :disabled="savingPassword"
          @click="acceptWithGoogle"
        />

        <div class="my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          <span class="text-xs uppercase tracking-wide text-gray-400 dark:text-white/40">or set a password</span>
          <div class="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        </div>

        <form class="space-y-3 text-left" @submit.prevent="acceptWithPassword">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-white/60">
              Password
            </label>
            <Password
              v-model="password"
              placeholder="At least 8 characters"
              class="w-full"
              input-class="w-full"
              toggle-mask
              autocomplete="new-password"
              required
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-white/60">
              Confirm password
            </label>
            <Password
              v-model="confirmPassword"
              placeholder="Repeat your password"
              class="w-full"
              input-class="w-full"
              :feedback="false"
              toggle-mask
              autocomplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            label="Set password and continue"
            class="w-full"
            severity="secondary"
            :loading="savingPassword"
            :disabled="googleLoading"
          />
        </form>

        <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </div>
</template>
