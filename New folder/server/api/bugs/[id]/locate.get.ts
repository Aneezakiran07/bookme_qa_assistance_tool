import { useDb } from '~~/server/db/client'

// finds which project a bug belongs to so old links that carry no project can be redirected
// this route does not need the project header because its whole job is to discover the project
// the session check for every api route already runs in the approved user server middleware
export default defineEventHandler(async (event) => {
  const bugId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(bugId) || bugId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bug id' })
  }

  const sql = useDb()
  const rows = await sql`
    select b.project_id, p.slug
    from bugs b
    join projects p on p.id = b.project_id
    where b.id = ${bugId}
  `
  const row = rows[0] as { project_id: number; slug: string } | undefined
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Bug not found' })
  }

  return { projectId: row.project_id, projectSlug: row.slug }
})
