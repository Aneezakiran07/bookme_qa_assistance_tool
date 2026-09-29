// attach with definePageMeta({ middleware: ['admin-only'] }) on any page
// that only an Admin should ever see, non admins get bounced to the
// dashboard instead of seeing a blank or broken admin screen
export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()

  if (user.value?.role !== 'Admin') {
    return navigateTo('/')
  }
})
