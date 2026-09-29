// adds the project id header to every project scoped api call
//
// on the server every useFetch call goes through the request scoped fetch, so that one is wrapped
// for the current request only, which also keeps the forwarded session cookie
// in the browser useFetch holds on to the original fetch helper, so patching
// the global helper would miss it, wrapping window fetch covers useFetch and the helper together
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const projects = useProjectList()

  // returns the id of the project in the current url, or null on global pages
  function currentProjectId(): number | null {
    const slug = router.currentRoute.value.params.slug
    if (typeof slug !== 'string' || !slug) return null
    return projects.value?.find((item) => item.slug === slug)?.id ?? null
  }

  if (import.meta.server) {
    const event = nuxtApp.ssrContext?.event
    if (!event) return

    const originalFetch = event.$fetch
    event.$fetch = ((request: any, init: any = {}) => {
      const projectId = typeof request === 'string' && isProjectScopedApiPath(request) ? currentProjectId() : null
      if (projectId === null) return originalFetch(request, init)

      // h3 spreads init.headers into a plain object, so a Headers instance would be lost
      const headers = Object.fromEntries(new Headers(init?.headers).entries())
      headers['x-project-id'] = String(projectId)
      return originalFetch(request, { ...init, headers })
    }) as typeof event.$fetch
    return
  }

  const originalWindowFetch = window.fetch
  window.fetch = function projectAwareFetch(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL && input.origin === window.location.origin ? input.pathname + input.search : ''
    const projectId = url.startsWith('/api/') && isProjectScopedApiPath(url) ? currentProjectId() : null
    if (projectId === null) return originalWindowFetch.call(window, input, init)

    const headers = new Headers(init?.headers)
    headers.set('x-project-id', String(projectId))
    return originalWindowFetch.call(window, input, { ...init, headers })
  }
})
