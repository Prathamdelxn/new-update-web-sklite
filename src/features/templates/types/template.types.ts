import { User, Organization } from '@/types';
export interface Template {
  _id: string;
  name: string;
  description?: string;
  category?: string | TemplateCategory;
  organization: string | Organization;
  createdBy: string | User;
  budgetMin?: number;
  budgetMax?: number;
  boqItems: TemplateBOQItem[];
  images: string[];
  status: "Draft" | "Active" | "Archived";
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBOQItem {
  groupName: string;
  itemDescription: string;
  unit?: string;
  quantity: number;
  unitCost: number;
}

export interface TemplateCategory {
  _id: string;
  name: string;
  description?: string;
  organization: string | Organization;
  createdAt: string;
  updatedAt: string;
}
