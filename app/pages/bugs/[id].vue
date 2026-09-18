<script setup lang="ts">
// Bug detail workspace: left column shows bug context, steps, attachments,
// and the merged audit history; right column drives owner reassignment.
// Status is changed directly from a dropdown in the header, no fixed
// lifecycle to satisfy. Every mutation here goes through PUT /api/bugs/[id],
// which is also what audits status_history and assignment_log rows.
definePageMeta({ layout: 'default' })

interface BugDetail {
  id: number
  title: string
  module_id: number
  module_name: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  priority: 'High' | 'Medium' | 'Low' | null
  status: string
  owner_id: number | null
  owner_email: string | null
  environment_build: string | null
  linked_test_case_id: number | null
  linked_test_case_title: string | null
  linked_test_case_steps: string | null
  linked_test_case_expected_result: string | null
  release_id: number | null
  release_version: string | null
  reported_by: number | null
  reported_by_email: string | null
  reported_at: string
  last_status_change_at: string
  steps_to_reproduce: string | null
  actual_result: string | null
  dev_notes: string | null
}

const QA_ROLES = ['QA Lead', 'Tester']

interface AttachmentRow {
  id: number
  file_url: string
  public_id: string
  file_type: 'image' | 'video'
  uploaded_by: number
  uploaded_by_role: string | null
  uploaded_at: string
}

interface AssignmentLogRow {
  id: number
  assigned_to: number
  assigned_to_email: string | null
  assigned_by: number | null
  assigned_by_email: string | null
  assigned_at: string
  severity_at_assignment: string | null
}

interface StatusHistoryRow {
  id: number
  old_status: string | null
  new_status: string
  changed_by: number | null
  changed_by_email: string | null
  changed_at: string
}

const route = useRoute()
const toast = useToast()
const dropdownPt = useDropdownPt()
const bugId = Number(route.params.id)
const { user } = useUserSession()
const isDeveloper = computed(() => user.value?.role === 'Developer')
const isQa = computed(() => QA_ROLES.includes(user.value?.role ?? '') || user.value?.role === 'Admin')

const { data, refresh, pending: loading } = await useFetch<{
  bug: BugDetail
  attachments: AttachmentRow[]
  assignmentLog: AssignmentLogRow[]
  statusHistory: StatusHistoryRow[]
}>(`/api/bugs/${bugId}`)

const bug = computed(() => data.value?.bug ?? null)
const attachments = computed(() => data.value?.attachments ?? [])
const attachmentsForUploader = computed(() =>
  attachments.value.map((a) => ({
    id: a.id,
    url: a.file_url,
    public_id: a.public_id,
    file_type: a.file_type,
    uploaded_by_role: a.uploaded_by_role
  }))
)
const assignmentLog = computed(() => data.value?.assignmentLog ?? [])
const statusHistory = computed(() => data.value?.statusHistory ?? [])

const SEVERITY_CLASSES: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  High: 'bg-[#f3e6d8] text-[#7a5233] border-[#e2c9ab] dark:bg-[#a9784f]/15 dark:text-[#cfa77d] dark:border-[#a9784f]/30',
  Medium: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
  Low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
}

const PRIORITY_CLASSES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  Medium: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
  Low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
}

function bugCode(id: number) {
  return `BUG-${id.toString().padStart(3, '0')}`
}

function tcCode(id: number) {
  return `TC-${id.toString().padStart(3, '0')}`
}

// -- steps to reproduce, read/edit toggle. QA-owned: developers don't
// need this section at all, so it's hidden entirely for them rather
// than just shown read-only -- see the template's v-if="!isDeveloper"
// on the whole card, not just the Edit button --
const editingSteps = ref(false)
const stepsDraft = ref('')
const savingSteps = ref(false)

function startEditSteps() {
  stepsDraft.value = bug.value?.steps_to_reproduce ?? ''
  editingSteps.value = true
}

async function saveSteps() {
  savingSteps.value = true
  try {
    await $fetch(`/api/bugs/${bugId}`, {
      method: 'PUT',
      body: { stepsToReproduce: stepsDraft.value || null }
    })
    editingSteps.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save steps to reproduce',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    savingSteps.value = false
  }
}

// -- actual result, read/edit toggle. QA-owned, same pattern as steps
// to reproduce: what actually happened when the bug occurred, as
// opposed to the linked test case's expected result. visible to
// developers as read-only context (they need it to fix the bug) but
// only QA can edit it --
const editingActualResult = ref(false)
const actualResultDraft = ref('')
const savingActualResult = ref(false)

function startEditActualResult() {
  actualResultDraft.value = bug.value?.actual_result ?? ''
  editingActualResult.value = true
}

async function saveActualResult() {
  savingActualResult.value = true
  try {
    await $fetch(`/api/bugs/${bugId}`, {
      method: 'PUT',
      body: { actualResult: actualResultDraft.value || null }
    })
    editingActualResult.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save actual result',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    savingActualResult.value = false
  }
}

// -- attachments --
function onAttachmentsChanged() {
  // MediaUploader already talks to the API directly; just resync counts/timeline
  refresh()
}

// -- developer notes & blockers, read/edit toggle --
// editable by any role today, matching this app's existing "no canManage
// gate on bugs" convention. kept entirely separate from steps to
// reproduce -- this is for implementation notes, environment quirks, or
// explaining a status decision, not a second place reproduction steps
// get written
const editingDevNotes = ref(false)
const devNotesDraft = ref('')
const savingDevNotes = ref(false)

function startEditDevNotes() {
  devNotesDraft.value = bug.value?.dev_notes ?? ''
  editingDevNotes.value = true
}

async function saveDevNotes() {
  savingDevNotes.value = true
  try {
    await $fetch(`/api/bugs/${bugId}`, {
      method: 'PUT',
      body: { devNotes: devNotesDraft.value || null }
    })
    editingDevNotes.value = false
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not save developer notes',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    savingDevNotes.value = false
  }
}

// -- status --
const changingStatus = ref(false)

async function moveToStatus(status: string) {
  if (!bug.value || status === bug.value.status) return
  changingStatus.value = true
  try {
    await $fetch(`/api/bugs/${bugId}`, { method: 'PUT', body: { status } })
    toast.add({ severity: 'success', summary: `Marked as ${status}`, life: 2500 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not update status',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    changingStatus.value = false
  }
}

// -- owner reassignment --
const reassigning = ref(false)

async function reassignOwner(ownerId: number | null) {
  reassigning.value = true
  try {
    await $fetch(`/api/bugs/${bugId}`, { method: 'PUT', body: { ownerId } })
    toast.add({ severity: 'success', summary: 'Owner updated', life: 2500 })
    await refresh()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not reassign this bug',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  } finally {
    reassigning.value = false
  }
}

// -- archive (soft delete) --
const confirmDialogRef = ref<{ open: (opts: any) => Promise<boolean> }>()

async function archiveBug() {
  if (!bug.value) return
  const confirmed = await confirmDialogRef.value?.open({
    title: 'Archive this bug?',
    message: `${bugCode(bug.value.id)} will be moved out of the active Bug Tracker list. Its attachments, assignment log, and status history all stay intact.`,
    confirmLabel: 'Archive',
    danger: true
  })
  if (!confirmed) return

  try {
    await $fetch(`/api/bugs/${bugId}`, { method: 'DELETE' })
    toast.add({ severity: 'success', summary: 'Bug archived', life: 3000 })
    await navigateTo('/bugs')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not archive this bug',
      detail: (error as any)?.data?.statusMessage ?? 'Please try again.',
      life: 5000
    })
  }
}

// -- merged audit timeline: status changes + assignment events, oldest first --
const timelineEntries = computed(() => {
  const statusEntries = statusHistory.value.map((h) => ({
    id: `status-${h.id}`,
    icon: 'pi pi-sync',
    iconClass: 'text-purple-600 dark:text-purple-400',
    title: h.old_status ? `${h.old_status} \u2192 ${h.new_status}` : `Reported as ${h.new_status}`,
    detail: h.changed_by_email ? `by ${h.changed_by_email}` : undefined,
    timestamp: h.changed_at
  }))
  const assignmentEntries = assignmentLog.value.map((a) => ({
    id: `assign-${a.id}`,
    icon: 'pi pi-user',
    iconClass: 'text-sky-600 dark:text-sky-400',
    title: `Assigned to ${a.assigned_to_email ?? 'a user'}`,
    detail: a.assigned_by_email ? `by ${a.assigned_by_email}` : undefined,
    timestamp: a.assigned_at
  }))
  return [...statusEntries, ...assignmentEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/bugs"
        class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500
               hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-white/5"
        aria-label="Back to bugs"
      >
        <i class="pi pi-arrow-left text-sm" />
      </NuxtLink>
      <div>
        <p class="text-xs text-gray-400 dark:text-zinc-500">Bug</p>
        <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ bug ? bugCode(bug.id) : '\u2014' }}
        </h1>
      </div>
    </div>

    <div v-if="loading" class="rounded-lg border border-black/10 bg-white p-8 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-black">
      Loading...
    </div>

    <div v-else-if="bug" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- left column -->
      <div class="space-y-4 lg:col-span-2">
        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <div class="flex items-start justify-between gap-4">
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ bug.title }}
            </h2>
            <Select
              :model-value="bug.status"
              :options="ALL_BUG_STATUSES"
              :disabled="changingStatus"
              class="w-44"
              :pt="dropdownPt"
              @update:model-value="moveToStatus"
            >
              <template #value="{ value }">
                <StatusBadge v-if="value" :status="value" size="sm" />
              </template>
              <template #option="{ option }">
                <StatusBadge :status="option" size="sm" />
              </template>
            </Select>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="SEVERITY_CLASSES[bug.severity]"
            >
              {{ bug.severity }} Severity
            </span>
            <span
              v-if="bug.priority"
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="PRIORITY_CLASSES[bug.priority]"
            >
              {{ bug.priority }} Priority
            </span>
            <span
              class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600
                     dark:bg-white/10 dark:text-zinc-300"
            >
              {{ bug.module_name }}
            </span>
            <span
              v-if="bug.environment_build"
              class="rounded-full border border-black/10 px-2 py-0.5 text-xs font-medium text-gray-600
                     dark:border-white/10 dark:text-zinc-300"
            >
              <i class="pi pi-desktop mr-1 text-[10px]" />{{ bug.environment_build }}
            </span>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span
              v-if="bug.release_version"
              class="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5
                     text-xs font-semibold text-purple-700
                     dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300"
            >
              Release {{ bug.release_version }}
            </span>
            <span
              v-if="bug.linked_test_case_title"
              class="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700
                     dark:bg-sky-500/15 dark:text-sky-300"
            >
              {{ tcCode(bug.linked_test_case_id) }}: {{ bug.linked_test_case_title }}
            </span>
          </div>

          <p class="mt-3 text-xs text-gray-400 dark:text-zinc-500">
            Reported by {{ bug.reported_by_email ?? 'unknown' }}
            on {{ new Date(bug.reported_at).toLocaleString() }}
          </p>
        </div>

        <!-- steps to reproduce: QA-owned, developers don't need this at
             all so it's hidden entirely rather than shown read-only -->
        <div v-if="!isDeveloper" class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Steps to Reproduce
            </p>
            <BaseButton
              v-if="!editingSteps"
              label="Edit"
              variant="outline"
              size="sm"
              icon="pi pi-pencil"
              @click="startEditSteps"
            />
          </div>

          <RichTextEditor v-if="editingSteps" v-model="stepsDraft" class="mt-2" :rows="6" />
          <div
            v-else
            class="mt-2 whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                   text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            {{ bug.steps_to_reproduce || 'No steps recorded.' }}
          </div>

          <div v-if="editingSteps" class="mt-3 flex justify-end gap-2">
            <BaseButton variant="secondary" label="Cancel" size="sm" @click="editingSteps = false" />
            <BaseButton
              variant="primary"
              label="Save"
              size="sm"
              :loading="savingSteps"
              @click="saveSteps"
            />
          </div>
        </div>

        <!-- actual result: QA-owned, what actually happened when the bug
             occurred (as opposed to the linked test case's expected
             result below). developers see it read-only, since they need
             this context to fix the bug even though they can't edit it -->
        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Actual Result
            </p>
            <BaseButton
              v-if="isQa && !editingActualResult"
              label="Edit"
              variant="outline"
              size="sm"
              icon="pi pi-pencil"
              @click="startEditActualResult"
            />
          </div>

          <RichTextEditor v-if="editingActualResult" v-model="actualResultDraft" class="mt-2" :rows="6" />
          <div
            v-else
            class="mt-2 whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                   text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            {{ bug.actual_result || 'No actual result recorded.' }}
          </div>

          <div v-if="editingActualResult" class="mt-3 flex justify-end gap-2">
            <BaseButton variant="secondary" label="Cancel" size="sm" @click="editingActualResult = false" />
            <BaseButton
              variant="primary"
              label="Save"
              size="sm"
              :loading="savingActualResult"
              @click="saveActualResult"
            />
          </div>
        </div>

        <!-- linked test case, read only preview, no link into the test case's edit or execute flows -->
        <div
          v-if="bug.linked_test_case_id"
          class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black"
        >
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Linked Test Case
          </p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ tcCode(bug.linked_test_case_id) }}: {{ bug.linked_test_case_title }}
          </p>
          <div class="mt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Steps
            </p>
            <div
              class="mt-1 whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                     text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            >
              {{ bug.linked_test_case_steps || 'No steps recorded.' }}
            </div>
          </div>
          <div class="mt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Expected Result
            </p>
            <div
              class="mt-1 whitespace-pre-wrap rounded-md border border-black/10 bg-gray-50 p-3 text-sm
                     text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            >
              {{ bug.linked_test_case_expected_result || 'No expected result recorded.' }}
            </div>
          </div>
        </div>

        <!-- attachments, split into QA reproduction proof and developer
             fix/verification proof so each role's evidence stays in its
             own section. an image or video's bucket is decided by
             uploaded_by_role, snapshotted on the attachment at upload
             time so a later role change never reshuffles old uploads -->
        <div v-if="!isDeveloper" class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            QA Reproduction Proof
          </p>
          <MediaUploader
            :bug-id="bug.id"
            :initial-attachments="attachmentsForUploader"
            :filter-roles="QA_ROLES"
            @update:attachments="onAttachmentsChanged"
          />
        </div>

        <div v-if="!isDeveloper" class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Developer Fix / Verification Proof
          </p>
          <MediaUploader
            :bug-id="bug.id"
            :initial-attachments="attachmentsForUploader"
            :filter-roles="['Developer']"
            readonly
          />
        </div>

        <div v-if="isDeveloper" class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            QA Reproduction Proof
          </p>
          <MediaUploader
            :bug-id="bug.id"
            :initial-attachments="attachmentsForUploader"
            :filter-roles="QA_ROLES"
            readonly
          />
        </div>

        <div v-if="isDeveloper" class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Developer Resolution Proof
          </p>
          <MediaUploader
            :bug-id="bug.id"
            :initial-attachments="attachmentsForUploader"
            :filter-roles="['Developer']"
            @update:attachments="onAttachmentsChanged"
          />
        </div>

        <!-- developer notes & blockers: the developer's own comment field.
             kept separate from steps to reproduce and actual result,
             which are QA-owned. QA can read it for context but can't
             edit it -- only the developer (or an admin) can -->
        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
              Developer Notes & Blockers
            </p>
            <button
              v-if="(isDeveloper || user?.role === 'Admin') && !editingDevNotes"
              type="button"
              class="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
              @click="startEditDevNotes"
            >
              Edit
            </button>
          </div>
          <div v-if="!editingDevNotes" class="whitespace-pre-wrap text-sm text-gray-800 dark:text-zinc-200">
            {{ bug.dev_notes || 'No developer notes yet.' }}
          </div>
          <div v-else class="space-y-2">
            <textarea
              v-model="devNotesDraft"
              rows="4"
              placeholder="Implementation notes, environment quirks, or why this status decision was made..."
              class="w-full resize-y rounded-md border border-black/10 bg-transparent p-3 text-sm
                     text-gray-900 outline-none placeholder:text-gray-400
                     focus:border-purple-500 focus:ring-1 focus:ring-purple-500
                     dark:border-white/10 dark:text-white dark:placeholder:text-white/40"
            />
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
                @click="editingDevNotes = false"
              >
                Cancel
              </button>
              <button
                type="button"
                :disabled="savingDevNotes"
                class="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                @click="saveDevNotes"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <!-- audit history -->
        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Audit History
          </p>
          <AppTimeline :entries="timelineEntries" empty-message="No status changes or assignments yet." />
        </div>
      </div>

      <!-- right column -->
      <div class="space-y-4">
        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Owner / Assignee
          </p>
          <UserAvatarSelect
            :model-value="bug.owner_id"
            placeholder="Unassigned"
            @update:model-value="reassignOwner"
          />
          <p v-if="reassigning" class="mt-2 text-xs text-gray-400 dark:text-zinc-500">Saving...</p>
        </div>

        <div class="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
          <BaseButton
            label="Archive Bug"
            variant="danger"
            icon="pi pi-trash"
            block
            @click="archiveBug"
          />
        </div>
      </div>
    </div>

    <AppConfirmDialog ref="confirmDialogRef" />
  </div>
</template>
