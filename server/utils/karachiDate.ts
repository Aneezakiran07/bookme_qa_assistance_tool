// Bookme operates out of Pakistan, so "today", "this week" and "this
// month" need to follow Asia/Karachi (UTC+5, no DST) regardless of
// where the server process happens to run -- otherwise a server on UTC
// time could roll the day/week/month over hours before or after the
// user's own calendar does. shared here since both the profile digest
// and the developer bugs directory's period filter need the exact same
// boundaries.
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000

export function karachiNow(): Date {
  return new Date(Date.now() + KARACHI_OFFSET_MS)
}

export function karachiToday(): string {
  return karachiNow().toISOString().slice(0, 10)
}

export function mondayOfThisWeek(karachiToday: Date): string {
  const day = karachiToday.getUTCDay() // 0 = Sunday, using UTC getters since karachiToday is already shifted
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(karachiToday)
  monday.setUTCDate(karachiToday.getUTCDate() - diffToMonday)
  return monday.toISOString().slice(0, 10)
}

export function firstOfThisMonth(karachiToday: Date): string {
  const firstDay = new Date(karachiToday)
  firstDay.setUTCDate(1)
  return firstDay.toISOString().slice(0, 10)
}

// shared "all time / today / this week / this month" period filter used
// by both the Developer Bugs Directory and the QA/Tester bug list --
// resolves a period key into the [periodStart, periodEnd] window the
// repository layer expects (undefined/undefined for 'all', which keeps
// the old unfiltered behaviour). Centralized here so every bug-list
// page that adds this filter computes the exact same boundaries instead
// of re-deriving them.
export const VALID_PERIODS = ['all', 'day', 'week', 'month'] as const
export type Period = (typeof VALID_PERIODS)[number]

export function resolvePeriodRange(period: Period): { periodStart?: string; periodEnd?: string } {
  if (period === 'all') return { periodStart: undefined, periodEnd: undefined }

  const now = karachiNow()
  const today = now.toISOString().slice(0, 10)
  const periodStart =
    period === 'day' ? today
    : period === 'week' ? mondayOfThisWeek(now)
    : firstOfThisMonth(now)

  return { periodStart, periodEnd: today }
}
