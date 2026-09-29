<script setup lang="ts">
// auth layout for the login, invite and password pages
</script>

<template>
  <div class="relative min-h-screen bg-background text-heading">
    <!-- Floating theme toggle in the top-right corner -->
    <div class="absolute right-4 top-4 z-10">
      <ThemeToggle />
    </div>

    <slot />
  </div>
</template>