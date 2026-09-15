// =============================================================================
// Sky-Lite Web — Interior-OS Audit API Service
// =============================================================================

import interiorApiClient from '@/services/interiorApi.client';

export interface AuditUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  systemRole?: string;
}

export interface AuditLogItem {
  _id: string;
  organizationId: string;
  userId?: AuditUser | string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'logout' | 'export' | 'upload' | 'download';
  entity: string;
  entityId?: string;
  entityName?: string;
  description?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  uniqueUsersCount: number;
  actionsMap: Record<string, number>;
  criticalActionsCount: number;
  securityEventsCount: number;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditApiResponse {
  success: boolean;
  data: {
    logs: AuditLogItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    stats: AuditStats;
  };
  message?: string;
}

export const interiorAuditService = {
  // Fetch paginated audit logs with optional filters and summary stats
  getAuditLogs: (params?: GetAuditLogsParams): Promise<AuditApiResponse> =>
    interiorApiClient.get('/audit', { params }).then((res) => res.data),

  // Record custom client-side audit event
  recordAuditEvent: (data: {
    action: string;
    entity: string;
    entityId?: string;
    entityName?: string;
    description?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }) => interiorApiClient.post('/audit', data).then((res) => res.data),
};
