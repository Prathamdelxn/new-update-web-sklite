// =============================================================================
// Sky-Lite Web — Interior-OS Project API Service
// Port of interior-os-frontend/src/services/project.service.ts, using the
// dedicated interiorApiClient instead of that app's own apiClient.
// =============================================================================

import interiorApiClient from '@/services/interiorApi.client';

export const interiorProjectService = {
  // Projects
  getProjects: (params?: any) => interiorApiClient.get('/projects', { params }).then((res) => res.data),
  getTemplates: () => interiorApiClient.get('/templates').then((res) => res.data),
  createProject: (data: any) => interiorApiClient.post('/projects', data).then((res) => res.data),
  getProjectDetails: (projectId: string) => interiorApiClient.get(`/projects/${projectId}`).then((res) => res.data),
  updateProject: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}`, data).then((res) => res.data),
  deleteProject: (projectId: string) => interiorApiClient.delete(`/projects/${projectId}`).then((res) => res.data),

  // Members
  getProjectMembers: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/members`).then((res) => res.data),
  addProjectMember: (projectId: string, data: { userId: string; projectRole: string }) =>
    interiorApiClient.post(`/projects/${projectId}/members`, data).then((res) => res.data),
  inviteProjectMember: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/members/invite`, data).then((res) => res.data),
  updateProjectMember: (projectId: string, memberId: string, data: any) =>
    interiorApiClient.patch(`/projects/${projectId}/members/${memberId}`, data).then((res) => res.data),
  deleteProjectMember: (projectId: string, memberId: string) =>
    interiorApiClient.delete(`/projects/${projectId}/members/${memberId}`).then((res) => res.data),

  // WBS
  getWbs: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/wbs`).then((res) => res.data),
  addWbsNode: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/wbs`, data).then((res) => res.data),
  updateWbsNode: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/wbs`, data).then((res) => res.data),
  deleteWbsNode: (projectId: string, type: string, id: string) =>
    interiorApiClient.delete(`/projects/${projectId}/wbs`, { params: { type, id } }).then((res) => res.data),

  // Tasks
  getTasks: (projectId: string, params?: any) => interiorApiClient.get(`/projects/${projectId}/tasks`, { params }).then((res) => res.data),
  createTask: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/tasks`, data).then((res) => res.data),
  updateTask: (projectId: string, taskId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/tasks/${taskId}`, data).then((res) => res.data),
  deleteTask: (projectId: string, taskId: string) => interiorApiClient.delete(`/projects/${projectId}/tasks/${taskId}`).then((res) => res.data),
  getTaskComments: (projectId: string, taskId: string) => interiorApiClient.get(`/projects/${projectId}/tasks/${taskId}/comments`).then((res) => res.data),
  createTaskComment: (projectId: string, taskId: string, data: any) =>
    interiorApiClient.post(`/projects/${projectId}/tasks/${taskId}/comments`, data).then((res) => res.data),

  // Milestones
  getMilestones: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/milestones`).then((res) => res.data),
  createMilestone: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/milestones`, data).then((res) => res.data),
  updateMilestone: (projectId: string, milestoneId: string, data: any) =>
    interiorApiClient.put(`/projects/${projectId}/milestones/${milestoneId}`, data).then((res) => res.data),
  deleteMilestone: (projectId: string, milestoneId: string) =>
    interiorApiClient.delete(`/projects/${projectId}/milestones/${milestoneId}`).then((res) => res.data),
  logMilestoneDelay: (projectId: string, milestoneId: string, data: any) =>
    interiorApiClient.post(`/projects/${projectId}/milestones/${milestoneId}/delays`, data).then((res) => res.data),

  // Dashboard
  getDashboardMetrics: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/dashboard`).then((res) => res.data),

  // DPR
  getDprs: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/dpr`).then((res) => res.data),
  createDpr: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/dpr`, data).then((res) => res.data),
  deleteDpr: (projectId: string, dprId: string) => interiorApiClient.delete(`/projects/${projectId}/dpr/${dprId}`).then((res) => res.data),

  // Weekly Reports
  getWeeklyReports: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/weekly-reports`).then((res) => res.data),
  createWeeklyReport: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/weekly-reports`, data).then((res) => res.data),
  deleteWeeklyReport: (projectId: string, reportId: string) => interiorApiClient.delete(`/projects/${projectId}/weekly-reports/${reportId}`).then((res) => res.data),

  // Purchase Orders / Procurement
  getPurchaseOrders: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/procurement`).then((res) => res.data),
  createPurchaseOrder: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/procurement`, data).then((res) => res.data),
  updatePurchaseOrder: (projectId: string, poId: string, data: any) =>
    interiorApiClient.put(`/projects/${projectId}/procurement/${poId}`, data).then((res) => res.data),
  deletePurchaseOrder: (projectId: string, poId: string) =>
    interiorApiClient.delete(`/projects/${projectId}/procurement/${poId}`).then((res) => res.data),

  // Vendors
  getVendors: () => interiorApiClient.get(`/vendors`).then((res) => res.data),
  createVendor: (data: any) => interiorApiClient.post('/vendors', data).then((res) => res.data),
  updateVendor: (vendorId: string, data: any) =>
    interiorApiClient.patch(`/vendors/${vendorId}`, data).then((res) => res.data),
  deleteVendor: (vendorId: string) =>
    interiorApiClient.delete(`/vendors/${vendorId}`).then((res) => res.data),

  // Inventory
  getInventory: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/inventory`).then((res) => res.data),
  updateInventoryMaterial: (projectId: string, materialId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/inventory/${materialId}`, data).then((res) => res.data),
  deleteInventoryMaterial: (projectId: string, materialId: string) => interiorApiClient.delete(`/projects/${projectId}/inventory/${materialId}`).then((res) => res.data),
  logInventoryInstall: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/inventory`, data).then((res) => res.data),
  createInventoryMaterial: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/inventory`, { ...data, action: 'create_material' }).then((res) => res.data),

  // Drawings
  getDrawings: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/drawings`).then((res) => res.data),
  createDrawing: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/drawings`, data).then((res) => res.data),
  updateDrawing: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/drawings`, data).then((res) => res.data),
  deleteDrawing: (projectId: string, drawingId: string) => interiorApiClient.delete(`/projects/${projectId}/drawings?drawingId=${drawingId}`).then((res) => res.data),
  uploadDrawingFile: (projectId: string, formData: FormData) =>
    interiorApiClient.post(`/projects/${projectId}/drawings/upload`, formData).then((res) => res.data),

  // RFIs
  getRfis: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/rfis`).then((res) => res.data),
  createRfi: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/rfis`, data).then((res) => res.data),
  updateRfi: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/rfis`, data).then((res) => res.data),

  // Risks
  getRisks: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/risks`).then((res) => res.data),
  createRisk: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/risks`, data).then((res) => res.data),
  updateRisk: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/risks`, data).then((res) => res.data),
  deleteRisk: (projectId: string, riskId: string) => interiorApiClient.delete(`/projects/${projectId}/risks?riskId=${riskId}`).then((res) => res.data),

  // Snags
  getSnags: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/snags`).then((res) => res.data),
  createSnag: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/snags`, data).then((res) => res.data),
  updateSnag: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/snags`, data).then((res) => res.data),
  deleteSnag: (projectId: string, snagId: string) => interiorApiClient.delete(`/projects/${projectId}/snags?snagId=${snagId}`).then((res) => res.data),

  // NCRs
  getNcrs: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/ncrs`).then((res) => res.data),
  createNcr: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/ncrs`, data).then((res) => res.data),
  updateNcr: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/ncrs`, data).then((res) => res.data),
  deleteNcr: (projectId: string, ncrId: string) => interiorApiClient.delete(`/projects/${projectId}/ncrs?ncrId=${ncrId}`).then((res) => res.data),

  // Utilities
  getUtilities: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/utilities`).then((res) => res.data),
  updateUtility: (projectId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/utilities`, data).then((res) => res.data),

  // Photos
  getPhotos: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/photos`).then((res) => res.data),
  createPhoto: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/photos`, data).then((res) => res.data),
  uploadPhotoFile: (projectId: string, formData: FormData) =>
    interiorApiClient.post(`/projects/${projectId}/photos/upload`, formData).then((res) => res.data),

  // Handover
  getHandover: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/handover`).then((res) => res.data),
  updateHandover: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/handover`, data).then((res) => res.data),
  uploadHandoverDocumentFile: (projectId: string, formData: FormData) =>
    interiorApiClient.post(`/projects/${projectId}/handover/upload`, formData).then((res) => res.data),

  // BOQ
  getBoqList: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/boq`).then((res) => res.data),
  getBoqDetail: (projectId: string, boqId: string) => interiorApiClient.get(`/projects/${projectId}/boq/${boqId}`).then((res) => res.data),
  createBoq: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/boq`, data).then((res) => res.data),
  updateBoq: (projectId: string, boqId: string, data: any) => interiorApiClient.put(`/projects/${projectId}/boq/${boqId}`, data).then((res) => res.data),
  deleteBoq: (projectId: string, boqId: string) => interiorApiClient.delete(`/projects/${projectId}/boq/${boqId}`).then((res) => res.data),
  addBoqItems: (projectId: string, boqId: string, items: any[]) =>
    interiorApiClient.post(`/projects/${projectId}/boq/${boqId}/items`, { items }).then((res) => res.data),
  updateBoqItems: (projectId: string, boqId: string, updates: any[]) =>
    interiorApiClient.put(`/projects/${projectId}/boq/${boqId}/items`, { updates }).then((res) => res.data),
  boqApprovalAction: (projectId: string, boqId: string, data: any) =>
    interiorApiClient.post(`/projects/${projectId}/boq/${boqId}/approve`, data).then((res) => res.data),
  reviseBoq: (projectId: string, boqId: string) => interiorApiClient.post(`/projects/${projectId}/boq/${boqId}/revise`).then((res) => res.data),
  importBoqExcel: (projectId: string, formData: FormData) =>
    interiorApiClient.post(`/projects/${projectId}/boq/import`, formData).then((res) => res.data),
  getBoqVsActual: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/boq/actual`).then((res) => res.data),

  // Change Requests
  getChangeRequests: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/change-requests`).then((res) => res.data),
  getChangeRequestDetail: (projectId: string, crId: string) => interiorApiClient.get(`/projects/${projectId}/change-requests/${crId}`).then((res) => res.data),
  createChangeRequest: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/change-requests`, data).then((res) => res.data),
  updateChangeRequest: (projectId: string, crId: string, data: any) =>
    interiorApiClient.put(`/projects/${projectId}/change-requests/${crId}`, data).then((res) => res.data),
  approveChangeRequest: (projectId: string, crId: string) => interiorApiClient.post(`/projects/${projectId}/change-requests/${crId}/approve`).then((res) => res.data),

  // Variation Orders
  getVariationOrders: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/variation-orders`).then((res) => res.data),
  getVariationOrderDetail: (projectId: string, voId: string) => interiorApiClient.get(`/projects/${projectId}/variation-orders/${voId}`).then((res) => res.data),
  createVariationOrder: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/variation-orders`, data).then((res) => res.data),
  updateVariationOrder: (projectId: string, voId: string, data: any) =>
    interiorApiClient.put(`/projects/${projectId}/variation-orders/${voId}`, data).then((res) => res.data),
  approveVariationOrder: (projectId: string, voId: string) => interiorApiClient.post(`/projects/${projectId}/variation-orders/${voId}/approve`).then((res) => res.data),

  // MOM
  getMoms: (projectId: string) => interiorApiClient.get(`/projects/${projectId}/mom`).then((res) => res.data),
  createMom: (projectId: string, data: any) => interiorApiClient.post(`/projects/${projectId}/mom`, data).then((res) => res.data),

  // Payments (Incoming / Outgoing / Debit Notes)
  getPayments: (projectId: string, type?: 'incoming' | 'outgoing' | 'debit_note') =>
    interiorApiClient
      .get(`/projects/${projectId}/payments`, { params: type ? { type } : {} })
      .then((res) => res.data),
  createPayment: (projectId: string, data: any) =>
    interiorApiClient.post(`/projects/${projectId}/payments`, data).then((res) => res.data),
  deletePayment: (projectId: string, paymentId: string) =>
    interiorApiClient.delete(`/projects/${projectId}/payments/${paymentId}`).then((res) => res.data),

  // Users & Roles — org-wide user list with full project assignment details
  getUsersWithProjects: () =>
    interiorApiClient.get('/users/with-projects').then((res) => res.data),

  // All users in the organisation (for member picker)
  getOrgUsers: () =>
    interiorApiClient.get('/users').then((res) => res.data),

  // Create a new user (org admin only)
  createUser: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    phone?: string;
    designation?: string;
    department?: string;
    systemRole?: string;
  }) => interiorApiClient.post('/users', data).then((res) => res.data),

  // Update a user (org admin only)
  updateUser: (
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      phone?: string;
      designation?: string;
      department?: string;
      systemRole?: string;
      status?: string;
    }
  ) => interiorApiClient.patch(`/users/${userId}`, data).then((res) => res.data),

  // Delete a user (org admin only)
  deleteUser: (userId: string) =>
    interiorApiClient.delete(`/users/${userId}`).then((res) => res.data),
};
