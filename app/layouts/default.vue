<script setup lang="ts">
// this layout is just the shell, sidebar on the left and header on top,
// every page renders into the slot below the header with its own scroll
// on project pages it also shows the archived banner, and swaps the page
// for a friendly message when the project in the url does not exist
const { notFound, isReadOnly } = useCurrentProject()
</script>

<template>
  <div class="flex h-screen bg-white text-gray-900 dark:bg-black dark:text-white">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <PageHeader />

      <main class="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-black">
        <ProjectNotFound v-if="notFound" />
        <template v-else>
          <div
            v-if="isReadOnly"
            class="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3
                   text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            role="status"
          >
            <i class="pi pi-lock shrink-0" />
            <p class="min-w-0 flex-1">
              This project is archived and read only. You can look around, but nothing can be changed until it is unarchived.
            </p>
            <NuxtLink to="/projects" class="shrink-0 font-medium underline underline-offset-2">
              Manage projects
            </NuxtLink>
          </div>
          <slot />
        </template>
      </main>
    </div>
  </div>
</template>
