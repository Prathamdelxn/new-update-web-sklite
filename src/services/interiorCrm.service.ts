// =============================================================================
// Sky-Lite Web — Interior-OS CRM API Service
// Port of sky-lite's own src/services/api.client-based CRM calls
// (src/app/interior/crm/page.tsx and src/components/crm|modals/*), using the
// dedicated interiorApiClient (interior-os backend) instead of sky-lite's own
// `api` client. Follows the same `.then((res) => res.data)` convention as
// src/services/interiorProject.service.ts.
// =============================================================================

import interiorApiClient from '@/services/interiorApi.client';

export const interiorCrmService = {
  // Customers / Leads
  getCustomers: (params?: any) => interiorApiClient.get('/crm/customers', { params }).then((res) => res.data),
  getCustomerById: (customerId: string) =>
    interiorApiClient.get(`/crm/customers/${customerId}`).then((res) => res.data),
  getCustomerStats: () => interiorApiClient.get('/crm/customers/stats').then((res) => res.data),
  createCustomer: (data: any) => interiorApiClient.post('/crm/customers', data).then((res) => res.data),
  updateCustomer: (customerId: string, data: any) =>
    interiorApiClient.patch(`/crm/customers/${customerId}`, data).then((res) => res.data),
  deleteCustomer: (customerId: string) =>
    interiorApiClient.delete(`/crm/customers/${customerId}`).then((res) => res.data),
  convertCustomer: (customerId: string, data?: any) =>
    interiorApiClient.post(`/crm/customers/${customerId}/convert`, data).then((res) => res.data),
  sendQuotationEmail: (customerId: string, data: { quotation: any; recipientEmail?: string }) =>
    interiorApiClient.post(`/crm/customers/${customerId}/send-quotation-email`, data).then((res) => res.data),

  // Drawing Share Links & Workflows
  generateShareLink: (
    customerId: string,
    data?: {
      expiresDays?: number | null;
      allowDownload?: boolean;
      includeRequirements?: boolean;
      regenerate?: boolean;
    }
  ) => interiorApiClient.post(`/crm/customers/${customerId}/share`, data).then((res) => res.data),
  revokeShareLink: (customerId: string) =>
    interiorApiClient.delete(`/crm/customers/${customerId}/share`, {}).then((res) => res.data),
  getPublicDrawingData: (token: string) =>
    interiorApiClient.get(`/public/crm/${token}`).then((res) => res.data),
  submitClientFeedback: (token: string, data: { drawingId?: string; action: 'client_approved' | 'client_changes_requested'; clientFeedback?: string }) =>
    interiorApiClient.post(`/public/crm/${token}/feedback`, data).then((res) => res.data),
  approveDrawing: (customerId: string, drawingId: string, data: { action: 'approve' | 'reject'; versionNumber?: number; internalNotes?: string; assignedReviewer?: string }) =>
    interiorApiClient.post(`/crm/customers/${customerId}/drawings/${drawingId}/approve`, data).then((res) => res.data),
  sendDrawingForApproval: (customerId: string, drawingId: string, data: { assignedReviewer?: string; assignedReviewerName?: string; notes?: string; versionNumber?: number }) =>
    interiorApiClient.post(`/crm/customers/${customerId}/drawings/${drawingId}/send-for-approval`, data).then((res) => res.data),
  uploadDrawingVersion: (customerId: string, drawingId: string, data: { name: string; url: string; fileType?: string; category?: string; internalNotes?: string; assignedReviewer?: string; assignedReviewerName?: string }) =>
    interiorApiClient.post(`/crm/customers/${customerId}/drawings/${drawingId}/version`, data).then((res) => res.data),
  deleteDrawing: (customerId: string, drawingId: string) =>
    interiorApiClient.delete(`/crm/customers/${customerId}/drawings/${drawingId}`).then((res) => res.data),

  // Activities
  getActivities: (params?: string | Record<string, any>) => {
    const query = typeof params === 'string' ? { customerId: params } : params;
    return interiorApiClient.get('/crm/activities', { params: query }).then((res) => res.data);
  },
  createActivity: (data: any) => interiorApiClient.post('/crm/activities', data).then((res) => res.data),
  updateActivity: (activityId: string, data: any) =>
    interiorApiClient.patch(`/crm/activities/${activityId}`, data).then((res) => res.data),
  getPendingActivities: () => interiorApiClient.get('/crm/activities/pending').then((res) => res.data),

  // Org Users (for assignment dropdowns)
  getUsers: () => interiorApiClient.get('/users').then((res) => res.data),
};
