// attached to the old single bug page that earlier emails still link to
// a bug id alone does not say which project it belongs to, so the locate endpoint is asked
// an unknown or invalid bug sends the person to the project list instead of an error page
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value || !user.value?.active) return

  const bugId = encodeURIComponent(String(to.params.id))
  const requestFetch = useRequestFetch()

  try {
    const found = await requestFetch<{ projectId: number; projectSlug: string }>(`/api/bugs/${bugId}/locate`)
    return navigateTo({ path: `/projects/${found.projectSlug}/bugs/${bugId}`, query: to.query }, { replace: true })
  } catch {
    return navigateTo('/projects', { replace: true })
  }
})
