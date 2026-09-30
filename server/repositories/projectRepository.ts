import { useDb } from '../db/client'

export interface ProjectRecord {
  id: number
  name: string
  slug: string
  description: string | null
  created_by: number | null
  archived: boolean
  created_at: string
}

export interface FleetKpis {
  activeProjects: number
  openBugs: number
  criticalHighOpen: number
  // 0 to 100 with one decimal, or null when no executions exist
  passRate: number | null
}

// turns a project name into a url friendly slug, an empty result falls back to a generic word
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
  return base || 'project'
}

export const projectRepository = {
  // active projects only unless the caller asks for archived ones too
  async list(includeArchived = false): Promise<ProjectRecord[]> {
    const sql = useDb()
    const rows = includeArchived
      ? await sql`select * from projects order by archived asc, lower(name) asc`
      : await sql`select * from projects where archived = false order by lower(name) asc`
    return rows as ProjectRecord[]
  },

  async findById(id: number): Promise<ProjectRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from projects where id = ${id}`
    return (rows[0] as ProjectRecord) ?? null
  },

  async findBySlug(slug: string): Promise<ProjectRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from projects where slug = ${slug}`
    return (rows[0] as ProjectRecord) ?? null
  },

  // only active projects count, same as the partial unique index on the name
  async findByNameLower(name: string, excludeId?: number): Promise<ProjectRecord | null> {
    const sql = useDb()
    const rows = excludeId
      ? await sql`select * from projects where lower(name) = lower(${name}) and archived = false and id != ${excludeId}`
      : await sql`select * from projects where lower(name) = lower(${name}) and archived = false`
    return (rows[0] as ProjectRecord) ?? null
  },

  // the slug is generated once here and never changed afterward, so shared links keep working
  async create(input: { name: string; description: string | null; createdBy: number }): Promise<ProjectRecord> {
    const sql = useDb()
    const base = slugify(input.name)
    let slug = base
    let attempt = 2
    while (await this.findBySlug(slug)) {
      slug = `${base}-${attempt}`
      attempt += 1
    }

    const rows = await sql`
      insert into projects (name, slug, description, created_by)
      values (${input.name}, ${slug}, ${input.description}, ${input.createdBy})
      returning *
    `
    return rows[0] as ProjectRecord
  },

  // slug is deliberately not part of this update
  async update(
    id: number,
    patch: { name?: string; description?: string | null; archived?: boolean }
  ): Promise<ProjectRecord | null> {
    const sql = useDb()
    const current = await this.findById(id)
    if (!current) return null

    const rows = await sql`
      update projects set
        name = ${patch.name ?? current.name},
        description = ${patch.description !== undefined ? patch.description : current.description},
        archived = ${patch.archived ?? current.archived}
      where id = ${id}
      returning *
    `
    return (rows[0] as ProjectRecord) ?? null
  },

  // four counts across every project for the projects page, all counted inside the database in one round trip
  // pass rate is null when there are no executions yet so the page can show a dash instead of zero percent
  // count and round results are cast in sql because the driver returns bigint and numeric values as strings
  async getFleetKpis(): Promise<FleetKpis> {
    const sql = useDb()
    const rows = await sql`
      select
        (select count(*) from projects where archived = false)::int as active_projects,
        (select count(*) from bugs where status <> 'Closed' and archived = false)::int as open_bugs,
        (
          select count(*) from bugs
          where status <> 'Closed' and archived = false and severity in ('Critical', 'High')
        )::int as critical_high_open,
        (
          select round(100.0 * count(*) filter (where result = 'Pass') / nullif(count(*), 0), 1)
          from test_executions
        )::float8 as pass_rate
    `
    const row = rows[0] as {
      active_projects: number
      open_bugs: number
      critical_high_open: number
      pass_rate: number | null
    }
    return {
      activeProjects: row.active_projects,
      openBugs: row.open_bugs,
      criticalHighOpen: row.critical_high_open,
      passRate: row.pass_rate
    }
  }
}
