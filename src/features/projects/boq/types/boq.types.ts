import { Project, User } from '@/types';
export interface BOQItem {
  _id: string;
  project: string | Project;
  groupName: string;
  itemNumber?: string;
  itemDescription: string;
  unit?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  remark?: string;
  version: number;
  isLatest: boolean;
  historyId?: string;
  createdBy?: string | User;
  createdByName?: string;
  status: "Draft" | "Pending" | "Approved" | "Rejected";
  approvedBy?: string | User;
  approvedByName?: string;
  approvedAt?: string;
  requestedApprover?: string | User;
  requestedApproverName?: string;
  createdAt: string;
}
