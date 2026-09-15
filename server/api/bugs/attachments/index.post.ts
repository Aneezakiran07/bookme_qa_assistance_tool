import { useCloudinary } from '~~/server/utils/cloudinary'
import { bugAttachmentRepository } from '~~/server/repositories/bugAttachmentRepository'

// video length is capped in the frontend uploader before it ever reaches here,
// this endpoint does not transcode anything, it just forwards the file
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const bugIdField = form.find((part) => part.name === 'bugId')
  const fileField = form.find((part) => part.name === 'file')
  if (!bugIdField || !fileField) {
    throw createError({ statusCode: 400, statusMessage: 'bugId and file are required' })
  }

  const bugId = Number(bugIdField.data.toString())
  const isVideo = fileField.type?.startsWith('video')
  const fileType: 'image' | 'video' = isVideo ? 'video' : 'image'

  const cloudinary = useCloudinary()
  const base64 = `data:${fileField.type};base64,${fileField.data.toString('base64')}`

  const uploadResult = await cloudinary.uploader.upload(base64, {
    resource_type: fileType,
    folder: 'bookme-qa-bugs',
    // images are resized and converted to webp to keep free-tier usage low
    // videos are stored as uploaded since duration is already capped client-side
    ...(fileType === 'image'
      ? { transformation: [{ width: 1920, crop: 'limit' }, { quality: 'auto:good' }, { fetch_format: 'webp' }] }
      : {})
  })

  return bugAttachmentRepository.create(
    bugId,
    uploadResult.secure_url,
    uploadResult.public_id,
    fileType,
    currentUser.id
  )
})
