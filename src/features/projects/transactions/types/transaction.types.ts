import { Project, User, Organization, MaterialPurchase } from '@/types';
export interface Transaction {
  _id: string;
  project: string | Project;
  organization: string | Organization;
  createdBy: string | User;
  createdByName: string;
  type: "Incoming" | "Outgoing" | "Debit Note" | "Purchase Payment";
  amount: number;
  date: string;
  paymentMethod: "Cash" | "Bank Transfer" | "Cheque" | "RTGS/NEFT" | "UPI" | "Adjustment" | "Other";
  partyName: string;
  referenceNumber?: string;
  category?: string;
  description?: string;
  linkedPurchase?: string | MaterialPurchase;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}
