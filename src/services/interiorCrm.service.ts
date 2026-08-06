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
  createCustomer: (data: any) => interiorApiClient.post('/crm/customers', data).then((res) => res.data),
  updateCustomer: (customerId: string, data: any) =>
    interiorApiClient.patch(`/crm/customers/${customerId}`, data).then((res) => res.data),
  deleteCustomer: (customerId: string) =>
    interiorApiClient.delete(`/crm/customers/${customerId}`).then((res) => res.data),
  convertCustomer: (customerId: string, data?: any) =>
    interiorApiClient.post(`/crm/customers/${customerId}/convert`, data).then((res) => res.data),

  // Activities
  getActivities: (customerId: string) =>
    interiorApiClient.get('/crm/activities', { params: { customerId } }).then((res) => res.data),
  createActivity: (data: any) => interiorApiClient.post('/crm/activities', data).then((res) => res.data),
  getPendingActivities: () => interiorApiClient.get('/crm/activities/pending').then((res) => res.data),

  // Org Users (for assignment dropdowns)
  getUsers: () => interiorApiClient.get('/users').then((res) => res.data),
};
