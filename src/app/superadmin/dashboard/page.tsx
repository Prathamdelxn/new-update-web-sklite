








'use client';

import { useEffect, useState } from 'react';

import StatCard from '@/components/superadmin/StatCard';
import RevenueCard from '@/components/superadmin/RevenueCard';
import RegistrationChart from '@/components/superadmin/RegistrationChart';
import ExpiringCard from '@/components/superadmin/ExpiringCard';
import ActivityCard from '@/components/superadmin/ActivityCard';
import Skeleton from '@/components/superadmin/Skeleton';

import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';


export default function SuperAdminDashboard() {

  const toast = useToast();

  const [loading, setLoading] = useState(true);


  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    expiring: 0,
    mrr: 0,
  });


  const [registrations, setRegistrations] = useState<any[]>([]);
  const [expiringOrganizations, setExpiringOrganizations] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);




  const trialDaysLeft = (date?: string) => {

  if (!date) return null;


  const expiry = new Date(date);

  const today = new Date();


  const diff =
    (expiry.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24);


  return Math.ceil(diff);

};

  useEffect(() => {

    fetchDashboard();

  }, []);



  const fetchDashboard = async () => {

    try {

      setLoading(true);


      const [
        subscriptionsRes,
        adminsRes,
        requestsRes,
      ] = await Promise.all([

        api.get('/superadmin/subscriptions'),

        api.get('/superadmin/admins'),

        api.get('/superadmin/plan-requests'),

      ]);



      const subscriptions = subscriptionsRes.data;

      const admins = adminsRes.data;

      const requests = requestsRes.data;




      const active = subscriptions.filter(
        (o:any)=>o.subscription?.status === 'Active'
      );


      const suspended = subscriptions.filter(
        (o:any)=>o.subscription?.status === 'Suspended'
      );



     const allExpiring = subscriptions
  .map((org:any)=>{

    const days = trialDaysLeft(
      org.subscription?.trialEndsAt ||
      org.subscription?.renewalDate
    );


    return {
      ...org,
      daysLeft: days
    };

  })
  .filter(
    (org:any)=>
      org.daysLeft !== null &&
      org.daysLeft >= 0 &&
      org.daysLeft <= 30
  )
  .sort(
    (a:any,b:any)=>
      a.daysLeft - b.daysLeft
  );


const expiring = allExpiring.slice(0,5);


const activities:any[] = [];


// New Organizations

subscriptions.forEach((org:any)=>{

  if(org.createdAt){

    activities.push({

      id:`org_${org.orgId}`,

      type:'organization',

      title:`${org.orgName} joined`,

      description:'New organization registered',

      date:org.createdAt,

      time:new Date(org.createdAt).toLocaleDateString(),

    });

  }

});



// Plan Requests

requests.forEach((request:any)=>{

  if(request.createdAt){

    activities.push({

      id:`req_${request._id}`,

      type:'approval',

      title:
        `${request.orgName} requested ${request.requestedPlan}`,

      description:
        `Plan upgrade request submitted`,

      date:request.createdAt,

      time:new Date(request.createdAt).toLocaleDateString(),

    });

  }

});



// Sort latest first

activities.sort(
  (a,b)=>
    new Date(b.date).getTime() -
    new Date(a.date).getTime()
);



// Latest 8 activities

setRecentActivity(
  activities.slice(0,8)
);





      const estimatedMRR = active.reduce(
        (sum:number, org:any)=>{


          switch(org.subscription?.plan){


            case 'Silver':
              return sum + 500;


            case 'Gold':
              return sum + 1000;


            case 'Platinum':
              return sum + 2000;


            default:
              return sum;

          }


        },
        0
      );





      setStats({

        total: subscriptions.length,

        active: active.length,

        suspended: suspended.length,

        expiring: expiring.length,

        mrr: estimatedMRR,

      });




      setExpiringOrganizations(expiring);






      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun'
      ];



      const chart = months.map((month)=>({


        month,


        count: admins.filter((a:any)=>{


          const date = new Date(
            a.createdAt
          );


          return (
            date.toLocaleString(
              'default',
              {
                month:'short'
              }
            ) === month
          );


        }).length,


      }));



      setRegistrations(chart);



    } catch(error:any){


      console.error(error);


      toast.error(
        error?.response?.data?.message ||
        'Failed to load dashboard.'
      );


    } finally {


      setLoading(false);


    }


  };





  if (loading) {

return (

<div className="space-y-6">


{/* Title */}

<div>

<Skeleton className="h-10 w-52"/>

<Skeleton className="h-4 w-80 mt-3"/>

</div>



{/* Stats */}

<div className="
grid
grid-cols-1
sm:grid-cols-2
xl:grid-cols-4
gap-6
">


{
[1,2,3,4].map((i)=>(

<Skeleton
key={i}
className="h-32"
/>

))
}


</div>




{/* Charts */}

<div className="
grid
xl:grid-cols-3
gap-6
">


<Skeleton className="h-64 xl:col-span-1"/>


<Skeleton className="h-64 xl:col-span-2"/>


</div>





{/* Bottom Cards */}

<div className="
grid
xl:grid-cols-2
gap-6
">


<Skeleton className="h-72"/>


<Skeleton className="h-72"/>


</div>



</div>

);

}





  return (

    <div className="space-y-5">



      {/* Title */}


      <div>


        <h1 className="text-2xl font-bold text-slate-900">

          Dashboard

        </h1>



        <p className="text-sm text-slate-500 mt-1">

          Overview of organizations, subscriptions and activity.

        </p>


      </div>






      {/* Statistics */}



      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">


        <StatCard

          title="Total Organizations"

          value={stats.total}

        />



        <StatCard

          title="Active Organizations"

          value={stats.active}

        />



        <StatCard

          title="Suspended"

          value={stats.suspended}

        />



        <StatCard

          title="Expiring Soon"

          value={stats.expiring}

        />


      </div>







      {/* Revenue + Registration */}



      <div className="grid xl:grid-cols-3 gap-4">


        <div className="xl:col-span-1">


          <RevenueCard

            amount={stats.mrr}

          />


        </div>





        <div className="xl:col-span-2">


          <RegistrationChart

            data={registrations}

          />


        </div>



      </div>








      {/* Bottom Cards */}



      <div className="grid xl:grid-cols-2 gap-4 items-start">

  <div>
    <ExpiringCard

organizations={
  expiringOrganizations.map((org:any)=>({

    id: org.orgId,

    name: org.orgName,

    plan:
      org.subscription?.plan || 'Silver',

    expiryDate:
      org.daysLeft === 0
      ? 'Expires today'
      : `${org.daysLeft} days left`

  }))
}

/>
  </div>


  <div>
    <ActivityCard
      activities={recentActivity}
    />
  </div>

</div>




    </div>

  );

}



// 'use client';

// import { useEffect, useState } from 'react';

// import StatCard from '@/components/superadmin/StatCard';
// import RevenueCard from '@/components/superadmin/RevenueCard';
// import RegistrationChart from '@/components/superadmin/RegistrationChart';
// import ExpiringCard from '@/components/superadmin/ExpiringCard';
// import ActivityCard from '@/components/superadmin/ActivityCard';

// import api from '@/services/api.client';
// import { useToast } from '@/providers/ToastContext';

// export default function SuperAdminDashboard() {
//   const toast = useToast();

//   const [loading, setLoading] = useState(true);

//   const [stats, setStats] = useState({
//     total: 0,
//     active: 0,
//     suspended: 0,
//     expiring: 0,
//     mrr: 0,
//   });

//   const [registrations, setRegistrations] = useState<any[]>([]);
//   const [expiringOrganizations, setExpiringOrganizations] = useState<any[]>([]);
//   const [recentActivity, setRecentActivity] = useState<any[]>([]);

//   useEffect(() => {
//     fetchDashboard();
//   }, []);

//   const fetchDashboard = async () => {
//     try {
//       setLoading(true);

//       const [
//         subscriptionsRes,
//         adminsRes,
//         requestsRes,
//       ] = await Promise.all([
//         api.get('/superadmin/subscriptions'),
//         api.get('/superadmin/admins'),
//         api.get('/superadmin/plan-requests'),
//       ]);

//       const subscriptions = subscriptionsRes.data;
//       const admins = adminsRes.data;
//       const requests = requestsRes.data;

//       const active = subscriptions.filter(
//         (o: any) => o.subscription?.status === 'Active'
//       );

//       const suspended = subscriptions.filter(
//         (o: any) => o.subscription?.status === 'Suspended'
//       );

//       const expiring = subscriptions.filter((o: any) => {
//         if (!o.subscription?.renewalDate) return false;

//         const expiry = new Date(o.subscription.renewalDate);
//         const today = new Date();

//         const diff =
//           (expiry.getTime() - today.getTime()) /
//           (1000 * 60 * 60 * 24);

//         return diff <= 30;
//       });

//       const estimatedMRR = active.reduce(
//         (sum: number, org: any) => {
//           switch (org.subscription?.plan) {
//             case 'Silver':
//               return sum + 500;

//             case 'Gold':
//               return sum + 1000;

//             case 'Platinum':
//               return sum + 2000;

//             default:
//               return sum;
//           }
//         },
//         0
//       );

//       setStats({
//         total: subscriptions.length,
//         active: active.length,
//         suspended: suspended.length,
//         expiring: expiring.length,
//         mrr: estimatedMRR,
//       });

//       setExpiringOrganizations(expiring);

//       setRecentActivity(requests);

//       const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

//       const chart = months.map((month) => ({
//         month,
//         count: admins.filter((a: any) => {
//           const date = new Date(a.createdAt);

//           return (
//             date.toLocaleString('default', {
//               month: 'short',
//             }) === month
//           );
//         }).length,
//       }));

//       setRegistrations(chart);
//     } catch (error: any) {
//       console.error(error);

//       toast.error(
//         error?.response?.data?.message ||
//           'Failed to load dashboard.'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-[70vh]">
//         <p className="text-lg font-medium text-slate-500">
//           Loading Dashboard...
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8">

//       {/* Dashboard Title */}

//       <div>
//         <h1 className="text-4xl font-bold text-slate-900">
//           Dashboard
//         </h1>

//         <p className="text-slate-500 mt-2">
//           Overview of organizations, subscriptions and activity.
//         </p>
//       </div>

//       {/* Statistics */}

//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

//         <StatCard
//           title="Total Organizations"
//           value={stats.total}
//         />

//         <StatCard
//           title="Active Organizations"
//           value={stats.active}
//         />

//         <StatCard
//           title="Suspended"
//           value={stats.suspended}
//         />

//         <StatCard
//           title="Expiring Soon"
//           value={stats.expiring}
//         />

//       </div>

//       {/* Revenue & Registrations */}

//       <div className="grid xl:grid-cols-3 gap-6">

//         <div className="xl:col-span-1">
//           <RevenueCard amount={stats.mrr} />
//         </div>

//         <div className="xl:col-span-2">
//           <RegistrationChart data={registrations} />
//         </div>

//       </div>

//       {/* Bottom Cards */}

//       <div className="grid xl:grid-cols-2 gap-6">

//         <ExpiringCard
//           organizations={expiringOrganizations}
//         />

//         <ActivityCard
//           activities={recentActivity}
//         />

//       </div>

//     </div>
//   );
// }