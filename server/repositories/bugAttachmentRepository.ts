import { useDb } from '../db/client'

export const bugAttachmentRepository = {
  async listByBug(bugId: number) {
    const sql = useDb()
    const rows = await sql`
      select * from bug_attachments where bug_id = ${bugId} order by uploaded_at asc
    `
    return rows
  },

  async create(
    bugId: number,
    fileUrl: string,
    publicId: string,
    fileType: 'image' | 'video',
    uploadedBy: number
  ) {
    const sql = useDb()
    const rows = await sql`
      insert into bug_attachments (bug_id, file_url, public_id, file_type, uploaded_by)
      values (${bugId}, ${fileUrl}, ${publicId}, ${fileType}, ${uploadedBy})
      returning *
    `
    return rows[0]
  },

  async delete(attachmentId: number) {
    const sql = useDb()
    const rows = await sql`
      delete from bug_attachments where id = ${attachmentId}
      returning *
    `
    return rows[0]
  }
}
