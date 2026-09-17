<script setup lang="ts">
// Dedicated dual-panel execution workspace for a single release. Left panel
// is the test suite (every test case in the system, filtered/searchable);
// right panel shows the selected test case's steps + expected result and
// PASS / FAIL / BLOCKED buttons that append new execution rows.
//
// FAIL also auto-opens the Log Bug modal pre-filled with the test case's
// module, release, and steps, so testers don't have to re-enter context.
definePageMeta({ layout: 'default' })

interface TestCaseState {
  id: number
  title: string
  module_id: number
  module_name: string
  steps: string | null
  expected_result: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  type: string
  latest_result: string | null
  last_executed_at: string | null
  last_executed_by_email: string | null
  latest_actual_result: string | null
  executions_count: number
}

interface ReleaseInfo {
  id: number
  version: string
  release_date: string | null
}

const route = useRoute()
const toast = useToast()
const dropdownPt = useDropdownPt()

const releaseId = Number(route.params.id)

const { data, refresh, pending: loading } = await useFetch<{
  release: ReleaseInfo
  testCases: TestCaseState[]
}>(`/api/executions/${releaseId}`)

const release = computed(() => data.value?.release)
const testCases = computed(() => data.value?.testCases ?? [])

const { data: moduleOptionsData } = await useFetch<{ id: number; name: string }[]>('/api/modules')
const moduleOptions = computed(() => [
  { id: null, name: 'All Modules' },
  ...(moduleOptionsData.value ?? [])
])

// -- filters & selection --
const selectedModuleId = ref<number | null>(null)
const searchQuery = ref('')
const selectedTestCaseId = ref<number | null>(null)

const filteredTestCases = computed(() => {
  let list = testCases.value
  if (selectedModuleId.value) {
    list = list.filter((tc) => tc.module_id === selectedModuleId.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((tc) => tc.title.toLowerCase().includes(q))
  }
  return list
})

const selectedTestCase = computed(
  () => testCases.value.find((tc) => tc.id === selectedTestCaseId.value) ?? null
)

// auto-select the first visible test case on first load
watchEffect(() => {
  if (!selectedTestCaseId.value && filteredTestCases.value.length > 0) {
    selectedTestCaseId.value = filteredTestCases.value[0].id
  }
})

// -- execution form --
const form = reactive({
  actual_result: ''
})

watch(
  () => selectedTestCase.value?.id,
  () => {
    form.actual_result = ''
  }
)

// -- stats --
const stats = computed(() => {
  const total = testCases.value.length
  let passed = 0
  let failed = 0
  let blocked = 0
  let executed = 0
  for (const tc of testCases.value) {
    if (tc.latest_result) {
      executed++
      if (tc.latest_result === 'Pass') passed++
      else if (tc.latest_result === 'Fail') failed++
      else if (tc.latest_result === 'Blocked') blocked++
    }
  }
  return { total, executed, passed, failed, blocked }
})

// -- bug modal --
const logBugModalOpen = ref(false)

// -- submit execution --
const submitting = ref(false)

async function submitResult(result: 'Pass' | 'Fail' | 'Blocked') {
  if (!selectedTestCase.value || !release.value) return
  submitting.value = true
  try {
    await $fetch('/api/executions', {
      method: 'POST',
      body: {
        testCaseId: selectedTestCase.value.id,
        releaseId: release.value.id,
        result,
        actualResult: form.actual_result || null
      }
    })

    toast.add({
      severity: result === 'Pass' ? 'success' : result === 'Fail' ? 'error' : 'warn',
      summary: `Marked as ${result}`,
      life: 2500
    })

    // on FAIL, open the bug modal with pre-filled context before refreshing,
    // so the tester's notes are still fresh in their mind and can be added
    // to the bug's steps-to-reproduce if they want
    if (result === 'Fail') {
      logBugModalOpen.value = true
    }

    form.actual_result = ''
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save this result',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    submitting.value = false
  }
}

const PRIORITY_CLASSES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  Medium:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
}

// maps a raw execution result to a StatusBadge-friendly string
function statusKey(latest: string | null): string {
  if (!latest || latest === 'Not Run') return 'Not Started'
  if (latest === 'Pass') return 'Passed'
  if (latest === 'Fail') return 'Failed'
  if (latest === 'Blocked') return 'In Progress'
  return 'Not Started'
}
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] flex-col gap-4">
    <!-- header -->
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/executions"
          class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500
                 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-white/5"
          aria-label="Back to releases"
        >
          <i class="pi pi-arrow-left text-sm" />
        </NuxtLink>
        <div>
          <p class="text-xs text-gray-400 dark:text-zinc-500">Executing Release</p>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ release?.version ?? '—' }}
          </h1>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black">
          <p class="text-xs text-gray-500 dark:text-zinc-400">Executed</p>
          <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {{ stats.executed }}<span class="text-sm text-gray-400">/{{ stats.total }}</span>
          </p>
          <AppProgressBar
            :value="stats.executed"
            :max="stats.total"
            size="sm"
            class="mt-2"
          />
        </div>
        <div class="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black">
          <p class="text-xs text-gray-500 dark:text-zinc-400">Passed</p>
          <p class="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
            {{ stats.passed }}
          </p>
        </div>
        <div class="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black">
          <p class="text-xs text-gray-500 dark:text-zinc-400">Failed</p>
          <p class="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
            {{ stats.failed }}
          </p>
        </div>
        <div class="rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black">
          <p class="text-xs text-gray-500 dark:text-zinc-400">Blocked</p>
          <p class="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
            {{ stats.blocked }}
          </p>
        </div>
      </div>
    </div>

    <!-- dual-panel workspace -->
    <div class="flex flex-1 gap-4 overflow-hidden">
      <!-- left: test suite sidebar -->
      <aside
        class="flex w-80 shrink-0 flex-col rounded-lg border border-black/10 bg-white
               dark:border-white/10 dark:bg-black"
      >
        <div class="space-y-2 border-b border-black/10 p-3 dark:border-white/10">
          <IconField icon-position="left">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search test cases..."
              class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
            />
          </IconField>
          <Select
            v-model="selectedModuleId"
            :options="moduleOptions"
            option-label="name"
            option-value="id"
            placeholder="All Modules"
            class="w-full"
            :pt="dropdownPt"
          />
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="p-6 text-center text-sm text-gray-400">Loading...</div>
          <div
            v-else-if="filteredTestCases.length === 0"
            class="p-6 text-center text-sm text-gray-400 dark:text-zinc-500"
          >
            No test cases match.
          </div>
          <ul v-else class="divide-y divide-black/5 dark:divide-white/5">
            <li v-for="tc in filteredTestCases" :key="tc.id">
              <button
                type="button"
                class="w-full px-3 py-2.5 text-left transition-colors"
                :class="selectedTestCaseId === tc.id
                  ? 'bg-purple-50 dark:bg-purple-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'"
                @click="selectedTestCaseId = tc.id"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ tc.title }}
                  </p>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      v-if="tc.priority"
                      class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                      :class="PRIORITY_CLASSES[tc.priority]"
                    >
                      {{ tc.priority }}
                    </span>
                    <StatusBadge :status="statusKey(tc.latest_result)" size="sm" />
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </aside>

      <!-- right: active workspace -->
      <section
        class="flex flex-1 flex-col overflow-hidden rounded-lg border border-black/10 bg-white
               dark:border-white/10 dark:bg-black"
      >
        <div
          v-if="!selectedTestCase"
          class="flex flex-1 items-center justify-center text-sm text-gray-400 dark:text-zinc-500"
        >
          Select a test case to begin.
        </div>
        <div v-else class="flex flex-1 flex-col overflow-hidden">
          <div class="flex-1 space-y-5 overflow-y-auto p-6">
            <div>
              <div class="flex items-start justify-between gap-4">
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ selectedTestCase.title }}
                </h2>
                <StatusBadge :status="statusKey(selectedTestCase.latest_result)" size="sm" />
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                         dark:bg-white/10 dark:text-zinc-300"
                >
                  {{ selectedTestCase.module_name }}
                </span>
                <span
                  v-if="selectedTestCase.priority"
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="PRIORITY_CLASSES[selectedTestCase.priority]"
                >
                  {{ selectedTestCase.priority }}
                </span>
              </div>
            </div>

            <div>
              <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                Test Steps
              </p>
              <div
                class="whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                       text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
              >
                {{ selectedTestCase.steps || 'No steps recorded.' }}
              </div>
            </div>

            <div>
              <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
                Expected Result
              </p>
              <div
                class="whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                       text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
              >
                {{ selectedTestCase.expected_result || 'No expected result recorded.' }}
              </div>
            </div>

            <div
              v-if="selectedTestCase.last_executed_at"
              class="text-xs text-gray-400 dark:text-zinc-500"
            >
              Last executed {{ new Date(selectedTestCase.last_executed_at).toLocaleString() }}
              <span v-if="selectedTestCase.last_executed_by_email">
                by {{ selectedTestCase.last_executed_by_email }}
              </span>
              · {{ selectedTestCase.executions_count }} run{{ selectedTestCase.executions_count === 1 ? '' : 's' }} total
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-zinc-300">
                Actual Result (optional)
              </label>
              <textarea
                v-model="form.actual_result"
                rows="3"
                placeholder="Environment, observed behavior, or anything worth capturing with this run..."
                class="w-full resize-y rounded-md border border-black/10 bg-transparent p-3 text-sm
                       text-gray-900 outline-none placeholder:text-gray-400
                       focus:border-purple-500 focus:ring-1 focus:ring-purple-500
                       dark:border-white/10 dark:text-white dark:placeholder:text-white/40"
              />
            </div>
          </div>

          <div class="border-t border-black/10 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div class="grid grid-cols-3 gap-3">
              <button
                type="button"
                class="rounded-md border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold
                       text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50
                       dark:border-green-500 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                :disabled="submitting"
                @click="submitResult('Pass')"
              >
                <i class="pi pi-check-circle mr-2" />
                PASS
              </button>
              <button
                type="button"
                class="rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold
                       text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50
                       dark:border-red-500 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                :disabled="submitting"
                @click="submitResult('Fail')"
              >
                <i class="pi pi-times-circle mr-2" />
                FAIL
              </button>
              <button
                type="button"
                class="rounded-md border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-semibold
                       text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50
                       dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                :disabled="submitting"
                @click="submitResult('Blocked')"
              >
                <i class="pi pi-ban mr-2" />
                BLOCKED
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- log bug modal, auto-opened by the FAIL handler -->
    <LogBugModal
      v-if="selectedTestCase && release"
      v-model="logBugModalOpen"
      :initial-title="`Test failed: ${selectedTestCase.title}`"
      :initial-module-id="selectedTestCase.module_id"
      :initial-release-id="release.id"
      :initial-test-case-id="selectedTestCase.id"
      :initial-steps="selectedTestCase.steps"
    />
  </div>
</template>
