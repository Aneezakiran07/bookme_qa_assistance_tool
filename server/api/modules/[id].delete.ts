import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireRole } from '~~/server/utils/authorize'

// blocks deletion when the module is still referenced by any requirement
// or test case (both tables define module_id as `not null references
// modules(id)`, so a plain delete would fail at the DB level anyway) --
// this returns a friendly, specific message instead of a raw FK-violation
// error so the frontend can toast it directly.
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid module id' })
  }

  const current = await moduleRepository.findById(id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  const linked = await moduleRepository.countLinkedItems(id)
  if (linked.requirements > 0 || linked.testCases > 0) {
    const parts: string[] = []
    if (linked.requirements > 0) parts.push(`${linked.requirements} requirement${linked.requirements === 1 ? '' : 's'}`)
    if (linked.testCases > 0) parts.push(`${linked.testCases} test case${linked.testCases === 1 ? '' : 's'}`)
    throw createError({
      statusCode: 409,
      statusMessage: `Can't delete "${current.name}" — it's still linked to ${parts.join(' and ')}. Move or remove those first.`
    })
  }

  const deleted = await moduleRepository.delete(id)
  return { deleted: true, module: deleted }
})
