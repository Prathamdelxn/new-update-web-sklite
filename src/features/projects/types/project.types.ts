import { User, Organization } from '@/types';
export interface Project {
  _id: string;
  name: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status: "Initialized" | "Planning" | "Site Survey" | "Ongoing" | "Under Snagging" | "Snagging Completed" | "Completed" | "Pending Handover" | "Handover Rejected" | "Handover Completed" | "On Hold" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Urgent";
  organization: string | Organization;
  createdBy: string | User;
  updatedBy?: string | User;
  members: (string | User)[];
  startDate?: string;
  endDate?: string;
  category?: string | { _id: string; name: string };
  projectType: 'Construction' | 'Interior';
  needSiteSurvey: boolean;
  currency?: string;
  siteSurveyor?: string | User;
  surveyStatus?: string;
  snaggedBy?: string | User;
  documents: ProjectDocument[];
  budgetHistory: BudgetHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  status: "Pending" | "Approved" | "Rejected";
  uploadedAt: string;
  uploadedBy: {
    user: string;
    name: string;
  };
}

export interface BudgetHistory {
  amount: number;
  reason: string;
  approvalStatus: "Pending" | "Approved" | "Rejected";
  updatedBy: string;
  updatedByName: string;
  timestamp: string;
}
