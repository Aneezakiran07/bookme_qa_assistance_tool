<script setup lang="ts">
// reusable p-datatable shell: pagination, a search box wired to primevue's
// global filter, an empty-state slot, and dual-theme surface styling, so
// every list page (bugs, test cases, requirements, users) looks the same
// without re-implementing the chrome each time.
export interface AppDataTableColumn {
  field: string
  header: string
  sortable?: boolean
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
  }>(),
  {
    loading: false,
    rows: 10,
    searchable: true,
    searchPlaceholder: 'Search...',
    emptyMessage: 'No records found.',
    dataKey: 'id'
  }
)

const search = ref('')
const filters = computed(() => ({
  global: { value: search.value, matchMode: 'contains' }
}))
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

    <DataTable
      :value="value"
      :loading="loading"
      :paginator="value.length > rows"
      :rows="rows"
      :filters="filters"
      :global-filter-fields="columns.map((c) => c.field)"
      :data-key="dataKey"
      striped-rows
      class="!bg-transparent"
      :pt="{
        table: { class: '!bg-transparent' },
        headerRow: { class: '!bg-gray-50 dark:!bg-white/5' },
        bodyRow: { class: '!bg-transparent dark:!text-white' }
      }"
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
        :header="col.header"
        :sortable="col.sortable"
        :style="col.style"
      >
        <template #body="slotProps">
          <slot :name="`cell-${col.field}`" v-bind="slotProps">
            {{ slotProps.data[col.field] }}
          </slot>
        </template>
      </Column>

      <Column v-if="$slots.actions" header="" style="width: 1%; white-space: nowrap">
        <template #body="slotProps">
          <slot name="actions" v-bind="slotProps" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
