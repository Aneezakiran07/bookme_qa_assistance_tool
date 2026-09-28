<script setup lang="ts">
import { confirmPasswordReset } from 'firebase/auth'

definePageMeta({ layout: 'auth' })

const { $firebaseAuth } = useNuxtApp()
const route = useRoute()
const toast = useToast()

const oobCode = computed(() => (typeof route.query.oobCode === 'string' ? route.query.oobCode : ''))

const state = ref<'checking' | 'invalid' | 'ready'>('checking')
const password = ref('')
const confirmPasswordValue = ref('')
const errorMessage = ref('')
const saving = ref(false)

// Firebase forwards our own continueUrl (built in the invitations invite
// route) back to this page as a query param when it hands control to the
// app, an invite link carries mode=invite and our own token in there, this
// is not a genuine password reset so it belongs on the accept-invite page
// instead
function redirectIfInviteLink(): boolean {
  const continueUrlRaw = route.query.continueUrl
  const continueUrl = typeof continueUrlRaw === 'string' ? continueUrlRaw : ''
  if (!continueUrl) return false

  try {
    const parsed = new URL(continueUrl)
    if (parsed.searchParams.get('mode') === 'invite') {
      const inviteToken = parsed.searchParams.get('token') ?? ''
      navigateTo({ path: '/accept-invite', query: { token: inviteToken, mode: 'invite' } })
      return true
    }
  } catch (error) {
    console.error('[reset-password] could not parse continueUrl:', error)
  }
  return false
}

onMounted(() => {
  if (redirectIfInviteLink()) return
  state.value = oobCode.value ? 'ready' : 'invalid'
})

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
    await confirmPasswordReset($firebaseAuth, oobCode.value, password.value)
    toast.add({ severity: 'success', summary: 'Password updated, please sign in', life: 3000 })
    await navigateTo('/login')
  } catch (error) {
    console.error('[reset-password] confirmPasswordReset failed:', error)
    errorMessage.value =
      (error as any)?.message ?? 'This reset link is invalid or has expired.'
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
      <template v-if="state === 'checking'">
        <p class="text-sm text-gray-500 dark:text-white/60">Checking your link...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Link not found
        </h1>
        <p class="mb-6 text-sm text-gray-600 dark:text-white/60">
          This reset link is missing or invalid.
        </p>
        <NuxtLink to="/forgot-password" class="text-sm text-purple-600 hover:underline dark:text-purple-400">
          Request a new link
        </NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Choose a new password
        </h1>
        <form class="space-y-3 text-left" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-white/60">
              New password
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
              Confirm new password
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
          <Button type="submit" label="Update password" class="w-full" :loading="saving" />
        </form>

        <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </div>
</template>
