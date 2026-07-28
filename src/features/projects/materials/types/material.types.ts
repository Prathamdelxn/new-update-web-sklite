import { Project, User, Organization } from '@/types';
export interface Material {
  _id: string;
  name: string;
  unit: string;
  project: string | Project;
  organization: string | Organization;
  totalReceived: number;
  totalConsumed: number;
  balance: number;
  logs: MaterialLog[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialLog {
  type: "Request" | "Received" | "Used" | "Purchase" | "In" | "Out";
  quantity: number;
  date: string;
  note?: string;
  updatedBy?: string | User;
  updatedByName?: string;
}

export interface MaterialRequest {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  requestedBy: string | User;
  requestedByName: string;
  items: MaterialRequestItem[];
  commonNote?: string;
  status: "Pending" | "Approved" | "Rejected" | "Partially Approved";
  approvedBy?: string | User;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialRequestItem {
  materialName: string;
  quantity: number;
  unit: string;
  note?: string;
  approvedQty?: number;
  status?: "Pending" | "Approved" | "Rejected";
}

export interface MaterialPurchase {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  vendorName: string;
  poNumber?: string;
  items: PurchaseItem[];
  grandTotal: number;
  advancePaid?: number;
  paymentStatus: "Unpaid" | "Partial" | "Paid";
  commonNote?: string;
  createdBy: string | User;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface MaterialReceipt {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  purchase?: string | MaterialPurchase;
  challanNumber?: string;
  invoiceNumber?: string;
  items: ReceiptItem[];
  receivedBy: string | User;
  receivedByName: string;
  status: "Pending" | "Verified" | "Rejected";
  verifiedBy?: string | User;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface ReceiptItem {
  materialName: string;
  expectedQty: number;
  receivedQty: number;
  unit: string;
}

export interface MaterialUsage {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  items: UsageItem[];
  location?: string;
  task?: string;
  usedBy: string | User;
  usedByName: string;
  status: "Pending" | "Verified" | "Rejected";
  verifiedBy?: string | User;
  createdAt: string;
}

export interface UsageItem {
  materialName: string;
  quantity: number;
  unit: string;
}
