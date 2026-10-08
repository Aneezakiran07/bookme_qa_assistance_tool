<script setup lang="ts">
// assignee picker showing each user with their chosen avatar plus a role
// badge (Dev, QA Lead, Tester, Admin), backed by GET /api/users.
interface UserOption {
  id: number
  email: string
  role: string
  avatar_id: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    placeholder?: string
    disabled?: boolean
  }>(),
  { placeholder: 'Assign to...', disabled: false }
)

defineEmits<{ 'update:modelValue': [number | null] }>()

const dropdownPt = useDropdownPt()

const { data: users } = await useFetch<UserOption[]>('/api/users')

// short label so the badge fits next to an avatar in a tight dropdown row
const ROLE_SHORT: Record<string, string> = {
  Admin: 'Admin',
  'QA Lead': 'QA Lead',
  Tester: 'QA',
  Developer: 'Dev'
}
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="users ?? []"
    option-label="email"
    option-value="id"
    :placeholder="placeholder"
    :disabled="disabled"
    filter
    class="w-full"
    :pt="dropdownPt"
    panel-class="!bg-foreground !text-heading !border !border-border"
    @update:model-value="(v: number) => $emit('update:modelValue', v)"
  >
    <template #value="{ value }">
      <div v-if="value && users" class="flex items-center gap-2">
        <template v-for="u in users.filter((u) => u.id === value)" :key="u.id">
          <AppAvatar :avatar-id="u.avatar_id" size="xs" />
          <span>{{ u.email }}</span>
        </template>
      </div>
    </template>

    <template #option="{ option }">
      <div class="flex w-full items-center gap-2">
        <AppAvatar :avatar-id="option.avatar_id" size="xs" />
        <span class="flex-1 truncate">{{ option.email }}</span>
        <span
          class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-body"
        >
          {{ ROLE_SHORT[option.role] ?? option.role }}
        </span>
      </div>
    </template>
  </Select>
</template>
