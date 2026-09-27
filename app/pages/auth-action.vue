<script setup lang="ts">
import { verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()

// firebase appends these query params itself once the custom action url
// is set in the firebase console. continueUrl is whatever this app sent
// as continueUrl when it called sendOobCode, which still carries the
// invite token so this page knows which invitation to finish setting up
const oobCode = computed(() => (typeof route.query.oobCode === 'string' ? route.query.oobCode : ''))
const mode = computed(() => (typeof route.query.mode === 'string' ? route.query.mode : ''))

const inviteToken = computed(() => {
  const continueUrl = typeof route.query.continueUrl === 'string' ? route.query.continueUrl : ''
  if (!continueUrl) return ''
  try {
    const parsed = new URL(continueUrl)
    return parsed.searchParams.get('token') ?? ''
  } catch {
    return ''
  }
})

const isInvite = computed(() => {
  const continueUrl = typeof route.query.continueUrl === 'string' ? route.query.continueUrl : ''
  return continueUrl.includes('mode=invite')
})

const state = ref<'loading' | 'invalid' | 'ready' | 'done'>('loading')
const email = ref('')
const password = ref('')
const confirmPasswordValue = ref('')
const errorMessage = ref('')
const saving = ref(false)

// checks the oobCode is real and not expired before showing the form,
// and reads back which email it belongs to so the person can confirm
// they are setting a password for the right account
async function loadCode() {
  if (mode.value !== 'resetPassword' || !oobCode.value) {
    state.value = 'invalid'
    return
  }
  try {
    email.value = await verifyPasswordResetCode($firebaseAuth, oobCode.value)
    state.value = 'ready'
  } catch (error) {
    console.error('[auth-action] verifyPasswordResetCode failed:', error)
    state.value = 'invalid'
  }
}

await loadCode()

async function submit() {
  errorMessage.value = ''

  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPasswordValue.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  saving.value = true
  try {
    // this call sets the password directly on firebase's side, the same
    // way firebase's own hosted page would have
    await confirmPasswordReset($firebaseAuth, oobCode.value, password.value)

    if (isInvite.value && inviteToken.value) {
      // this is the step that used to be skipped, it creates the row in
      // this app's own users table now that the password is set
      await $fetch('/api/invitations/finalize', {
        method: 'POST',
        body: { token: inviteToken.value }
      })
    }

    const result = await signInWithEmailAndPassword($firebaseAuth, email.value, password.value)
    const idToken = await result.user.getIdToken()

    await $fetch('/api/auth/session', { method: 'POST', body: { idToken } })
    await refreshSession()
    state.value = 'done'
    await navigateTo('/')
  } catch (error) {
    console.error('[auth-action] submit failed:', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage
      ?? (error as any)?.message
      ?? 'Something went wrong, please try again.'
  } finally {
    saving.value = false
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
        <p class="text-sm text-gray-500 dark:text-white/60">Checking your link...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Link not found
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          This link is invalid, expired, or has already been used.
        </p>
        <NuxtLink to="/login" class="text-sm text-purple-600 hover:underline dark:text-purple-400">
          Back to login
        </NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-1 text-xl font-semibold text-gray-900 dark:text-white">
          {{ isInvite ? 'Join Bookme QA Tool' : 'Reset your password' }}
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          {{ email }}
        </p>

        <form class="space-y-3 text-left" @submit.prevent="submit">
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
              v-model="confirmPasswordValue"
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
            :loading="saving"
          />
        </form>

        <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </div>
</template>
