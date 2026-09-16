// mirrors server/utils/bugStatusTransitions.ts. kept as a plain object
// (not imported across the client/server boundary) so the status buttons
// render instantly without a round trip; the PUT endpoint is still the
// source of truth and rejects anything not listed here.
export const BUG_STATUS_TRANSITIONS: Record<string, string[]> = {
  Open: ['In Progress'],
  'In Progress': ['Fixed'],
  Fixed: ['Retest'],
  Retest: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['In Progress']
}
