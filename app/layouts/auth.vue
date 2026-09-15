<script setup lang="ts">
// auth layout: login, pending-approval, etc.
</script>

<template>
  <div class="relative min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
    <!-- Floating theme toggle in the top-right corner -->
    <div class="absolute right-4 top-4 z-10">
      <ThemeToggle />
    </div>

    <slot />
  </div>
</template>