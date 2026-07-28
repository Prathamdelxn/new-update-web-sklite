import { Project, User, Organization } from '@/types';
export interface SiteSurvey {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  surveyedBy: string | User;
  surveyedByName: string;
  accessibility?: string;
  powerAvailability?: string;
  waterAvailability?: string;
  terrainType?: string;
  notes?: string;
  attachments: string[];
  budgetRecommendation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkProgress {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  description: string;
  progressPercent: number;
  photos: string[];
  loggedBy: string | User;
  loggedByName: string;
  date: string;
  createdAt: string;
}

export interface PlanFolder {
  _id: string;
  name: string;
  project: string | Project;
  organization: string | Organization;
  documents: PlanDocument[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDocument {
  _id?: string;
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
