import { useDb } from '../db/client'

// the database column is file_url but every frontend consumer (the
// MediaAttachment interface, MediaUploader, MediaLightbox) reads from
// .url, so every row coming out of this repository is remapped here
// instead of patching each call site separately
function mapRow(row: any) {
  if (!row) return row
  const { file_url, ...rest } = row
  return { ...rest, url: file_url }
}

export const bugAttachmentRepository = {
  async listByBug(bugId: number) {
    const sql = useDb()
    const rows = await sql`
      select * from bug_attachments where bug_id = ${bugId} order by uploaded_at asc
    `
    return rows.map(mapRow)
  },

  async create(
    bugId: number,
    fileUrl: string,
    publicId: string,
    fileType: 'image' | 'video',
    uploadedBy: number,
    uploadedByRole: string
  ) {
    const sql = useDb()
    const rows = await sql`
      insert into bug_attachments (bug_id, file_url, public_id, file_type, uploaded_by, uploaded_by_role)
      values (${bugId}, ${fileUrl}, ${publicId}, ${fileType}, ${uploadedBy}, ${uploadedByRole})
      returning *
    `
    return mapRow(rows[0])
  },

  async delete(attachmentId: number) {
    const sql = useDb()
    const rows = await sql`
      delete from bug_attachments where id = ${attachmentId}
      returning *
    `
    return mapRow(rows[0])
  }
}
