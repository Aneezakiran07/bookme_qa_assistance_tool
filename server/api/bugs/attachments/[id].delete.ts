import { useCloudinary } from '~~/server/utils/cloudinary'
import { bugAttachmentRepository } from '~~/server/repositories/bugAttachmentRepository'
export default defineEventHandler(async (event) => {
  const attachmentId = Number(getRouterParam(event, 'id'))
  const deleted = await bugAttachmentRepository.delete(attachmentId)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Attachment not found' })
  }

  if (deleted.public_id) {
    const cloudinary = useCloudinary()
    await cloudinary.uploader.destroy(deleted.public_id, {
      resource_type: deleted.file_type === 'video' ? 'video' : 'image'
    })
  }

  return { deleted: true }
})