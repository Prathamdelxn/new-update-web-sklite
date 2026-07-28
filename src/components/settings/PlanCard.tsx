'use client';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';



interface PlanCardProps {
  title: string;
  color: string;
  current?: boolean;
  buttonText?: string;
  features: string[];
}

export default function PlanCard({
  
  title,
  color,
  current = false,
  buttonText = 'Request This Plan',
  features,
}: PlanCardProps) {

  
const toast = useToast();

const [loading, setLoading] = useState(false);
const [pending, setPending] = useState(false);


  // Fetch current request status
  useEffect(() => {
  fetchRequestStatus();
  }, [title]);

  // const fetchRequestStatus = async () => {
  //   try {
  //     const { data } = await api.get('/organization/plan-request');

  //     if (
  //       data &&
  //       data.status === 'Pending' &&
  //       data.requestedPlan === title
  //     ) {
  //       setPending(true);
  //     } else {
  //       setPending(false);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

const fetchRequestStatus = async () => {
  try {
    const { data } = await api.get('/organization/plan-request');

    if (
      data?.status === 'Pending' &&
      data?.requestedPlan === title
    ) {
      setPending(true);
    } else {
      setPending(false);
    }
  } catch (error) {
    console.error(error);
    setPending(false);
  }
};





const handlePlanRequest = async () => {
  try {
    setLoading(true);

    await api.post('/organization/plan-request', {
      requestedPlan: title,
      note: '',
    });

    // Immediately update button
    setPending(true);

    toast.success(`${title} plan request submitted successfully.`);
  } catch (error: any) {
    console.error(error);

    // If a pending request already exists
    if (error?.response?.status === 409) {
      setPending(true);
      toast.success('Request is already pending.');
      return;
    }

    toast.error(
      error?.response?.data?.message ||
      'Failed to submit plan request.'
    );
  } finally {
    setLoading(false);
  }
};




  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">

      <div
        className={`${color} text-white px-6 py-5 flex justify-between items-center`}
      >
        <h2 className="text-xl font-bold">
          {title}
        </h2>

        {current && (
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs">
            Current
          </span>
        )}
      </div>

      <div className="p-6">

        <div className="space-y-4">

          {features.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>

              <span>{item}</span>
            </div>
          ))}

        </div>

        {!current && (
          <button
              onClick={handlePlanRequest}
              disabled={loading || pending}
              className={`w-full mt-8 ${color} text-white rounded-xl py-3 font-semibold transition ${
              loading || pending
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:opacity-90'
              }`}
          >
            {loading
            ? 'Requesting...'
            : pending
            ? 'Request Pending'
            : buttonText}
          </button>
        )}

      </div>

    </div>
  );
}