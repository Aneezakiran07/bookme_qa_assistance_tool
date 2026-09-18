// attach with definePageMeta({ middleware: ['manage-users'] }) on any
// page that manages team members (approving signups, editing role/module
// scope, deactivating). Admin and QA Lead are both allowed here -- same
// permission tier for this pilot, just two different labels -- so
// anyone else gets bounced to the dashboard instead of seeing a blank
// or broken admin screen. (formerly admin-only.ts, before QA Lead got
// the same access Admin has.)
export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()

  const role = user.value?.role
  if (role !== 'Admin' && role !== 'QA Lead') {
    return navigateTo('/')
  }
})
