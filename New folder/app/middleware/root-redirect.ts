// attached to the home page only, it decides which project a signed in person lands in
// the last used project wins if it still exists and is active, then a single active project
// otherwise the project list, the query string travels along so the denied toast still works
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value?.active) return

  const projects = useProjectList()
  const lastSlug = useLastProjectSlug()

  await loadProjects(true)

  const active = (projects.value ?? []).filter((item) => !item.archived)
  const remembered = active.find((item) => item.slug === lastSlug.value)
  const target = remembered ?? (active.length === 1 ? active[0] : null)
  const path = target ? `/projects/${target.slug}` : '/projects'

  return navigateTo({ path, query: to.query }, { replace: true })
})
