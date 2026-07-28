import { Project, User, Organization } from '@/types';
export interface MilestoneTask {
  _id?: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string | User;
  completionNote?: string;
}

export interface Milestone {
  _id: string;
  name: string;
  description?: string;
  dueDate?: string;
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
  project: string | Project;
  organization: string | Organization;
  createdBy: string | User;
  tasks: MilestoneTask[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
