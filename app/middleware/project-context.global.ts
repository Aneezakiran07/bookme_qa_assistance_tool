// runs after auth.global.ts because global middleware runs in file name order
// on any project route it makes sure the project list is loaded before
// the page renders, so the header plugin always knows the project id and pages
// never fire their first requests without it
export default defineNuxtRouteMiddleware(async (to) => {
  const slug = to.params.slug
  if (typeof slug !== 'string' || !slug) return

  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value?.active) return

  // composables are read before the first await so the nuxt context is still available
  const projects = useProjectList()
  const lastSlug = useLastProjectSlug()

  await loadProjects()

  // a project created since the list was loaded will not be in it yet, so look once more
  let found = projects.value?.find((item) => item.slug === slug)
  if (!found) {
    await loadProjects(true)
    found = projects.value?.find((item) => item.slug === slug)
  }

  if (found) {
    lastSlug.value = found.slug
  }
})
