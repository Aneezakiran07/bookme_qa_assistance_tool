<script setup lang="ts">
// Release Cycles management page. This is the "manage releases" view:
// create/edit/delete release cycles and see release-health at a glance
// (scoped suite size, pass rate, open blockers). It deliberately overlaps
// with /executions' releases table (same underlying data, same
// AppDataTable/StatusBadge/AppProgressBar chrome) since the two pages
// serve different jobs — this one manages release records, /executions
// picks one to run tests against. Row actions link out to /executions/[id]
// for the actual run rather than duplicating that workspace.
definePageMeta({ layout: 'default' })

interface ReleaseRow {
  id: number
  version: string
  release_date: string | null
  created_at: string
  total_test_cases: number
  executed_count: number
  passed_count: number
  failed_count: number
  blocked_count: number
  pass_rate: number
  open_blockers: number
}

const toast = useToast()

const { data, refresh, pending: loadingReleases } = await useFetch<ReleaseRow[]>('/api/releases')
const releases = computed(() => data.value ?? [])

const metrics = computed(() => {
  const list = releases.value
  return {
    total: list.length,
    blockers: list.reduce((sum, r) => sum + r.open_blockers, 0)
  }
})

const columns = [
  { field: 'version', header: 'Version' },
  { field: 'release_date', header: 'Target Date', sortable: true },
  { field: 'scoped', header: 'Scoped Test Cases' },
  { field: 'pass_rate', header: 'Pass Rate' },
  { field: 'open_blockers', header: 'Open Blockers' }
]

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// -- create release modal --
const modalOpen = ref(false)
const saving = ref(false)

const form = reactive({
  version: '',
  releaseDate: ''
})

const versionError = computed(() => (form.version.trim() ? null : 'Version is required.'))
const canSave = computed(() => !versionError.value && !saving.value)

function openCreate() {
  form.version = ''
  form.releaseDate = ''
  modalOpen.value = true
}

async function saveRelease() {
  if (!canSave.value) return
  saving.value = true
  try {
    await $fetch('/api/releases', {
      method: 'POST',
      body: {
        version: form.version.trim(),
        releaseDate: form.releaseDate || null
      }
    })
    toast.add({ severity: 'success', summary: 'Release created', life: 3000 })
    modalOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not create this release',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

// -- delete --
const confirmRef = ref()
const deletingId = ref<number | null>(null)

async function handleDelete(row: ReleaseRow) {
  const confirmed = await confirmRef.value?.open({
    title: 'Delete release?',
    message: `This permanently deletes ${row.version}. Releases with execution history or linked bugs can't be deleted.`,
    confirmLabel: 'Delete',
    danger: true
  })
  if (!confirmed) return

  deletingId.value = row.id
  try {
    await $fetch(`/api/releases/${row.id}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Release deleted', life: 3000 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not delete this release',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Release Cycles
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-zinc-400">
          Define release milestones, assign version test suites, and track release health.
        </p>
      </div>

      <BaseButton
        label="+ Create Release"
        variant="primary"
        icon="pi pi-plus"
        @click="openCreate"
      />
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Total Releases" :value="metrics.total" icon="pi pi-flag" />
      <MetricCard label="Release Blockers" :value="metrics.blockers" icon="pi pi-exclamation-triangle" />
    </div>

    <AppDataTable
      :value="releases"
      :columns="columns"
      :loading="loadingReleases"
      search-placeholder="Search releases..."
      empty-message="No releases yet. Create one to get started."
      data-key="id"
    >
      <template #cell-version="{ data: row }">
        <NuxtLink
          :to="`/releases/${row.id}`"
          class="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5
                 text-xs font-semibold text-purple-700 hover:bg-purple-200
                 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/25"
        >
          {{ row.version }}
        </NuxtLink>
      </template>

      <template #cell-release_date="{ data: row }">
        <span class="text-sm text-gray-600 dark:text-zinc-300">
          {{ formatDate(row.release_date) }}
        </span>
      </template>

      <template #cell-scoped="{ data: row }">
        <div class="flex items-center gap-2 min-w-[10rem]">
          <AppProgressBar
            :value="row.executed_count"
            :max="row.total_test_cases"
            size="sm"
            class="flex-1"
          />
          <span class="whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400">
            {{ row.executed_count }}/{{ row.total_test_cases }}
          </span>
        </div>
      </template>

      <template #cell-pass_rate="{ data: row }">
        <span
          v-if="row.executed_count > 0"
          class="text-sm font-medium"
          :class="{
            'text-green-600 dark:text-green-400': row.pass_rate >= 80,
            'text-purple-600 dark:text-purple-400': row.pass_rate >= 50 && row.pass_rate < 80,
            'text-red-600 dark:text-red-400': row.pass_rate < 50
          }"
        >
          {{ row.pass_rate }}%
        </span>
        <span v-else class="text-xs text-gray-400 dark:text-zinc-500">—</span>
      </template>

      <template #cell-open_blockers="{ data: row }">
        <span
          class="text-sm font-medium"
          :class="row.open_blockers > 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-400 dark:text-zinc-500'"
        >
          {{ row.open_blockers }}
        </span>
      </template>

      <template #actions="{ data: row }">
        <div class="flex items-center gap-1.5">
          <BaseButton
            label="View Details"
            variant="secondary"
            size="sm"
            @click="navigateTo(`/releases/${row.id}`)"
          />
          <BaseButton
            label="Execute Run"
            variant="outline"
            size="sm"
            icon="pi pi-play"
            @click="navigateTo(`/executions/${row.id}`)"
          />
          <BaseButton
            variant="danger"
            size="sm"
            icon="pi pi-trash"
            :loading="deletingId === row.id"
            @click="handleDelete(row)"
          />
        </div>
      </template>
    </AppDataTable>

    <BaseModal v-model="modalOpen" title="Create New Release" width="30rem">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Version
          </label>
          <InputText
            v-model="form.version"
            placeholder="e.g. v2.4.0-rc1"
            class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
            :invalid="!!versionError"
          />
          <p v-if="versionError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ versionError }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-300">
            Release Date
          </label>
          <input
            v-model="form.releaseDate"
            type="date"
            class="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm
                   text-gray-900 outline-none transition-colors
                   focus:border-purple-500 focus:ring-1 focus:ring-purple-500
                   dark:border-white/10 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton variant="secondary" label="Cancel" @click="modalOpen = false" />
        <BaseButton
          variant="primary"
          label="Create Release"
          :loading="saving"
          :disabled="!canSave"
          @click="saveRelease"
        />
      </template>
    </BaseModal>

    <AppConfirmDialog ref="confirmRef" />
  </div>
</template>
