import { useCloudinary } from '~~/server/utils/cloudinary'
import { bugAttachmentRepository } from '~~/server/repositories/bugAttachmentRepository'
import { requireProject } from '~~/server/utils/requireProject'
export default defineEventHandler(async (event) => {
  const project = await requireProject(event, { write: true })
  const attachmentId = Number(getRouterParam(event, 'id'))
  if (!attachmentId || Number.isNaN(attachmentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid attachment id' })
  }

  const deleted = await bugAttachmentRepository.delete(project.id, attachmentId)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Attachment not found' })
  }

  if (deleted.public_id) {
    // the row is already gone, so a failed cloudinary cleanup is only logged
    try {
      const cloudinary = useCloudinary()
      await cloudinary.uploader.destroy(deleted.public_id, {
        resource_type: deleted.file_type === 'video' ? 'video' : 'image'
      })
    } catch (error) {
      console.error('Could not remove the attachment from cloudinary', deleted.public_id, error)
    }
  }

  return { deleted: true }
})