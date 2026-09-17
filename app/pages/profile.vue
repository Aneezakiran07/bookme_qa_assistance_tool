<script setup lang="ts">
// personal profile page: display name plus a permanent, read only
// preview of the daily digest content for this user. notifications and
// digests are on for everyone by default now, so there is nothing left
// to toggle here, the page just shows who you are and what your next
// digest will contain.
definePageMeta({ layout: 'default' })

interface ProfileData {
  id: number
  email: string
  role: string
  displayName: string | null
}

interface DigestBugRow {
  id: number
  code: string
  title: string
  severity: string
  status: string
}

interface DeveloperDigest {
  scope: 'developer'
  openBugs: number
  criticalHighOpen: number
  pendingRetest: number
  resolvedToday: number
  bugs: DigestBugRow[]
}

interface LeadDigest {
  scope: 'lead'
  openBugs: number
  openCriticalHigh: number
  passRate: number
  passedExecutions: number
  totalExecutions: number
}

type DigestPreview = DeveloperDigest | LeadDigest

const toast = useToast()

const { data, pending: loadingProfile } = await useFetch<ProfileData>('/api/profile')
const { data: digest, pending: loadingDigest } = await useFetch<DigestPreview>('/api/profile/digest-preview')

const displayName = ref('')

watchEffect(() => {
  if (!data.value) return
  displayName.value = data.value.displayName ?? ''
})

const dirty = computed(() => {
  if (!data.value) return false
  return displayName.value.trim() !== (data.value.displayName ?? '')
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
        displayName: displayName.value.trim() || null
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

    <!-- daily digest preview -->
    <section
      class="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
    >
      <h2 class="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        Your daily digest
      </h2>
      <p class="mb-5 text-xs text-gray-400 dark:text-zinc-500">
        Emailed to you once a day. This is a live preview of what tonight's digest looks like right now.
      </p>

      <div v-if="loadingDigest" class="text-sm text-gray-500 dark:text-zinc-400">
        Loading digest preview...
      </div>

      <template v-else-if="digest?.scope === 'developer'">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Open bugs</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.openBugs }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Critical/High open</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.criticalHighOpen }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Pending verification</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.pendingRetest }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Resolved today</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.resolvedToday }}</p>
          </div>
        </div>

        <div v-if="digest.bugs.length" class="mt-5">
          <p class="mb-2 text-xs font-medium text-gray-600 dark:text-zinc-300">Your open bugs</p>
          <ul class="space-y-2">
            <li
              v-for="bug in digest.bugs"
              :key="bug.id"
              class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 dark:border-zinc-800"
            >
              <div class="min-w-0">
                <p class="truncate text-sm text-gray-900 dark:text-white">
                  <span class="font-mono text-xs text-gray-400 dark:text-zinc-500">{{ bug.code }}</span>
                  {{ bug.title }}
                </p>
              </div>
              <StatusBadge :status="bug.status" size="sm" />
            </li>
          </ul>
        </div>
        <p v-else class="mt-5 text-sm text-gray-400 dark:text-zinc-500">
          Nothing open right now, so tonight's digest would just be the summary above.
        </p>
      </template>

      <template v-else-if="digest?.scope === 'lead'">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Open bugs</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.openBugs }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Open Critical/High</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.openCriticalHigh }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Today's pass rate</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ digest.passRate }}%
              <span class="text-xs font-normal text-gray-400 dark:text-zinc-500">
                ({{ digest.passedExecutions }}/{{ digest.totalExecutions }})
              </span>
            </p>
          </div>
        </div>
      </template>
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