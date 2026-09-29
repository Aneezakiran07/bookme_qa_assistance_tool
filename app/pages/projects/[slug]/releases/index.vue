<script setup lang="ts">
// Release Cycles management page. This is the "manage releases" view:
// create/edit/delete release cycles and see release-health at a glance
// (scoped suite size, pass rate, open blockers). It deliberately overlaps
// with /executions' releases table (same underlying data, same
// AppDataTable/StatusBadge/AppProgressBar chrome) since the two pages
// serve different jobs — this one manages release records, /executions
// picks one to run tests against. Row actions link out to /executions/[id]
// for the actual run rather than duplicating that workspace.
definePageMeta({ layout: 'default', title: 'Releases' })

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
const { projectPath, projectKey, isReadOnly } = useCurrentProject()

const { data, refresh, pending: loadingReleases } = await useFetch<ReleaseRow[]>('/api/releases', {
  key: projectKey('releases')
})
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
        <h1 class="text-xl font-semibold text-heading">
          Release Cycles
        </h1>
        <p class="mt-1 text-sm text-body">
          Define release milestones, assign version test suites, and track release health.
        </p>
      </div>

      <BaseButton
        v-if="!isReadOnly"
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
          :to="projectPath(`/releases/${row.id}`)"
          class="inline-flex items-center rounded-full border border-[#245CB1]/30 bg-[#245CB1]/10 px-2.5 py-0.5
                 text-xs font-semibold text-heading hover:bg-[#245CB1]/20
                 dark:border-[#5B8FE0]/30 dark:bg-[#5B8FE0]/15 dark:hover:bg-[#5B8FE0]/25"
        >
          {{ row.version }}
        </NuxtLink>
      </template>

      <template #cell-release_date="{ data: row }">
        <span class="text-sm text-body">
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
          <span class="whitespace-nowrap text-xs text-body">
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
            'text-[#245CB1] dark:text-[#5B8FE0]': row.pass_rate >= 50 && row.pass_rate < 80,
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
            @click="navigateTo(projectPath(`/releases/${row.id}`))"
          />
          <BaseButton
            label="Execute Run"
            variant="outline"
            size="sm"
            icon="pi pi-play"
            @click="navigateTo(projectPath(`/executions/${row.id}`))"
          />
          <BaseButton
            v-if="!isReadOnly"
            variant="dangerOutline"
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
          <label class="mb-1 block text-xs font-medium text-body">
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
          <label class="mb-1 block text-xs font-medium text-body">
            Release Date
          </label>
          <input
            v-model="form.releaseDate"
            type="date"
            class="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm
                   text-heading outline-none transition-colors
                   focus:border-[#245CB1] dark:focus:border-[#5B8FE0] focus:ring-1 focus:ring-[#245CB1] dark:focus:ring-[#5B8FE0] dark:[color-scheme:dark]"
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
