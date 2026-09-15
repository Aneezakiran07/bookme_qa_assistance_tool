<script setup lang="ts">
// this layout is just the shell, sidebar on the left and header on top,
// every page renders into the slot below the header with its own scroll
</script>

<template>
  <div class="flex h-screen bg-white text-gray-900 dark:bg-black dark:text-white">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <PageHeader />

      <main class="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-black">
        <slot />
      </main>
    </div>
  </div>
</template>
