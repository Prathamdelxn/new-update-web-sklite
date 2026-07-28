'use client';

import {
  Building2,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Crown,
} from 'lucide-react';
import PlanRequestActionModal from './PlanRequestActionModal';
import { useState } from 'react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface PlanRequest {
  _id: string;
  organization: string;
  orgName: string;
  currentPlan: string;
  requestedPlan: string;
  requestedByName: string;
  createdAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface Props {
  request: PlanRequest;
  onApprove?: () => void;
  onReject?: () => void;
}

interface PlanRequestCardProps {
  request: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}


export default function PlanRequestCard({
  request,
  onApprove,
  onReject,
}: PlanRequestCardProps) {
  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'silver':
        return 'bg-slate-100 text-slate-700';

      case 'gold':
        return 'bg-yellow-100 text-yellow-700';

      case 'platinum':
        return 'bg-purple-100 text-purple-700';

      default:
        return 'bg-blue-100 text-blue-700';
    }
  };


  


const [actionModal, setActionModal] = useState<
  'approve' | 'reject' | null
>(null);


const toast = useToast();



const handleAction = async(note:string)=>{

  try{


    await api.patch(
      `/superadmin/plan-requests/${request._id}`,
      {
         action:
         actionModal === 'approve'
         ? 'Approved'
         : 'Rejected',

         note
      }
    );


    toast.success(
      actionModal === 'approve'
      ? 'Plan approved successfully'
      : 'Plan rejected successfully'
    );


    setActionModal(null);


    window.location.reload();


  }
  catch(error:any){

    toast.error(
      error?.response?.data?.message ||
      'Action failed'
    );

  }

};

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition">

      {/* Header */}

      <div className="border-b border-slate-100 p-6">

        <div className="flex justify-between items-start">

          <div className="flex gap-4">

            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

              <Building2 className="w-7 h-7 text-blue-600" />

            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-900">
                {request.orgName}
              </h2>

              <p className="text-slate-500 mt-1">
                Requested by {request.requestedByName}
              </p>

            </div>

          </div>

          <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
            {request.status}
          </span>

        </div>

      </div>

      {/* Body */}

      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-slate-500 mb-2">
              Current Plan
            </p>

            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getPlanColor(
                request.currentPlan
              )}`}
            >
              {request.currentPlan}
            </span>

          </div>

          <ArrowRight className="w-6 h-6 text-slate-400" />

          <div className="text-right">

            <p className="text-sm text-slate-500 mb-2">
              Requested Plan
            </p>

            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getPlanColor(
                request.requestedPlan
              )}`}
            >
              {request.requestedPlan}
            </span>

          </div>

        </div>

        <div className="flex items-center gap-3 text-slate-500">

          <Calendar className="w-5 h-5" />

          <span>
            {new Date(request.createdAt).toLocaleDateString()}
          </span>

        </div>

      </div>

      {/* Footer */}

      {request.status === 'Pending' && (
        <div className="border-t border-slate-100 p-6">

          <div className="grid grid-cols-2 gap-4">

           <button

            onClick={()=>setActionModal('reject')}

            className="px-5 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">Reject</button>

            <button onClick={()=>setActionModal('approve')} className=" px-5 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 " > Approve</button>

          </div>

        </div>
      )}

      {request.status !== 'Pending' && (
        <div className="border-t border-slate-100 p-6">

          <div className="flex items-center justify-center gap-3 text-slate-500">

            <Crown className="w-5 h-5" />

            Request has already been {request.status.toLowerCase()}.

          </div>

        </div>
      )}

      <PlanRequestActionModal

open={!!actionModal}

type={actionModal || 'approve'}

request={request}

onClose={()=>{
  setActionModal(null);
}}

onConfirm={handleAction}

/>

      {/*
      =======================================================

      Backend Integration

      GET

      /superadmin/plan-requests

      {
        _id,
        orgName,
        currentPlan,
        requestedPlan,
        requestedByName,
        createdAt,
        status
      }

      ------------------------------------

      Approve Button

      PATCH

      /superadmin/plan-requests/:id/approve

      ------------------------------------

      Reject Button

      PATCH

      /superadmin/plan-requests/:id/reject

      ------------------------------------

      Refresh list after success.

      =======================================================
      */}

    </div>
    



  );
}