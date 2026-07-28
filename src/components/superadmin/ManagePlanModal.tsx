'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  organization: any;
  onClose: () => void;
  onSuccess: () => void;
};

const plans = ['Silver', 'Gold', 'Platinum'];

const statuses = ['Active', 'Trial', 'Suspended'];

export default function ManagePlanModal({
  open,
  organization,
  onClose,
  onSuccess,
}: Props) {
  const [plan, setPlan] = useState('Silver');
  const [status, setStatus] = useState('Active');

  const [trialEndsAt, setTrialEndsAt] = useState('');

  const [maxUsers, setMaxUsers] = useState('');

  const [maxProjects, setMaxProjects] = useState('');

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!organization) return;

    setPlan(organization.subscription?.plan || 'Silver');

    setStatus(organization.subscription?.status || 'Active');

    setTrialEndsAt(
      organization.subscription?.trialEndsAt
        ? new Date(organization.subscription.trialEndsAt)
            .toISOString()
            .split('T')[0]
        : ''
    );

    setMaxUsers(
      organization.subscription?.overrides?.maxUsers?.toString() || ''
    );

    setMaxProjects(
      organization.subscription?.overrides?.maxProjects?.toString() || ''
    );
  }, [organization]);

  const handleSave = async () => {
  try {
    setLoading(true);

    await api.post('/superadmin/subscriptions', {
      orgId: organization.orgId,
      plan,
      status,
      trialEndsAt: trialEndsAt || null,

      overrides: {
        ...(maxUsers
          ? { maxUsers: Number(maxUsers) }
          : {}),

        ...(maxProjects
          ? { maxProjects: Number(maxProjects) }
          : {}),
      },

      reason: 'Updated by SuperAdmin',
    });

    toast.success('Subscription updated successfully.');

    onSuccess();

    onClose();
  } catch (error: any) {
    console.error(error);

    toast.error(
      error?.response?.data?.message ||
      'Failed to update subscription.'
    );
  } finally {
    setLoading(false);
  }
};

  if (!open || !organization) return null;

//   return (
//     <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        
// >
//       {/* Modal */}

//       <div className=" bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden">

//         {/* Mobile Handle */}

//         <div className="flex justify-center pt-3 md:hidden">
//           <div className="w-16 h-1.5 rounded-full bg-slate-200" />
//         </div>

//         <div className="p-8 overflow-y-auto max-h-[90vh]">

//           {/* Header */}

//           <div className="flex justify-between items-start">

//             <div>

//               <h2 className="text-3xl font-bold text-slate-900">
//                 {organization.orgName}
//               </h2>

//               <p className="text-slate-500 mt-2">
//                 {organization.owner?.email}
//               </p>

//             </div>

//             <button
//               onClick={onClose}
//               className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
//             >
//               <X className="w-6 h-6" />
//             </button>

//           </div>

//           {/* Subscription */}

//           <div className="mt-10">

//             <h3 className="uppercase text-sm tracking-widest font-bold text-slate-500 mb-5">
//               Subscription Plan
//             </h3>

//             <div className="grid grid-cols-3 gap-4">

//               {plans.map((item) => (
//                 <button
//                   key={item}
//                   onClick={() => setPlan(item)}
//                   className={`rounded-2xl border-2 py-6 text-lg font-semibold transition

//                   ${
//                     plan === item
//                       ? 'border-blue-600 bg-blue-50 text-blue-700'
//                       : 'border-slate-200 hover:border-blue-300'
//                   }
//                   `}
//                 >
//                   {item}
//                 </button>
//               ))}

//             </div>

//           </div>

//           {/* Status */}

//           <div className="mt-10">

//             <h3 className="uppercase text-sm tracking-widest font-bold text-slate-500 mb-5">
//               Account Status
//             </h3>

//             <div className="grid grid-cols-3 gap-4">

//               {statuses.map((item) => (
//                 <button
//                   key={item}
//                   onClick={() => setStatus(item)}
//                   className={`rounded-2xl border-2 py-6 text-lg font-semibold transition

//                   ${
//                     status === item
//                       ? item === 'Suspended'
//                         ? 'border-red-500 bg-red-50 text-red-600'
//                         : item === 'Trial'
//                         ? 'border-orange-500 bg-orange-50 text-orange-600'
//                         : 'border-green-500 bg-green-50 text-green-600'
//                       : 'border-slate-200'
//                   }
//                   `}
//                 >
//                   {item}
//                 </button>
//               ))}

//             </div>

//           </div>

//           {/* Trial Date */}

//           <div className="mt-10">

//             <h3 className="uppercase text-sm tracking-widest font-bold text-slate-500 mb-3">
//               Trial End Date
//             </h3>

//             <input
//               type="date"
//               value={trialEndsAt}
//               onChange={(e) => setTrialEndsAt(e.target.value)}
//               className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500"
//             />

//           </div>

//           {/* Override Limits */}

//           <div className="mt-10">

//             <h3 className="uppercase text-sm tracking-widest font-bold text-slate-500">
//               Override Limits
//             </h3>

//             <p className="text-slate-400 text-sm mb-5">
//               Leave blank to use the selected plan defaults.
//             </p>

//             <div className="grid md:grid-cols-2 gap-5">

//               <div>

//                 <label className="block font-medium mb-2">
//                   Max Users
//                 </label>

//                 <input
//                   type="number"
//                   value={maxUsers}
//                   onChange={(e) => setMaxUsers(e.target.value)}
//                   placeholder="Default"
//                   className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500"
//                 />

//               </div>

//               <div>

//                 <label className="block font-medium mb-2">
//                   Max Projects
//                 </label>

//                 <input
//                   type="number"
//                   value={maxProjects}
//                   onChange={(e) => setMaxProjects(e.target.value)}
//                   placeholder="Default"
//                   className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500"
//                 />

//               </div>

//             </div>

//           </div>

//           {/* Footer */}

//          <div className="mt-10 flex flex-col-reverse md:flex-row justify-end gap-4">

//           <button
//           onClick={onClose}
//           disabled={loading}
//           className="px-8 py-4 rounded-2xl border border-slate-300 font-semibold hover:bg-slate-50"
//          >
//           Cancel
//           </button>

//            <button
//            onClick={handleSave}
//             disabled={loading}
//            className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60"
//            >
//            {loading ? (
//             <>
//            <Loader2 className="w-5 h-5 animate-spin" />
//             Saving...
//            </>
//            ) : (
//            'Save Changes'
//          )}
//            </button>

//          </div>

//         </div>

//          </div>

//          </div>
//           );
           
return (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3">

    {/* Modal */}

    <div className="
      bg-white 
      w-full 
      max-w-xl 
      rounded-2xl 
      shadow-2xl
      overflow-hidden
    ">


      <div className="p-5">


        {/* Header */}

        <div className="flex justify-between items-start">


          <div>

            <h2 className="text-xl font-bold text-slate-900">
              {organization.orgName}
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              {organization.owner?.email}
            </p>

          </div>


          <button
            onClick={onClose}
            className="
              w-8
              h-8
              rounded-lg
              bg-slate-100
              hover:bg-slate-200
              flex
              items-center
              justify-center
            "
          >
            <X className="w-4 h-4" />
          </button>


        </div>





        {/* Subscription */}


        <div className="mt-5">


          <h3 className="
            text-xs
            tracking-wide
            font-bold
            text-slate-500
            mb-3
          ">
            SUBSCRIPTION PLAN
          </h3>



          <div className="grid grid-cols-3 gap-2">


            {plans.map((item)=>(

              <button

                key={item}

                onClick={()=>setPlan(item)}

                className={`
                  rounded-lg
                  border
                  py-3
                  text-sm
                  font-semibold
                  transition

                  ${
                    plan === item
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-blue-300'
                  }
                `}

              >

                {item}

              </button>

            ))}


          </div>


        </div>






        {/* Status */}


        <div className="mt-5">


          <h3 className="
            text-xs
            tracking-wide
            font-bold
            text-slate-500
            mb-3
          ">
            ACCOUNT STATUS
          </h3>



          <div className="grid grid-cols-3 gap-2">


            {statuses.map((item)=>(

              <button

                key={item}

                onClick={()=>setStatus(item)}

                className={`
                  rounded-lg
                  border
                  py-3
                  text-sm
                  font-semibold
                  transition

                  ${
                    status === item

                    ? item === 'Suspended'
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : item === 'Trial'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-green-500 bg-green-50 text-green-600'

                    : 'border-slate-200'
                  }
                `}

              >

                {item}

              </button>

            ))}


          </div>


        </div>







        {/* Trial Date */}


        <div className="mt-5">


          <h3 className="
            text-xs
            font-bold
            text-slate-500
            mb-2
          ">
            TRIAL END DATE
          </h3>



          <input

            type="date"

            value={trialEndsAt}

            onChange={(e)=>setTrialEndsAt(e.target.value)}

            className="
              w-full
              rounded-lg
              border
              border-slate-300
              px-3
              py-2
              text-sm
              outline-none
              focus:ring-2
              focus:ring-blue-500
            "

          />


        </div>







        {/* Override Limits */}


        <div className="mt-5">


          <h3 className="
            text-xs
            font-bold
            text-slate-500
          ">
            OVERRIDE LIMITS
          </h3>


          <p className="text-xs text-slate-400 mb-3">
            Leave blank to use plan defaults.
          </p>



          <div className="grid grid-cols-2 gap-3">


            <div>


              <label className="text-xs font-medium">
                Max Users
              </label>


              <input

                type="number"

                value={maxUsers}

                onChange={(e)=>setMaxUsers(e.target.value)}

                placeholder="Default"

                className="
                  w-full
                  mt-1
                  rounded-lg
                  border
                  border-slate-300
                  px-3
                  py-2
                  text-sm
                "

              />


            </div>





            <div>


              <label className="text-xs font-medium">
                Max Projects
              </label>


              <input

                type="number"

                value={maxProjects}

                onChange={(e)=>setMaxProjects(e.target.value)}

                placeholder="Default"

                className="
                  w-full
                  mt-1
                  rounded-lg
                  border
                  border-slate-300
                  px-3
                  py-2
                  text-sm
                "

              />


            </div>


          </div>


        </div>







        {/* Footer */}


        <div className="
          mt-5
          flex
          justify-end
          gap-3
        ">


          <button

            onClick={onClose}

            disabled={loading}

            className="
              px-5
              py-2
              rounded-lg
              border
              border-slate-300
              text-sm
              font-semibold
            "

          >

            Cancel

          </button>





          <button

            onClick={handleSave}

            disabled={loading}

            className="
              px-5
              py-2
              rounded-lg
              bg-blue-600
              text-white
              text-sm
              font-semibold
              flex
              items-center
              gap-2
            "

          >

            {
              loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )
            }


          </button>


        </div>



      </div>


    </div>


  </div>
);











}