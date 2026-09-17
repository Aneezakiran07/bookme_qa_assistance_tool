<script setup lang="ts">
// personal settings page: display name plus the two notification
// toggles planned for the email feature. this only reads/writes
// /api/profile, the OneSignal sending logic itself is wired up
// separately once that work is ready, these toggles just persist intent
// for now.
definePageMeta({ layout: 'default' })

interface ProfileData {
  id: number
  email: string
  role: string
  displayName: string | null
  emailNotifications: boolean
  dailyDigestEnabled: boolean
}

const toast = useToast()

const { data, pending: loadingProfile } = await useFetch<ProfileData>('/api/profile')

const displayName = ref('')
const emailNotifications = ref(true)
const dailyDigestEnabled = ref(true)

watchEffect(() => {
  if (!data.value) return
  displayName.value = data.value.displayName ?? ''
  emailNotifications.value = data.value.emailNotifications
  dailyDigestEnabled.value = data.value.dailyDigestEnabled
})

// daily digests only make sense if email notifications are on at all,
// so turning the master toggle off also turns the digest off, and the
// digest toggle is disabled while the master toggle is off
watch(emailNotifications, (enabled) => {
  if (!enabled) dailyDigestEnabled.value = false
})

const dirty = computed(() => {
  if (!data.value) return false
  return (
    displayName.value.trim() !== (data.value.displayName ?? '') ||
    emailNotifications.value !== data.value.emailNotifications ||
    dailyDigestEnabled.value !== data.value.dailyDigestEnabled
  )
})

const initials = computed(() => {
  const name = displayName.value.trim() || data.value?.email?.split('@')[0] || ''
  const parts = name.split(/[.\-_\s]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '??'
})

const saving = ref(false)

async function saveProfile() {
  saving.value = true
  try {
    const updated = await $fetch<ProfileData>('/api/profile', {
      method: 'PUT',
      body: {
        displayName: displayName.value.trim() || null,
        emailNotifications: emailNotifications.value,
        dailyDigestEnabled: dailyDigestEnabled.value
      }
    })
    data.value = updated
    toast.add({ severity: 'success', summary: 'Profile updated', life: 3000 })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Could not save profile',
      detail: error?.data?.statusMessage ?? 'Something went wrong',
      life: 4000
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="loadingProfile" class="text-sm text-gray-500 dark:text-zinc-400">
    Loading profile...
  </div>

  <div v-else class="mx-auto max-w-2xl space-y-6">
    <!-- account info -->
    <section
      class="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
    >
      <div class="mb-5 flex items-center gap-4">
        <div
          class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full
                 bg-purple-600 text-lg font-semibold text-white"
        >
          {{ initials }}
        </div>
        <div class="min-w-0">
          <h2 class="truncate text-base font-semibold text-gray-900 dark:text-white">
            {{ displayName.trim() || data?.email }}
          </h2>
          <span
            class="mt-1 inline-block rounded bg-purple-600/10 px-1.5 py-0.5 text-[11px]
                   font-medium text-purple-600 dark:text-purple-400"
          >
            {{ data?.role }}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Display name
          </label>
          <InputText
            v-model="displayName"
            placeholder="e.g. Ali Raza"
            class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
          />
          <p class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            Shown in the sidebar and on anything you're assigned or report.
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Email
          </label>
          <InputText
            :model-value="data?.email"
            disabled
            class="w-full !bg-transparent dark:!border-white/10 dark:!text-zinc-400"
          />
          <p class="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            Tied to your Google sign-in, can't be changed here.
          </p>
        </div>
      </div>
    </section>

    <!-- notification preferences -->
    <section
      class="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
    >
      <h2 class="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        Notification preferences
      </h2>
      <p class="mb-5 text-xs text-gray-400 dark:text-zinc-500">
        Controls what gets emailed to you. Sending isn't live yet, so nothing goes out until that's turned on.
      </p>

      <div class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              Email notifications
            </p>
            <p class="text-xs text-gray-400 dark:text-zinc-500">
              Get emailed when a bug is assigned to you.
            </p>
          </div>
          <ToggleSwitch v-model="emailNotifications" />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p
              class="text-sm font-medium text-gray-900 dark:text-white"
              :class="{ 'opacity-50': !emailNotifications }"
            >
              Daily digest
            </p>
            <p
              class="text-xs text-gray-400 dark:text-zinc-500"
              :class="{ 'opacity-50': !emailNotifications }"
            >
              A once-a-day summary of your open bugs and today's activity.
            </p>
          </div>
          <ToggleSwitch v-model="dailyDigestEnabled" :disabled="!emailNotifications" />
        </div>
      </div>
    </section>

    <div class="flex justify-end">
      <BaseButton
        label="Save changes"
        variant="primary"
        :loading="saving"
        :disabled="!dirty"
        @click="saveProfile"
      />
    </div>
  </div>
</template>
