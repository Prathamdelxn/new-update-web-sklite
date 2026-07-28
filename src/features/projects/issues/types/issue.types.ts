import { Project, User, Organization } from '@/types';
export interface Issue {
  _id: string;
  title: string;
  description: string;
  status: "Draft" | "Open" | "In Progress" | "Resolved" | "Escalated" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  category: "Technical" | "Resource" | "Financial" | "Site" | "Client" | "Third Party" | "Other";
  project: string | Project;
  organization: string | Organization;
  createdBy: string | User;
  assignedTo?: string | User;
  escalationLevel: number;
  resolutionDate?: string;
  resolutionDetails?: string;
  resolutionImage?: string;
  images: string[];
  history: IssueHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueHistory {
  updatedBy: string | User;
  action: string;
  details: string;
  timestamp: string;
}

export interface Snag {
  _id: string;
  title: string;
  description: string;
  status: "Draft" | "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  project: string | Project;
  organization: string | Organization;
  createdBy: string | User;
  assignedTo?: string | User;
  resolutionDate?: string;
  resolutionDetails?: string;
  resolutionImage?: string;
  images: string[];
  history: IssueHistory[];
  createdAt: string;
  updatedAt: string;
}
