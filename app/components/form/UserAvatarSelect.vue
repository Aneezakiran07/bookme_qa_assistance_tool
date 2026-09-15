<script setup lang="ts">
// assignee picker showing each user as an initials avatar plus a role
// badge (Dev, QA Lead, Tester, Admin), backed by GET /api/users.
interface UserOption {
  id: number
  email: string
  role: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
  }>(),
  { placeholder: 'Assign to...' }
)

defineEmits<{ 'update:modelValue': [number | null] }>()

const dropdownPt = useDropdownPt()

const { data: users } = await useFetch<UserOption[]>('/api/users')

function initials(email: string) {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

// short label so the badge fits next to an avatar in a tight dropdown row
const ROLE_SHORT: Record<string, string> = {
  Admin: 'Admin',
  'QA Lead': 'QA Lead',
  Tester: 'QA',
  Developer: 'Dev',
  Pending: 'Pending'
}
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="users ?? []"
    option-label="email"
    option-value="id"
    :placeholder="placeholder"
    filter
    class="w-full"
    :pt="dropdownPt"
    @update:model-value="(v: number) => $emit('update:modelValue', v)"
  >
    <template #value="{ value }">
      <div v-if="value && users" class="flex items-center gap-2">
        <template v-for="u in users.filter((u) => u.id === value)" :key="u.id">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100
                   text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
          >
            {{ initials(u.email) }}
          </span>
          <span>{{ u.email }}</span>
        </template>
      </div>
    </template>

    <template #option="{ option }">
      <div class="flex w-full items-center gap-2">
        <span
          class="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100
                 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
        >
          {{ initials(option.email) }}
        </span>
        <span class="flex-1 truncate">{{ option.email }}</span>
        <span
          class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600
                 dark:bg-white/10 dark:text-white/60"
        >
          {{ ROLE_SHORT[option.role] ?? option.role }}
        </span>
      </div>
    </template>
  </Select>
</template>
