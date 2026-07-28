'use client';

import {
  FolderClosed,
  Building2,
  Calendar,
  Users,
  Crown,
  CheckCircle2,
  PauseCircle,
  ChevronRight,
} from 'lucide-react';

interface OrganizationCardProps {
  organization: {
    id: string;
    name: string;
    admin: string;
    email: string;
    members: number;
    projects: number;
    plan: string;
    status: 'Active' | 'Suspended';
    createdAt: string;
    expiryDate: string;
  };

  onManagePlan?: () => void;
}

export default function OrganizationCard({
  organization,
  onManagePlan,
}: OrganizationCardProps) {
  const active = organization.status === 'Active';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all">

      {/* Header */}

      <div className="p-4 border-b border-slate-100">

        <div className="flex justify-between items-start gap-4">

          <div className="flex gap-3 flex-1 min-w-0">

            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">

              <Building2 className="w-8 h-8 text-blue-600" />

            </div>

            <div className="flex-1 min-w-0">

              <h2 className="text-base font-bold text-slate-900 truncate" 
              title={organization.name}>
                {organization.name}
              </h2>

              <p className="text-slate-500 mt-1 truncate"
                title={organization.email}>
                {organization.email}
              </p>

            </div>

          </div>


           <span className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700">
              {organization.plan}
           </span>

          </div>

      </div>

      {/* Details */}

      <div className="p-4 space-y-5">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3 text-slate-600">

            <Users className="w-5 h-5 text-blue-600" />

            <span>
              {organization.members} Members
            </span>

          </div>
                

          <div className="flex items-center gap-3 text-slate-600">
            <FolderClosed className="w-5 h-5 text-indigo-600" />
            <span>
              {organization.projects} Projects
            </span>


          </div>

        </div>

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3 text-slate-600">

            <Calendar className="w-5 h-5 text-indigo-600" />

            <span>
              Joined :{' '}
              {new Date(organization.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                })}
            </span>

          </div>

          <div className="flex items-center gap-2">

            {active ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-medium">
                  Active
                </span>
              </>
            ) : (
              <>
                <PauseCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-600 font-medium">
                  Suspended
                </span>
              </>
            )}

          </div>

        </div>

      </div>

      {/* Footer */}

      <div className="border-t border-slate-100 p-5">

        <button
          onClick={onManagePlan}
          className="w-full bg-[#33206F] hover:bg-[#29175c] text-white rounded-2xl py-2 font-semibold flex items-center justify-center gap-2 transition"
        >
          Manage Plan

          <ChevronRight className="w-5 h-5" />

        </button>

      </div>

      {/*
      ===========================================

      API Integration

      GET /superadmin/organizations

      {
        id,
        name,
        admin,
        email,
        members,
        plan,
        status,
        expiryDate
      }

      onManagePlan()

      Navigate to

      /superadmin/organizations/[id]

      ===========================================
      */}

    </div>
  );
}                  