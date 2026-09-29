<script setup lang="ts">
// friendly state shown in place of a page when the project slug in the url matches nothing
// it replaces the page instead of throwing, so nobody ever sees a raw error page for a typo
const { slug } = useCurrentProject()
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div
      class="w-full max-w-sm rounded-lg border border-border bg-foreground p-8 text-center"
    >
      <div
        class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full
               bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
      >
        <i class="pi pi-folder-open text-xl" />
      </div>

      <h2 class="mb-2 text-lg font-semibold text-heading">
        Project not found
      </h2>
      <p class="mb-6 text-sm text-body">
        There is no project called
        <span class="font-medium text-heading">{{ slug }}</span>.
        It may have been renamed, or the link may be mistyped.
      </p>

      <BaseButton label="Go to projects" icon="pi pi-folder-open" block @click="navigateTo('/projects')" />
    </div>
  </div>
</template>
