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
  }
}
