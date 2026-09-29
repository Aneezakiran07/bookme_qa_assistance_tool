// attached to the old top level pages such as the bugs and requirements lists
// they now live under a project, so the old address is sent to the same page in the
// last used project, or to the project list when there is no usable last project
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value?.active) return

  const projects = useProjectList()
  const lastSlug = useLastProjectSlug()

  await loadProjects()

  const known = projects.value?.find((item) => item.slug === lastSlug.value)
  if (!known) return navigateTo('/projects', { replace: true })

  const cleanPath = to.path.replace(/\/+$/, '')
  return navigateTo(
    { path: `/projects/${known.slug}${cleanPath}`, query: to.query, hash: to.hash },
    { replace: true }
  )
})
