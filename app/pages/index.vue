<script setup lang="ts">
// role-based dashboard switch: Developers get a streamlined "my bugs"
// view (DeveloperDashboard.vue); QA Lead, Tester, and Admin keep the
// existing project-wide Executive Dashboard (QaAdminDashboard.vue,
// extracted unchanged from what used to live directly in this file).
//
// the role check reads from the signed-in session (nuxt-auth-utils'
// useUserSession), not straight from Firebase -- Firebase Auth only
// gets the person logged in, the session is what actually carries the
// app role, and it's kept in sync with the users table by
// server/middleware/00-syncSession.ts on every request.
definePageMeta({ layout: 'default' })

const { user } = useUserSession()
const route = useRoute()
const router = useRouter()
const toast = useToast()

// the developer route guard in auth.global.ts can't fire a toast directly
// because the toast service may not be mounted yet during middleware, so
// it redirects here with a query flag instead, and this page fires the
// toast once mounted and then strips the flag back out of the url
onMounted(() => {
  if (route.query.denied === 'developer-role') {
    toast.add({
      severity: 'warn',
      summary: 'That page is not available to developers',
      life: 4000
    })
    const { denied, ...rest } = route.query
    router.replace({ path: route.path, query: rest })
  }
})
</script>

<template>
  <DeveloperDashboard v-if="user?.role === 'Developer'" />
  <QaAdminDashboard v-else />
</template>
