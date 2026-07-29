// src/api/evaluations.api.js
import http from './http'

export const evaluationsApi = {
  // ── Formularios ──────────────────────────────────────────────────────────
  listForms:    (params)       => http.get('/evaluation-forms/',            { params }),
  getForm:      (uuid)         => http.get(`/evaluation-forms/${uuid}/`),
  createForm:   (data)         => http.post('/evaluation-forms/', data),
  updateForm:   (uuid, data)   => http.patch(`/evaluation-forms/${uuid}/`, data),
  deleteForm:   (uuid)         => http.delete(`/evaluation-forms/${uuid}/`),
  toggleActive: (uuid)         => http.post(`/evaluation-forms/${uuid}/toggle-active/`),
  getFormQuestions: (uuid)     => http.get(`/evaluation-forms/${uuid}/questions/`),

  // ── Google Forms ──────────────────────────────────────────────────────────
  publishGoogleForm: (uuid) =>
    http.post(`/evaluation-forms/${uuid}/publish-google-form/`),

  resyncGoogleForm: (uuid) =>
    http.post(`/evaluation-forms/${uuid}/resync-google-form/`),

  syncResponses: (uuid) =>
    http.post(`/evaluation-forms/${uuid}/sync-responses/`),

  getResponsesSummary: (uuid) =>
    http.get(`/evaluation-forms/${uuid}/responses-summary/`),

  getGoogleFormQr: (uuid) =>
    http.get(`/evaluation-forms/${uuid}/qr/`, { responseType: 'blob' }),

  downloadGoogleFormQr: (uuid) =>
    http.get(`/evaluation-forms/${uuid}/qr/`, {
      params:       { download: 'true' },
      responseType: 'blob',
    }),

  // ── Preguntas ────────────────────────────────────────────────────────────
  listQuestions:  (params)       => http.get('/evaluation-questions/',         { params }),
  createQuestion: (data)         => http.post('/evaluation-questions/', data),
  updateQuestion: (uuid, data)   => http.patch(`/evaluation-questions/${uuid}/`, data),
  deleteQuestion: (uuid)         => http.delete(`/evaluation-questions/${uuid}/`),

  // ── Evaluaciones de usuario ───────────────────────────────────────────────
  listEvaluations:  (params)     => http.get('/user-evaluations/',       { params }),
  getEvaluation:    (uuid)       => http.get(`/user-evaluations/${uuid}/`),
  createEvaluation: (data)       => http.post('/user-evaluations/', data),
  updateEvaluation: (uuid, data) => http.patch(`/user-evaluations/${uuid}/`, data),
  deleteEvaluation: (uuid)       => http.delete(`/user-evaluations/${uuid}/`),
  myEvaluations:    ()           => http.get('/user-evaluations/my/'),
  submitEvaluation: (uuid, data) => http.post(`/user-evaluations/${uuid}/submit/`, data),
}
