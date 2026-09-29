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
      class: '!bg-foreground !border !border-black/15 !text-heading hover:!border-[#245CB1] dark:!border-white/15 dark:hover:!border-[#5B8FE0]',
    },
    overlay: {
      class: '!bg-foreground !border !border-border !text-heading',
    },
    listContainer: {
      class: '!bg-foreground',
    },
    list: {
      class: '!bg-foreground',
    },
    option: {
      class:
        '!text-heading hover:!bg-secondary aria-selected:!bg-[#245CB1]/10 dark:aria-selected:!bg-[#5B8FE0]/15',
    },
    optionGroup: {
      class: '!bg-foreground !text-body',
    },
    emptyMessage: {
      class: '!bg-foreground !text-body',
    },
    header: {
      class: '!bg-foreground !border-border',
    },
    footer: {
      class: '!bg-foreground !border-border',
    },
    pcFilter: {
      class: '!bg-foreground !text-heading',
    },
  }
}

// dialog/modal chrome, used by BaseModal
export function useDialogPt() {
  return {
    root: {
      class: '!bg-foreground !text-heading !border !border-border',
    },
    header: {
      class: '!bg-foreground !text-heading !border-b !border-border',
    },
    content: {
      class: '!bg-foreground !text-heading',
    },
    footer: {
      class: '!bg-foreground !border-t !border-border',
    },
    mask: {
      class: 'backdrop-blur-sm !bg-black/40',
    },
  }
}

// small floating panel used by Popover (e.g. the Quick Status Edit menu
// on the bugs list). same reasoning as the dropdown/dialog helpers above:
// the panel is teleported out of the trigger's DOM subtree, so it needs
// its own themed pt instead of relying on dark: classes to reach it.
export function usePopoverPt() {
  return {
    root: {
      class: '!bg-foreground !border !border-border !text-heading',
    },
    content: {
      class: '!bg-foreground',
    },
  }
}

// toast message stack. severity (success/error/warn/info) drives a
// colored left accent + icon so success and failure are visually
// distinct at a glance, not just distinguishable by reading the text --
// pt must be a function here (not a static object like the other
// helpers) since the color depends on which toast.add() call this is
// rendering for.
export function useToastPt() {
  const SEVERITY_ACCENT: Record<string, string> = {
    success: '!border-l-emerald-500 dark:!border-l-emerald-500',
    error: '!border-l-red-500 dark:!border-l-red-500',
    warn: '!border-l-amber-500 dark:!border-l-amber-500',
    info: '!border-l-[#245CB1] dark:!border-l-[#5B8FE0]'
  }
  const SEVERITY_ICON: Record<string, string> = {
    success: '!text-emerald-500 dark:!text-emerald-400',
    error: '!text-red-500 dark:!text-red-400',
    warn: '!text-amber-500 dark:!text-amber-400',
    info: '!text-[#245CB1] dark:!text-[#5B8FE0]'
  }

  return {
    root: { class: 'z-[9999]' },
    message: ({ props }: { props: { message?: { severity?: string } } }) => ({
      class: [
        '!bg-foreground !text-heading !border !border-border',
        'border-l-4',
        SEVERITY_ACCENT[props.message?.severity ?? 'info'] ?? SEVERITY_ACCENT.info
      ]
    }),
    messageIcon: ({ props }: { props: { message?: { severity?: string } } }) => ({
      class: SEVERITY_ICON[props.message?.severity ?? 'info'] ?? SEVERITY_ICON.info
    }),
    messageContent: {
      class: '!bg-transparent !text-heading',
    },
    summary: {
      class: '!text-heading',
    },
    detail: {
      class: '!text-body',
    },
  }
}