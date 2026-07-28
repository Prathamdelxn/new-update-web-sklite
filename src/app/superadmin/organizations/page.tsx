'use client';

import { useMemo, useState } from 'react';
import { Building2, Search, Filter } from 'lucide-react';
import OrganizationCard from '@/components/superadmin/OrganizationCard';
import { useEffect } from 'react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import ManagePlanModal from '../../../components/superadmin/ManagePlanModal';
import Skeleton from '@/components/superadmin/Skeleton';

type Organization = {
  id: string;
  name: string;
  admin: string;
  email: string;
  members: number;
  plan: string;
  status: 'Active' | 'Suspended'|'expiring';
  expiryDate: string;
};

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
  'All' | 'Active' | 'Suspended' | 'Expiring'
>('All');

  /*
  ======================================================

  TODO

  Replace with

  GET /superadmin/organizations

  ======================================================
  */

  const toast = useToast();

  const [selectedOrganization, setSelectedOrganization] =
    useState<any>(null);

  const [openManageModal, setOpenManageModal] =
    useState(false);

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
  try {
    setLoading(true);

    const { data } = await api.get('/superadmin/subscriptions');

    setOrganizations(data);
  } catch (error: any) {
    console.error(error);

    toast.error(
      error?.response?.data?.message ||
      'Failed to load organizations.'
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchOrganizations();
}, []);

// const filteredOrganizations = useMemo(() => {
//   return organizations.filter((org) => {

//     const matchesSearch =
//       org.orgName
//         ?.toLowerCase()
//         .includes(search.toLowerCase()) ||

//       org.owner?.name
//         ?.toLowerCase()
//         .includes(search.toLowerCase()) ||

//       org.owner?.email
//         ?.toLowerCase()
//         .includes(search.toLowerCase());

//     const matchesStatus =
//       statusFilter === 'All'
//         ? true
//         : org.subscription?.status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });
// }, [organizations, search, statusFilter]);

const filteredOrganizations = useMemo(() => {
  return organizations.filter((org) => {

    const searchStr = search.toLowerCase();


    const matchSearch =
      !searchStr ||
      org.orgName
        ?.toLowerCase()
        .includes(searchStr) ||
      org.owner?.email
        ?.toLowerCase()
        .includes(searchStr);



    if (!matchSearch) {
      return false;
    }



    // Expiring filter
    if (statusFilter === 'Expiring') {

      const expiryDate =
        org.subscription?.trialEndsAt ||
        org.subscription?.renewalDate;


      if (!expiryDate) {
        return false;
      }


      const expiry =
        new Date(expiryDate);


      const today =
        new Date();


      const days =
        Math.ceil(
          (expiry.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
        );


      return days >= 0 && days <= 30;

    }



    // All / Active / Suspended

    const matchStatus =
      statusFilter === 'All'
        ? true
        : org.subscription?.status === statusFilter;



    return matchStatus;

  });

}, [
  organizations,
  statusFilter,
  search
]);



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
xl:grid-cols-4
gap-5
">


{
[1,2,3,4,5,6,7,8].map(i=>(

<Skeleton
key={i}
className="h-56"
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

  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">

    <Building2 className="w-5 h-5 text-blue-600" />

  </div>

  <div>

    <h1 className="text-2xl font-bold text-slate-900">
      Organizations
    </h1>

    <p className="text-sm text-slate-500">
      Manage all registered organizations.
    </p>

  </div>

</div>

      {/* Search */}

      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">

        <div className="flex flex-col lg:flex-row gap-4">

          <div className="relative flex-1">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization, admin or email..."
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />

          </div>

          <div className="flex items-center gap-3">

            <Filter className="w-5 h-5 text-slate-500" />

            {(['All', 'Active', 'Suspended', 'Expiring'] as const).map((item) => (

              <button
                key={item}
                onClick={() => setStatusFilter(item)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  statusFilter === item
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

      <div className="flex gap-5 text-xs">

        <span className="font-semibold">
          Total : {organizations.length}
        </span>

        <span className="font-semibold text-green-600">
          Active : {organizations.filter(o => o.subscription?.status === 'Active').length}
        </span>

        <span className="font-semibold text-red-600">
          Suspended : {organizations.filter(o => o.subscription?.status === 'Suspended').length}
        </span>

      </div>

      {/* Cards */}

      {filteredOrganizations.length === 0 ? (

        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
          <Building2 className="mx-auto w-14 h-14 text-slate-300 mb-5" />

          <h2 className="text-2xl font-bold text-slate-700">
            No Organizations Found
          </h2>

          <p className="text-slate-500 mt-2">
            Try changing the search or filter.
          </p>

        </div>

      ) : (

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrganizations.map((organization) => (

            <OrganizationCard
              key={organization.orgId}
              organization={{
                                id: organization.orgId,
                                name: organization.orgName,
                                admin: organization.owner?.name || '-',
                                email: organization.owner?.email || '-',
                                members: organization.usage?.users || 0,
                                projects: organization.usage?.projects || 0,
                                plan: organization.subscription?.plan || 'Silver',
                                status: organization.subscription?.status === 'Suspended'
                                ? 'Suspended'
                                : 'Active',

                                createdAt: organization.createdAt,

                                expiryDate: organization.subscription?.renewalDate
                                ? new Date(
                                  organization.subscription.renewalDate
                                ).toLocaleDateString()
                                : '-',
                              }}
                              onManagePlan={()=>{
                                setSelectedOrganization(organization);
                                setOpenManageModal(true);
                              }}
            />

          ))}

        </div>

      )}

     


    
      

      <ManagePlanModal
  open={openManageModal}
  organization={selectedOrganization}
  onClose={() => {
    setOpenManageModal(false);
    setSelectedOrganization(null);
  }}
  onSuccess={() => {
    fetchOrganizations();
  }}
/>

    </div>

    
  );
}