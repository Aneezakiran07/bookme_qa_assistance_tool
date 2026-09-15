// PrimeVue teleports overlay panels (dropdown lists, dialog masks, toast
// stacks) outside the component that opened them, so a dark: class on the
// trigger element never reaches them, they fall back to the Aura preset's
// light surface and become unreadable in dark mode. every Select,
// MultiSelect, and Dialog in this app should spread one of these into
// its own :pt so panels, lists, and options are themed consistently
// everywhere instead of being fixed one component at a time.

// dropdown-style overlay, used by Select and MultiSelect panels
export function useDropdownPt() {
  return {
    root: {
      class: '!bg-white !border-gray-200 !text-gray-900 dark:!bg-black dark:!border-zinc-700 dark:!text-white',
    },
    overlay: {
      class: '!bg-white !border !border-gray-200 !text-gray-900 dark:!bg-zinc-900 dark:!border-zinc-700 dark:!text-white',
    },
    list: {
      class: '!bg-white dark:!bg-zinc-900',
    },
    option: {
      class:
        '!text-gray-900 dark:!text-white hover:!bg-gray-100 dark:hover:!bg-white/10 aria-selected:!bg-purple-600/10 aria-selected:!text-purple-600 dark:aria-selected:!text-purple-400',
    },
    optionGroup: {
      class: '!bg-white !text-gray-500 dark:!bg-zinc-900 dark:!text-zinc-400',
    },
    emptyMessage: {
      class: '!bg-white !text-gray-500 dark:!bg-zinc-900 dark:!text-zinc-400',
    },
    header: {
      class: '!bg-white !border-gray-200 dark:!bg-zinc-900 dark:!border-zinc-700',
    },
    footer: {
      class: '!bg-white !border-gray-200 dark:!bg-zinc-900 dark:!border-zinc-700',
    },
    filterInput: {
      class: '!bg-white !text-gray-900 dark:!bg-black dark:!text-white',
    },
  }
}

// dialog/modal chrome, used by BaseModal
export function useDialogPt() {
  return {
    root: {
      class: '!bg-white !text-gray-900 dark:!bg-black dark:!text-white !border !border-gray-200 dark:!border-zinc-800',
    },
    header: {
      class: '!bg-white !text-gray-900 dark:!bg-black dark:!text-white !border-b !border-gray-200 dark:!border-zinc-800',
    },
    content: {
      class: '!bg-white !text-gray-900 dark:!bg-black dark:!text-white',
    },
    footer: {
      class: '!bg-white dark:!bg-black !border-t !border-gray-200 dark:!border-zinc-800',
    },
    mask: {
      class: 'backdrop-blur-sm !bg-black/40',
    },
  }
}

// toast message stack
export function useToastPt() {
  return {
    root: { class: 'z-[9999]' },
    message: {
      class: '!bg-white !text-gray-900 !border !border-gray-200 dark:!bg-black dark:!text-white dark:!border-white/10',
    },
    messageContent: {
      class: '!bg-transparent !text-gray-900 dark:!text-white',
    },
    summary: {
      class: '!text-gray-900 dark:!text-white',
    },
    detail: {
      class: '!text-gray-600 dark:!text-zinc-400',
    },
  }
}
