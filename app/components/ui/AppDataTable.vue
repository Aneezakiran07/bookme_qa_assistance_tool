<script setup lang="ts">
// reusable p-datatable shell: pagination, a search box wired to primevue's
// global filter, an empty-state slot, and dual-theme surface styling, so
// every list page (bugs, test cases, requirements, users) looks the same
// without re-implementing the chrome each time.
//
// sorting is explicitly controlled (sortField/sortOrder below) rather than
// left to the table's own internal, uncontrolled state: PrimeVue only
// keeps that internal state in sync with itself if nothing else ever
// touches it, and it was silently getting reset on rerender here, which is
// what made a second click on a header look like it did nothing. Owning
// the state ourselves and feeding it back in with v-model fixes that, and
// also gives callers a plain 'sort' event (sortBy/sortOrder) to refetch
// against when they're paging data server-side instead of sorting in the
// browser.
export interface AppDataTableColumn {
  field: string
  header: string
  sortable?: boolean
  // the actual row property to sort by, when `field` is a display-only
  // label (e.g. a formatted "BUG-001" code) that doesn't exist on the row
  // itself. defaults to `field` when not provided.
  sortField?: string
  style?: string
}

const props = withDefaults(
  defineProps<{
    value: Record<string, any>[]
    columns: AppDataTableColumn[]
    loading?: boolean
    rows?: number
    searchable?: boolean
    searchPlaceholder?: string
    emptyMessage?: string
    dataKey?: string
    // header text for the actions column, when the actions slot is used.
    // defaults to blank (matching current behavior) when omitted
    actionsHeader?: string
  }>(),
  {
    loading: false,
    rows: 10,
    searchable: true,
    searchPlaceholder: 'Search...',
    emptyMessage: 'No records found.',
    dataKey: 'id',
    actionsHeader: ''
  }
)

const emit = defineEmits<{
  sort: [payload: { sortBy: string | null; sortOrder: 'asc' | 'desc' | null }]
}>()

const search = ref('')
const filters = computed(() => ({
  global: { value: search.value, matchMode: 'contains' }
}))

// -- sort state --
// sortOrder follows primevue's own convention: 1 is ascending, -1 is
// descending, 0 (or null) is unsorted. removableSort below is what lets a
// third click clear back to 0 instead of just flipping forever between the
// other two.
const sortField = ref<string | null>(null)
const sortOrder = ref<0 | 1 | -1>(0)

function onSort(event: { sortField?: string; sortOrder?: 0 | 1 | -1 }) {
  sortField.value = event.sortField ?? null
  sortOrder.value = event.sortOrder ?? 0

  emit('sort', {
    sortBy: sortOrder.value === 0 ? null : sortField.value,
    sortOrder: sortOrder.value === 1 ? 'asc' : sortOrder.value === -1 ? 'desc' : null
  })
}

// PrimeVue sorts each column by its own `:field`. When a column's `field`
// is a display-only label rather than a real row property (see
// AppDataTableColumn.sortField), the <Column> below must be told to sort
// by the real property instead, or a header click silently does nothing.
function resolveSortField(col: AppDataTableColumn) {
  return col.sortField ?? col.field
}
</script>

<template>
  <div
    class="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black"
  >
    <div
      v-if="searchable || $slots.toolbar"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-3 dark:border-white/10"
    >
      <IconField v-if="searchable" icon-position="left" class="w-full max-w-xs">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          :placeholder="searchPlaceholder"
          class="w-full !bg-transparent dark:!border-white/10 dark:!text-white"
        />
      </IconField>
      <div class="flex items-center gap-2">
        <slot name="toolbar" />
      </div>
    </div>

    <div class="overflow-x-auto">
      <DataTable
        :value="value"
        :loading="loading"
        :paginator="value.length > rows"
        :rows="rows"
        :filters="filters"
        :global-filter-fields="columns.map((c) => c.field)"
        :data-key="dataKey"
        v-model:sort-field="sortField"
        v-model:sort-order="sortOrder"
        removable-sort
        :default-sort-order="-1"
        striped-rows
        class="!bg-transparent"
        :pt="{
          table: { class: '!bg-transparent min-w-full' },
          headerRow: { class: '!bg-gray-50 dark:!bg-white/5' },
          bodyRow: { class: '!bg-transparent dark:!text-white' }
        }"
        @sort="onSort"
      >
        <template #empty>
          <div class="p-8 text-center text-sm text-gray-500 dark:text-white/50">
            <slot name="empty">{{ emptyMessage }}</slot>
          </div>
        </template>

        <Column
          v-for="col in columns"
          :key="col.field"
          :field="col.field"
          :sort-field="resolveSortField(col)"
          :header="col.header"
          :sortable="col.sortable"
          :style="col.style"
        >
          <template #body="slotProps">
            <slot :name="`cell-${col.field}`" v-bind="slotProps">
              <span class="block max-w-xs truncate">{{ slotProps.data[col.field] }}</span>
            </slot>
          </template>
        </Column>

        <Column
          v-if="$slots.actions"
          :header="actionsHeader"
          style="width: 1%; white-space: nowrap"
          :pt="{ headerCell: { class: 'text-right' }, bodyCell: { class: 'text-right' } }"
        >
          <template #body="slotProps">
            <slot name="actions" v-bind="slotProps" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
