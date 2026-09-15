<script setup lang="ts">
// dropdown for picking a module (Payments, Search, etc), backed by
// GET /api/modules. supports typing a name that doesn't exist yet and
// creating it inline via POST /api/modules, so nobody has to leave the
// bug/test-case form just to add a module.
interface ModuleOption {
  id: number
  name: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
    invalid?: boolean
  }>(),
  {
    placeholder: 'Select a module',
    invalid: false
  }
)

const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

const dropdownPt = useDropdownPt()

const { data: modules, refresh } = await useFetch<ModuleOption[]>('/api/modules')

const filterText = ref('')
const creating = ref(false)

const filteredModules = computed(() => {
  const list = modules.value ?? []
  if (!filterText.value) return list
  return list.filter((m) => m.name.toLowerCase().includes(filterText.value.toLowerCase()))
})

// true only when what's typed doesn't match any existing module name —
// that's the signal to offer "create module" instead of just "no results"
const canCreate = computed(() => {
  const text = filterText.value.trim()
  if (!text) return false
  return !(modules.value ?? []).some((m) => m.name.toLowerCase() === text.toLowerCase())
})

async function createModule() {
  const name = filterText.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const created = await $fetch<ModuleOption>('/api/modules', {
      method: 'POST',
      body: { name }
    })
    await refresh()
    emit('update:modelValue', created.id)
    filterText.value = ''
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="filteredModules"
    option-label="name"
    option-value="id"
    :placeholder="placeholder"
    filter
    :invalid="invalid"
    class="w-full"
    :pt="dropdownPt"
    @update:model-value="(v: number) => $emit('update:modelValue', v)"
    @filter="(e: { value: string }) => (filterText = e.value)"
  >
    <template #footer>
      <div v-if="canCreate" class="border-t border-black/10 p-2 dark:border-white/10">
        <BaseButton
          variant="outline"
          size="sm"
          icon="pi pi-plus"
          :label="`Create \u201c${filterText.trim()}\u201d`"
          :loading="creating"
          block
          @click="createModule"
        />
      </div>
    </template>
  </Select>
</template>
