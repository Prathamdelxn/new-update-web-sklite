import { Project, User, Organization } from '@/types';
export interface Risk {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  title: string;
  category: "Logistics" | "Resources" | "Environmental" | "Legal" | "Safety" | "Financial" | "Technical";
  description?: string;
  impact: "Low" | "Medium" | "High" | "Very High";
  probability: "Low" | "Medium" | "High";
  status: "Critical" | "Active" | "Monitored" | "Resolved";
  mitigationProgress: number;
  owner?: string | User;
  history: RiskHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface RiskHistory {
  updatedBy: string | User;
  note: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}
