<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const toast = useToast()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const state = ref<'checking' | 'invalid' | 'ready'>('checking')
const email = ref('')
const password = ref('')
const confirmPasswordValue = ref('')
const errorMessage = ref('')
const saving = ref(false)

// the emailed link carries a token, the server confirms it is still valid
// before the form is shown
async function checkLink() {
  if (!token.value) {
    state.value = 'invalid'
    return
  }
  try {
    const result = await $fetch<{ email: string }>('/api/auth/reset-password', {
      query: { token: token.value }
    })
    email.value = result.email
    state.value = 'ready'
  } catch (error) {
    console.error('[reset-password] link check failed:', error)
    state.value = 'invalid'
  }
}

await checkLink()

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
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value }
    })
    toast.add({ severity: 'success', summary: 'Password updated, please sign in', life: 3000 })
    await navigateTo('/login')
  } catch (error) {
    console.error('[reset-password] reset failed:', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage ?? 'This reset link is invalid or has expired.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-foreground p-8 text-center"
    >
      <template v-if="state === 'checking'">
        <p class="text-sm text-body">Checking your link...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-heading">
          Link not found
        </h1>
        <p class="mb-6 text-sm text-body">
          This reset link is missing, invalid, expired, or has already been used.
        </p>
        <NuxtLink to="/forgot-password" class="text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]">
          Request a new link
        </NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-2 text-xl font-semibold text-heading">
          Choose a new password
        </h1>
        <p class="mb-6 text-sm text-body">
          for {{ email }}
        </p>
        <form class="space-y-3 text-left" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              New password
            </label>
            <Password
              v-model="password"
              placeholder="At least 8 characters"
              class="w-full"
              input-class="w-full"
              toggle-mask
              :feedback="false"
              autocomplete="new-password"
              required
            />
            <p
              v-if="passwordStrength(password)"
              class="mt-1 text-xs"
              :class="passwordStrength(password)?.strong ? 'text-green-600' : 'text-red-500'"
            >
              {{ passwordStrength(password)?.message }}
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
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
