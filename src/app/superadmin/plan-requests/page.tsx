



'use client';

import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Crown } from 'lucide-react';
import PlanRequestCard from '@/components/superadmin/PlanRequestCard';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import Skeleton from '@/components/superadmin/Skeleton';


export default function PlanRequestsPage() {

  const [search, setSearch] = useState('');

  const [status, setStatus] = useState<
    'All' | 'Pending' | 'Approved' | 'Rejected'
  >('All');


  const toast = useToast();


  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);



  const fetchPlanRequests = async () => {

    try {

      setLoading(true);

      const { data } = await api.get('/superadmin/plan-requests');

      setRequests(data);

    } catch (error: any) {

      console.error(error);

      toast.error(
        error?.response?.data?.message ||
        'Failed to load plan requests.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    fetchPlanRequests();

  }, []);



  const filteredRequests = useMemo(() => {

    return requests.filter((item) => {

      const searchText = search.toLowerCase();


      const matchesSearch =
        item.orgName
          ?.toLowerCase()
          .includes(searchText) ||

        item.requestedByName
          ?.toLowerCase()
          .includes(searchText);



      const matchesStatus =
        status === 'All'
          ? true
          : item.status === status;



      return matchesSearch && matchesStatus;

    });

  }, [requests, search, status]);




  if(loading){

return (

<div className="space-y-6">


{/* Header */}

<Skeleton className="h-12 w-64"/>



{/* Search */}

<Skeleton className="h-20 w-full"/>




{/* Cards */}

<div className="
grid
lg:grid-cols-2
xl:grid-cols-3
gap-5
">


{
[1,2,3,4,5,6].map(i=>(

<Skeleton
key={i}
className="h-72"
/>

))
}


</div>


</div>

)

}




  return (

    <div className="space-y-5">


      {/* Header */}

      <div className="flex items-center gap-3">


        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">


          <Crown className="w-5 h-5 text-indigo-600" />


        </div>



        <div>


          <h1 className="text-2xl font-bold text-slate-900">

            Plan Requests

          </h1>



          <p className="text-sm text-slate-500">

            Approve or reject organization subscription requests.

          </p>


        </div>


      </div>





      {/* Search + Filter */}


      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">


        <div className="flex flex-col lg:flex-row gap-3">



          <div className="relative flex-1">


            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            />


            <input

              value={search}

              onChange={(e)=>setSearch(e.target.value)}

              placeholder="Search organization..."

              className="
              w-full
              pl-10
              pr-4
              py-2.5
              rounded-lg
              border
              border-slate-200
              text-sm
              outline-none
              focus:ring-2
              focus:ring-indigo-500
              "

            />


          </div>




          <div className="flex items-center gap-2">


            <Filter className="w-4 h-4 text-slate-500" />



            {(['All','Pending','Approved','Rejected'] as const).map((item)=>(


              <button

                key={item}

                onClick={() => setStatus(item)}

                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  
                  status === item

                  ? 'bg-[#33206F] text-white'

                  : 'bg-slate-100 hover:bg-slate-200'

                }`}

              >

                {item}

              </button>


            ))}


          </div>



        </div>


      </div>





      {/* Summary */}


      <div className="flex flex-wrap gap-5 text-xs">


        <span className="font-semibold">

          Total : {requests.length}

        </span>



        <span className="text-orange-600 font-semibold">

          Pending :
          {
            requests.filter(
              r=>r.status==='Pending'
            ).length
          }

        </span>




        <span className="text-green-600 font-semibold">

          Approved :
          {
            requests.filter(
              r=>r.status==='Approved'
            ).length
          }

        </span>




        <span className="text-red-600 font-semibold">

          Rejected :
          {
            requests.filter(
              r=>r.status==='Rejected'
            ).length
          }

        </span>


      </div>





      {/* Cards */}



      {
        filteredRequests.length === 0 ? (


          <div className="
          bg-white 
          rounded-xl 
          border 
          border-slate-200 
          py-12 
          text-center
          ">


            <Crown className="mx-auto w-10 h-10 text-slate-300 mb-3"/>


            <h2 className="text-lg font-bold text-slate-700">

              No Plan Requests Found

            </h2>



            <p className="text-sm text-slate-500 mt-1">

              Try changing the filters.

            </p>


          </div>



        ) : (


          <div className="
          grid
          sm:grid-cols-2
          lg:grid-cols-3
          gap-4
          ">


            {
              filteredRequests.map((request)=>(


                <PlanRequestCard

                  key={request._id}

                  request={request as any}


                  onApprove={async()=>{

                    try {

                      await api.patch(
                        `/superadmin/plan-requests/${request._id}/approve`
                      );


                      toast.success('Plan approved.');

                      fetchPlanRequests();


                    } catch(error:any){

                      toast.error(
                        error?.response?.data?.message ||
                        'Failed to approve request.'
                      );

                    }

                  }}



                  onReject={async()=>{

                    try {

                      await api.patch(
                        `/superadmin/plan-requests/${request._id}/reject`
                      );


                      toast.success('Plan rejected.');

                      fetchPlanRequests();


                    } catch(error:any){

                      toast.error(
                        error?.response?.data?.message ||
                        'Failed to reject request.'
                      );

                    }

                  }}


                />


              ))
            }


          </div>


        )
      }



    </div>

  );

}

















// 'use client';

// import { useMemo, useState } from 'react';
// import { Search, Filter, Crown } from 'lucide-react';
// import PlanRequestCard from '@/components/superadmin/PlanRequestCard';
// import { useEffect } from 'react';
// import api from '@/services/api.client';
// import { useToast } from '@/providers/ToastContext';


// export default function PlanRequestsPage() {
  
//   const [search, setSearch] = useState('');
//   const [status, setStatus] = useState<
//     'All' | 'Pending' | 'Approved' | 'Rejected'
//   >('All');

//   /*
//   =====================================================

//   TODO

//   Replace with

//   GET /superadmin/plan-requests

//   =====================================================
//   */

// //   const requests = [
// //     {
// //       _id: '1',
// //       organization: 'org1',
// //       orgName: 'ABC Construction',
// //       currentPlan: 'Silver',
// //       requestedPlan: 'Gold',
// //       requestedByName: 'John Smith',
// //       createdAt: '2026-06-28',
// //       status: 'Pending',
// //     },
// //     {
// //       _id: '2',
// //       organization: 'org2',
// //       orgName: 'Sky Builders',
// //       currentPlan: 'Gold',
// //       requestedPlan: 'Platinum',
// //       requestedByName: 'David Lee',
// //       createdAt: '2026-06-27',
// //       status: 'Pending',
// //     },
// //     {
// //       _id: '3',
// //       organization: 'org3',
// //       orgName: 'Prime Infra',
// //       currentPlan: 'Silver',
// //       requestedPlan: 'Gold',
// //       requestedByName: 'Sarah Wilson',
// //       createdAt: '2026-06-25',
// //       status: 'Approved',
// //     },
// //     {
// //       _id: '4',
// //       organization: 'org4',
// //       orgName: 'Royal Projects',
// //       currentPlan: 'Gold',
// //       requestedPlan: 'Platinum',
// //       requestedByName: 'Amit Patel',
// //       createdAt: '2026-06-24',
// //       status: 'Rejected',
// //     },
// //   ];


// const toast = useToast();

// const [requests, setRequests] = useState<any[]>([]);
// const [loading, setLoading] = useState(true);


// const fetchPlanRequests = async () => {
//   try {
//     setLoading(true);

//     const { data } = await api.get('/superadmin/plan-requests');

//     setRequests(data);
//   } catch (error: any) {
//     console.error(error);

//     toast.error(
//       error?.response?.data?.message ||
//       'Failed to load plan requests.'
//     );
//   } finally {
//     setLoading(false);
//   }
// };

// useEffect(() => {
//   fetchPlanRequests();
// }, []);


//   const filteredRequests = useMemo(() => {
//     return requests.filter((item) => {
//       const matchesSearch =
//         item.orgName.toLowerCase().includes(search.toLowerCase()) ||
//         item.requestedByName
//           .toLowerCase()
//           .includes(search.toLowerCase());

//       const matchesStatus =
//         status === 'All'
//           ? true
//           : item.status === status;

//       return matchesSearch && matchesStatus;
//     });
//   }, [search, status]);


//   if (loading) {
//   return (
//     <div className="flex justify-center items-center h-[70vh]">
//       <div className="text-lg font-semibold">
//         Loading Plan Requests...
//       </div>
//     </div>
//   );
// }

//   return (
//     <div className="space-y-8">

//       {/* Header */}

//       <div className="flex items-center gap-4">

//         <div className="w-16 h-16 rounded-3xl bg-indigo-100 flex items-center justify-center">

//           <Crown className="w-8 h-8 text-indigo-600" />

//         </div>

//         <div>

//           <h1 className="text-4xl font-bold text-slate-900">
//             Plan Requests
//           </h1>

//           <p className="text-slate-500 mt-1">
//             Approve or reject organization subscription requests.
//           </p>

//         </div>

//       </div>

//       {/* Search + Filter */}

//       <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">

//         <div className="flex flex-col lg:flex-row gap-4">

//           <div className="relative flex-1">

//             <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

//             <input
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search organization..."
//               className="w-full pl-14 pr-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
//             />

//           </div>

//           <div className="flex items-center gap-3">

//             <Filter className="w-5 h-5 text-slate-500" />

//             {['All', 'Pending', 'Approved', 'Rejected'].map((item) => (

//               <button
//                 key={item}
//                 onClick={() => setStatus(item as any)}
//                 className={`px-5 py-3 rounded-xl font-semibold transition ${
//                   status === item
//                     ? 'bg-[#33206F] text-white'
//                     : 'bg-slate-100 hover:bg-slate-200'
//                 }`}
//               >
//                 {item}
//               </button>

//             ))}

//           </div>

//         </div>

//       </div>

//       {/* Summary */}

//       <div className="flex flex-wrap gap-6 text-sm">

//         <span className="font-semibold">
//           Total : {requests.length}
//         </span>

//         <span className="text-orange-600 font-semibold">
//           Pending :{' '}
//           {
//             requests.filter((r) => r.status === 'Pending')
//               .length
//           }
//         </span>

//         <span className="text-green-600 font-semibold">
//           Approved :{' '}
//           {
//             requests.filter((r) => r.status === 'Approved')
//               .length
//           }
//         </span>

//         <span className="text-red-600 font-semibold">
//           Rejected :{' '}
//           {
//             requests.filter((r) => r.status === 'Rejected')
//               .length
//           }
//         </span>

//       </div>

//       {/* Cards */}

//       {filteredRequests.length === 0 ? (

//         <div className="bg-white rounded-3xl border border-slate-200 py-24 text-center">

//           <Crown className="mx-auto w-16 h-16 text-slate-300 mb-4" />

//           <h2 className="text-2xl font-bold text-slate-700">
//             No Plan Requests Found
//           </h2>

//           <p className="text-slate-500 mt-2">
//             Try changing the filters.
//           </p>

//         </div>

//       ) : (

//         <div className="grid lg:grid-cols-2 gap-6">

//           {filteredRequests.map((request) => (

//             <PlanRequestCard
//               key={request._id}
//               request={request as any}
//               onApprove={async () => {
//                                         try {
//                                             await api.patch(
//                                                 `/superadmin/plan-requests/${request._id}/approve`
//                                             );

//                                             toast.success('Plan approved.');

//                                             fetchPlanRequests();
//                                         } catch (error: any) {
//                                             toast.error(
//                                                 error?.response?.data?.message ||
//                                                 'Failed to approve request.'
//                                             );
//                                         }
//                                     }
//                         }
//               onReject={async () => {
//   try {
//     await api.patch(
//       `/superadmin/plan-requests/${request._id}/reject`
//     );

//     toast.success('Plan rejected.');

//     fetchPlanRequests();
//   } catch (error: any) {
//     toast.error(
//       error?.response?.data?.message ||
//       'Failed to reject request.'
//     );
//   }
// }}
//             />

//           ))}

//         </div>

//       )}

//       {/*
//       ========================================================

//       API Integration

//       GET

//       /superadmin/plan-requests

//       Replace:

//       const requests=[]

//       ----------------------------------------

//       Search

//       /superadmin/plan-requests?search=

//       ----------------------------------------

//       Filter

//       /superadmin/plan-requests?status=Pending

//       ----------------------------------------

//       Approve

//       PATCH

//       /superadmin/plan-requests/:id/approve

//       ----------------------------------------

//       Reject

//       PATCH

//       /superadmin/plan-requests/:id/reject

//       Refresh list after success.

//       ========================================================
//       */}

//     </div>
//   );
// }