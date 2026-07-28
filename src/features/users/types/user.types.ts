
export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  role?: Role;
  organization?: string;
  projects?: string[];
  status: "Active" | "Inactive" | "Suspended" | "Pending";
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  _id: string;
  name: string;
  organization: string;
  permissions: string[];
  description?: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  owner: string | User;
  createdAt: string;
  updatedAt: string;
}
