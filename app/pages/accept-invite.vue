<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { loggedIn, fetch: refreshSession } = useUserSession()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const state = ref<'loading' | 'invalid' | 'ready' | 'saving'>('loading')
const invite = ref<{ email: string; role: string } | null>(null)
const password = ref('')
const confirmPasswordValue = ref('')
const errorMessage = ref('')

// the invitee lands here from the emailed link. the token is checked first,
// then they choose a password, which creates the account and signs them in
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
    state.value = 'ready'
  } catch (error) {
    console.error('[accept-invite] validate failed:', error)
    state.value = 'invalid'
  }
}

await run()

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

  state.value = 'saving'
  try {
    await $fetch('/api/invitations/accept', {
      method: 'POST',
      body: { token: token.value, password: password.value }
    })
    // the server signed the person in, so pull the fresh session before moving on
    await refreshSession()
    await navigateTo('/')
  } catch (error) {
    console.error('[accept-invite] accept failed:', error)
    errorMessage.value =
      (error as any)?.data?.statusMessage ?? 'Could not finish setting up your account.'
    state.value = 'ready'
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-foreground p-8 text-center"
    >
      <template v-if="state === 'loading'">
        <p class="text-sm text-body">Checking your invite...</p>
      </template>

      <template v-else-if="state === 'invalid'">
        <h1 class="mb-2 text-xl font-semibold text-heading">
          Invite not found
        </h1>
        <p class="mb-6 text-sm text-body">
          This invite link is invalid, expired, or has already been used. If you already set your password, just log in.
        </p>
        <NuxtLink to="/login" class="text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]">
          Back to login
        </NuxtLink>
      </template>

      <template v-else>
        <h1 class="mb-2 text-xl font-semibold text-heading">
          Set your password
        </h1>
        <p class="mb-6 text-sm text-body">
          Choose a password to finish joining the team.
        </p>

        <form class="space-y-3 text-left" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Email
            </label>
            <InputText
              :model-value="invite?.email"
              type="email"
              class="w-full"
              readonly
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-body">
              Password
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
            label="Create account"
            class="w-full"
            :loading="state === 'saving'"
          />
        </form>

        <p v-if="errorMessage" class="mt-3 text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </template>
    </div>
  </div>
</template>
