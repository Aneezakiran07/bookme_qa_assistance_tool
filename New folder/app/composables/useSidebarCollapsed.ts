// shared collapsed/expanded state for the app sidebar, same idea as
// @nuxtjs/color-mode's own storageKey persistence -- useState gives one
// reactive value shared across every component that calls this (no
// prop drilling between AppSidebar and anything else that might care),
// and it's hydration-safe for SSR since useState is Nuxt's own
// server-safe alternative to a plain module-level ref.
const STORAGE_KEY = 'bookme-qa-sidebar-collapsed'

export function useSidebarCollapsed() {
  const collapsed = useState('sidebar-collapsed', () => false)

  // read the saved preference once, client-side only (localStorage
  // doesn't exist during SSR), so a refresh keeps whatever state the
  // user left it in instead of always resetting to expanded
  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      collapsed.value = saved === 'true'
    }
  })

  function toggle() {
    collapsed.value = !collapsed.value
    localStorage.setItem(STORAGE_KEY, String(collapsed.value))
  }

  return { collapsed, toggle }
}
