<script setup lang="ts">
// personal profile page: display name plus a permanent, read only
// preview of the digest content for this user. notifications and
// digests are on for everyone by default now, so there is nothing left
// to toggle for enabling them. every role gets the same day/week
// filter here: developers see the bugs on their plate that had
// activity in the picked period with whatever status they're
// currently in, and qa leads/admins/testers see a project wide set of
// numbers for that same period.
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
  range: 'day' | 'week'
  weekStart: string
  weekEnd: string
  bugs: DigestBugRow[]
  bugsLimit: number
  bugsTotalCount: number
  bugsHasMore: boolean
  nextCursor: { lastStatusChangeAt: string; id: number } | null
}

interface LeadDigest {
  scope: 'lead'
  range: 'day' | 'week'
  openBugs: number
  openCriticalHigh: number
  weekStart?: string
  weekEnd?: string
  passRate: number
  passedExecutions: number
  totalExecutions: number
}

type DigestPreview = DeveloperDigest | LeadDigest

const PAGE_SIZE = 10

const toast = useToast()

const { data, pending: loadingProfile } = await useFetch<ProfileData>('/api/profile')

const activeRange = ref<'day' | 'week'>('day')
const digest = ref<DigestPreview | null>(null)
const loadingDigest = ref(true)
const loadingMoreBugs = ref(false)
const bugListEnd = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null
// the observer only fires once the user has actually scrolled at least
// once. without this, a short list's sentinel can already sit inside
// the viewport on first render, so the observer fires immediately,
// loads the next page, whose sentinel is also still in view, and so
// on -- silently loading everything at once instead of waiting for a
// real scroll.
const userHasScrolled = ref(false)
function markScrolled() {
  userHasScrolled.value = true
  window.removeEventListener('scroll', markScrolled)
}
onMounted(() => window.addEventListener('scroll', markScrolled, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', markScrolled))

async function loadDigest(range: 'day' | 'week') {
  loadingDigest.value = true
  try {
    digest.value = await $fetch<DigestPreview>('/api/profile/digest-preview', {
      query: { range, limit: PAGE_SIZE }
    })
  } finally {
    loadingDigest.value = false
  }
}

async function seeMoreBugs() {
  if (!digest.value || digest.value.scope !== 'developer' || !digest.value.bugsHasMore || loadingMoreBugs.value) return
  loadingMoreBugs.value = true
  try {
    const cursor = digest.value.nextCursor
    const page = await $fetch<Pick<DeveloperDigest, 'bugs' | 'bugsLimit' | 'bugsTotalCount' | 'bugsHasMore' | 'nextCursor'>>(
      '/api/profile/digest-preview',
      {
        query: {
          bugsOnly: true,
          limit: PAGE_SIZE,
          range: digest.value.range,
          cursorTs: cursor?.lastStatusChangeAt,
          cursorId: cursor?.id
        }
      }
    )
    digest.value = {
      ...digest.value,
      bugs: [...digest.value.bugs, ...page.bugs],
      bugsLimit: page.bugsLimit,
      bugsTotalCount: page.bugsTotalCount,
      bugsHasMore: page.bugsHasMore,
      nextCursor: page.nextCursor
    }
  } finally {
    loadingMoreBugs.value = false
  }
}

// watches the invisible marker below the bug list; once it scrolls into
// view, the next page loads automatically, so the list keeps growing as
// you scroll instead of waiting for a click
watch(bugListEnd, (el) => {
  scrollObserver?.disconnect()
  if (!el) return
  scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && userHasScrolled.value) seeMoreBugs()
  }, { rootMargin: '200px' })
  scrollObserver.observe(el)
})

onBeforeUnmount(() => scrollObserver?.disconnect())

// day/week is a full refetch from scratch (cursor reset) rather than a
// client side filter, since it's a genuinely different query for both
// scopes, not a hidden subset of the same one.
watch(activeRange, (range) => loadDigest(range))
await loadDigest('day')

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

    <div class="flex justify-end">
      <BaseButton
        label="Save changes"
        variant="primary"
        :loading="saving"
        :disabled="!dirty"
        @click="saveProfile"
      />
    </div>

    <!-- digest preview -->
    <section
      class="rounded-lg border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
    >
      <div class="mb-1 flex items-center justify-between gap-4">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          Your digest
        </h2>
        <div class="flex shrink-0 rounded-md border border-gray-200 p-0.5 dark:border-zinc-800">
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
            :class="activeRange === 'day'
              ? 'bg-purple-600 text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'"
            @click="activeRange = 'day'"
          >
            Today
          </button>
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
            :class="activeRange === 'week'
              ? 'bg-purple-600 text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'"
            @click="activeRange = 'week'"
          >
            This week
          </button>
        </div>
      </div>
      <p class="mb-5 text-xs text-gray-400 dark:text-zinc-500">
        <template v-if="digest?.scope === 'developer' && activeRange === 'day'">
          Bugs on your plate with any activity today, with their current status.
        </template>
        <template v-else-if="digest?.scope === 'developer'">
          Bugs on your plate with any activity this calendar week so far ({{ digest?.weekStart }} to {{ digest?.weekEnd }}), with their current status.
        </template>
        <template v-else-if="activeRange === 'day'">
          Emailed to you once a day. This is a live preview of what tonight's digest looks like right now.
        </template>
        <template v-else>
          A recap of what happened this calendar week so far ({{ digest?.weekStart }} to {{ digest?.weekEnd }}).
        </template>
      </p>

      <div v-if="loadingDigest" class="text-sm text-gray-500 dark:text-zinc-400">
        Loading digest preview...
      </div>

      <template v-else-if="digest?.scope === 'developer'">
        <div class="mt-1">
          <p class="mb-2 text-xs font-medium text-gray-600 dark:text-zinc-300">
            Your bugs ({{ digest.bugsTotalCount }})
          </p>
          <ul v-if="digest.bugs.length" class="space-y-2">
            <li
              v-for="bug in digest.bugs"
              :key="bug.id"
            >
              <NuxtLink
                :to="`/bugs/${bug.id}`"
                class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-800 dark:hover:border-purple-500/40 dark:hover:bg-zinc-900"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-gray-900 dark:text-white">
                    <span class="font-mono text-xs text-gray-400 dark:text-zinc-500">{{ bug.code }}</span>
                    {{ bug.title }}
                  </p>
                </div>
                <StatusBadge :status="bug.status" size="sm" />
              </NuxtLink>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400 dark:text-zinc-500">
            {{ activeRange === 'day' ? 'Nothing on your bugs moved today.' : 'Nothing on your bugs moved this week.' }}
          </p>

          <div v-if="digest.bugsHasMore" ref="bugListEnd" class="mt-3 flex justify-center py-2">
            <span v-if="loadingMoreBugs" class="text-xs text-gray-400 dark:text-zinc-500">
              Loading more...
            </span>
          </div>
          <p v-else-if="digest.bugs.length" class="mt-3 text-center text-xs text-gray-400 dark:text-zinc-500">
            Showing all {{ digest.bugsTotalCount }} bugs.
          </p>
        </div>
      </template>

      <template v-else-if="digest?.scope === 'lead'">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Open bugs (right now)</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.openBugs }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">Open Critical/High (right now)</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ digest.openCriticalHigh }}</p>
          </div>
          <div class="rounded-md border border-gray-200 p-3 dark:border-zinc-800">
            <p class="text-xs text-gray-400 dark:text-zinc-500">
              {{ activeRange === 'day' ? "Today's pass rate" : "This week's pass rate" }}
            </p>
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
  </div>
</template>