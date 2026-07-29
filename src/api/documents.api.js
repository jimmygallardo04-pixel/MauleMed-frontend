// src/api/documents.api.js
import http from './http'

const BASE = '/documents'

export const documentsApi = {
  listDocuments:  (params)       => http.get(BASE + '/', { params }),
  getDocument:    (uuid)         => http.get(`${BASE}/${uuid}/`),
  createDocument: (data)         => http.post(BASE + '/', data),
  updateDocument: (uuid, data)   => http.patch(`${BASE}/${uuid}/`, data),
  deleteDocument: (uuid)         => http.delete(`${BASE}/${uuid}/`),

  /**
   * Sube un archivo real vía multipart/form-data.
   * El backend lo sube a Supabase Storage y devuelve el Document creado.
   * @param {File}   file
   * @param {Object} meta — { document_type, related_model?, related_uuid?, notes? }
   */
  uploadDocument(file, meta = {}) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', meta.document_type ?? 'OTRO')
    if (meta.related_model) fd.append('related_model', meta.related_model)
    if (meta.related_uuid)  fd.append('related_uuid',  meta.related_uuid)
    if (meta.notes)         fd.append('notes',         meta.notes)
    return http.post(`${BASE}/upload/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
