<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const loading = ref(false)
const sent = ref(false)

// always show the same "check your inbox" message whether or not the
// email exists, so this form can't be used to probe which addresses have
// an account
async function submit() {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
  } catch (error) {
    console.error('[forgot-password]', error)
  } finally {
    loading.value = false
    sent.value = true
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-foreground p-8 text-center"
    >
      <h1 class="mb-2 text-xl font-semibold text-heading">
        Reset your password
      </h1>

      <template v-if="sent">
        <p class="text-sm text-body">
          If an account exists for {{ email }}, a password reset link is on its way. Check your inbox.
        </p>
        <NuxtLink
          to="/login"
          class="mt-4 inline-block text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]"
        >
          Back to login
        </NuxtLink>
      </template>

      <template v-else>
        <p class="mb-6 text-sm text-body">
          Enter your email and we'll send you a link to reset your password.
        </p>
        <form class="space-y-3 text-left" @submit.prevent="submit">
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
          <Button
            type="submit"
            label="Send reset link"
            class="w-full"
            :loading="loading"
          />
        </form>
        <NuxtLink
          to="/login"
          class="mt-4 inline-block text-sm text-[#245CB1] hover:underline dark:text-[#5B8FE0]"
        >
          Back to login
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
