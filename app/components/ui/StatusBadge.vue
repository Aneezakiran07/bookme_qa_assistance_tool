<script setup lang="ts">
// maps every status string used across the app (bugs, test runs,
// requirements, user approval) onto one consistent set of badge colors,
// themed for both light and dark surfaces. accepts the raw db value
// ("In Progress", "Fixed", "Not Started", etc) and normalizes it, so
// callers never have to remember exact casing or spelling.
const props = withDefaults(
  defineProps<{
    status: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' }
)

type Palette = { label: string; classes: string }

const PALETTES: Record<string, Palette> = {
  passed: {
    label: 'Passed',
    classes:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
  },
  failed: {
    label: 'Failed',
    classes:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
  },
  open: {
    label: 'Open',
    classes:
      'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30'
  },
  inProgress: {
    label: 'In Progress',
    classes:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
  },
  resolved: {
    label: 'Resolved',
    classes:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
  },
  fixed: {
    label: 'Fixed',
    classes:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
  },
  retest: {
    label: 'Retest',
    classes:
      'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30'
  },
  reopened: {
    label: 'Reopened',
    classes:
      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
  },
  closed: {
    label: 'Closed',
    classes:
      'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/10 dark:text-white/60 dark:border-white/10'
  },
  pending: {
    label: 'Pending',
    classes:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  notStarted: {
    label: 'Not Started',
    classes:
      'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-white/50 dark:border-white/10'
  },
  approved: {
    label: 'Approved',
    classes:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
  },
  done: {
    label: 'Done',
    classes:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
  }
}

// aliases from the actual db check-constraints to a palette key above,
// so a bug's "Fixed" and a test run's "Passed" both read as "good news"
// green even though the underlying words differ. bug-specific statuses
// (fixed, retest, reopened) get their own palette entries above instead
// of borrowing another module's label, so the badge text always matches
// the real db value the person is looking at.
const ALIASES: Record<string, keyof typeof PALETTES> = {
  passed: 'passed',
  done: 'done',
  fixed: 'fixed',
  resolved: 'resolved',
  failed: 'failed',
  reopened: 'reopened',
  open: 'open',
  draft: 'open',
  'in progress': 'inProgress',
  in_progress: 'inProgress',
  retest: 'retest',
  'in testing': 'inProgress',
  closed: 'closed',
  pending: 'pending',
  'not started': 'notStarted',
  approved: 'approved'
}

const palette = computed<Palette>(() => {
  const key = props.status?.toString().trim().toLowerCase() ?? ''
  const mapped = ALIASES[key]
  return mapped ? PALETTES[mapped] : { label: props.status, classes: PALETTES.pending.classes }
})
</script>

<template>
  <span
    class="inline-flex max-w-[12rem] items-center whitespace-nowrap rounded-full border font-medium"
    :class="[
      palette.classes,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    ]"
    :title="palette.label"
  >
    <span class="truncate">{{ palette.label }}</span>
  </span>
</template>
