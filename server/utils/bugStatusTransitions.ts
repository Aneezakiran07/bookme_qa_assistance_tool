// single source of truth for which bug status a bug can move to next.
// Open -> In Progress -> Fixed -> Retest -> Closed is the happy path;
// Retest can bounce back to Reopened if the retest fails, Closed can be
// Reopened if the bug resurfaces, and Reopened goes back into the queue
// at In Progress. The PUT endpoint rejects any transition not listed here.
export const BUG_STATUS_TRANSITIONS: Record<string, string[]> = {
  Open: ['In Progress'],
  'In Progress': ['Fixed'],
  Fixed: ['Retest'],
  Retest: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['In Progress']
}

export function isValidBugStatusTransition(from: string, to: string): boolean {
  if (from === to) return true
  return BUG_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}
