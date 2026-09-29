export interface ProjectSummary {
  id: number
  name: string
  slug: string
  description: string | null
  created_by: number | null
  archived: boolean
  created_at: string
}

// one shared list of every project, archived ones included, so both the
// header plugin and every component read the same data without refetching
export function useProjectList() {
  return useState<ProjectSummary[] | null>('projects-list', () => null)
}

// remembers the last project that was opened, only used to decide where the home page and old links redirect
export function useLastProjectSlug() {
  return useCookie<string | null>('bookme-qa-last-project', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    default: () => null
  })
}

// keeps parallel callers from sending the same request twice
const inFlightLoads = new WeakMap<object, Promise<void>>()

// loads the project list once, pass force to refetch after a create, rename or archive
// server side calls go through useRequestFetch so the session cookie is forwarded
export async function loadProjects(force = false) {
  const projects = useProjectList()
  if (projects.value && !force) return

  const nuxtApp = useNuxtApp()
  const running = inFlightLoads.get(nuxtApp)
  if (running) return running

  const requestFetch = useRequestFetch()
  const request = requestFetch<ProjectSummary[]>('/api/projects', { query: { includeArchived: '1' } })
    .then((list) => {
      projects.value = list
    })
    .finally(() => {
      inFlightLoads.delete(nuxtApp)
    })

  inFlightLoads.set(nuxtApp, request)
  return request
}

export function useCurrentProject() {
  const route = useRoute()
  const router = useRouter()
  const projects = useProjectList()
  const lastSlug = useLastProjectSlug()

  const slug = computed(() => {
    const value = route.params.slug
    return typeof value === 'string' && value ? value : null
  })

  const list = computed(() => projects.value ?? [])
  const activeProjects = computed(() => list.value.filter((item) => !item.archived))
  const archivedProjects = computed(() => list.value.filter((item) => item.archived))

  const isProjectRoute = computed(() => slug.value !== null)
  const project = computed(() => list.value.find((item) => item.slug === slug.value) ?? null)

  // true only after the list has loaded and the slug in the url matches nothing
  const notFound = computed(() => isProjectRoute.value && projects.value !== null && !project.value)
  const isReadOnly = computed(() => project.value?.archived === true)

  // builds a project prefixed path, so the bugs path with id 12 becomes the same path under the project slug
  // without a project on the route it falls back to the last used project, then to the project list
  function projectPath(subPath = '', overrideSlug?: string | null) {
    const target = overrideSlug ?? slug.value ?? lastSlug.value
    if (!target) return '/projects'
    const clean = subPath === '/' ? '' : subPath
    return `/projects/${target}${clean}`
  }

  // sends the person to the same kind of page in another project
  // detail pages carry an id param, so they land on the list page instead
  function switchProject(nextSlug: string) {
    const current = slug.value
    if (!current) return navigateTo(`/projects/${nextSlug}`)
    if (nextSlug === current) return

    const prefix = `/projects/${current}`
    let rest = route.path.startsWith(prefix) ? route.path.slice(prefix.length) : ''
    if (route.params.id && rest) {
      rest = rest.split('/').slice(0, -1).join('/')
    }
    return router.push(`/projects/${nextSlug}${rest}`)
  }

  // builds a useFetch key that carries the slug, so a different project never reuses cached data
  // the value is read once when the page is set up, pages are rebuilt when the slug changes
  function projectKey(name: string) {
    return `${name}:${slug.value ?? 'none'}`
  }

  // refetches the list after something changed it
  function refreshProjects() {
    return loadProjects(true)
  }

  return {
    slug,
    project,
    projects: list,
    activeProjects,
    archivedProjects,
    isProjectRoute,
    notFound,
    isReadOnly,
    lastSlug,
    projectPath,
    projectKey,
    switchProject,
    refreshProjects
  }
}
