import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireRole } from '~~/server/utils/authorize'

// soft delete only: flips `archived` to true instead of removing the row,
// same pattern as requirements/bugs/test_cases. This isn't just for
// consistency -- requirements.module_id / test_cases.module_id have no
// `on delete cascade`, so once anything has ever pointed at a module
// (including an archived test case kept around only for its execution
// history), a real hard delete becomes permanently impossible for that
// row. Soft delete sidesteps that instead of special-casing it.
//
// still blocks when the module has *active* requirements or test cases
// (archived ones don't count -- see countLinkedItems), so a module
// doesn't disappear out from under things people are still using.
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

  const archived = await moduleRepository.archive(id)
  return { archived: true, module: archived }
})
