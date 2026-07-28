



'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Shell } from '@/components/layouts/Shell';
import { RoleList } from '@/features/users/components/RoleList';

export default function RolesPage() {
  const router = useRouter();

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-8">

        {/* Header */}

        <div className="flex items-center gap-4 mb-8">

          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-3xl font-bold">
              Role Management
            </h1>

            <p className="text-gray-500 mt-1">
              Manage all organization roles and permissions.
            </p>
          </div>

        </div>

        {/* Existing Role Component */}

        <RoleList />

      </div>
    </Shell>
  );
}

























// 'use client';

// import  {RoleList}  from '@/features/users/components/RoleList';
// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Shell } from '@/components/layouts/Shell';
// import { GlassCard } from '@/components/ui/GlassCard';

// import {
//   ArrowLeft,
//   Plus,
//   Search,
//   Shield,
//   MoreVertical,
//   Users,
//   Pencil,
//   Trash2,
// } from 'lucide-react';

// export default function RolesPage() {
//   const router = useRouter();

//   const [search, setSearch] = useState('');

//   // =====================================================
//   // TODO:
//   // Replace with:
//   // GET /api/roles
//   // =====================================================

//   const roles = [
//     {
//       id: 1,
//       name: 'Administrator',
//       description: 'Full system access',
//       members: 2,
//     },
//     {
//       id: 2,
//       name: 'Project Manager',
//       description: 'Manage projects',
//       members: 8,
//     },
//     {
//       id: 3,
//       name: 'Site Engineer',
//       description: 'Manage site activities',
//       members: 15,
//     },
//     {
//       id: 4,
//       name: 'HR',
//       description: 'Human Resource',
//       members: 4,
//     },
//     {
//       id: 5,
//       name: 'Accountant',
//       description: 'Finance Management',
//       members: 3,
//     },
//   ];

//   const filteredRoles = roles.filter((role) =>
//     role.name.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <Shell>
//       <div className="max-w-6xl mx-auto p-8">

//         {/* Header */}

//         <div className="flex justify-between items-center mb-8">

//           <div className="flex items-center gap-4">

//             <button
//               onClick={() => router.back()}
//               className="w-11 h-11 rounded-xl border flex items-center justify-center hover:bg-gray-100"
//             >
//               <ArrowLeft className="w-5 h-5" />
//             </button>

//             <div>

//               <h1 className="text-3xl font-bold">
//                 Role Management
//               </h1>

//               <p className="text-gray-500 mt-1">
//                 Create and manage organization roles.
//               </p>

//             </div>

//           </div>

//           <button
//             onClick={() =>
//               router.push('/settings/user-management/roles/new')
//             }
//             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2"
//           >
//             <Plus className="w-5 h-5" />

//             New Role
//           </button>

//         </div>

//         {/* Search */}

//         <GlassCard className="p-4 rounded-2xl mb-8">

//           <div className="flex items-center gap-3">

//             <Search className="w-5 h-5 text-gray-400" />

//             <input
//               className="w-full outline-none bg-transparent"
//               placeholder="Search Role..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />

//           </div>

//         </GlassCard>

//         {/* Roles */}

//         <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-4">

//           All System Roles

//         </h2>

//         <div className="grid lg:grid-cols-2 gap-6">

//           {filteredRoles.map((role) => (

//             <GlassCard
//               key={role.id}
//               className="rounded-3xl p-6 border border-gray-200 hover:shadow-lg transition"
//             >

//               <div className="flex justify-between">

//                 <div className="flex gap-4">

//                   <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

//                     <Shield className="w-7 h-7 text-blue-600" />

//                   </div>

//                   <div>

//                     <h3 className="font-bold text-lg">

//                       {role.name}

//                     </h3>

//                     <p className="text-gray-500 mt-1">

//                       {role.description}

//                     </p>

//                   </div>

//                 </div>

//                 <button>

//                   <MoreVertical className="w-5 h-5 text-gray-500" />

//                 </button>

//               </div>

//               <div className="flex justify-between mt-6">

//                 <div className="flex items-center gap-2 text-gray-500">

//                   <Users className="w-4 h-4" />

//                   {role.members} Members

//                 </div>

//                 <div className="flex gap-4">

//                   <button className="text-blue-600 flex items-center gap-1">

//                     <Pencil className="w-4 h-4" />

//                     Edit

//                   </button>

//                   <button className="text-red-500 flex items-center gap-1">

//                     <Trash2 className="w-4 h-4" />

//                     Delete

//                   </button>

//                 </div>

//               </div>

//             </GlassCard>

//           ))}

//         </div>

//         {/* API Integration */}

//         {/*
//         ==============================

//         GET /api/roles

//         Replace:
//         const roles=[]

//         ==============================

//         POST
//         handled in

//         /roles/new

//         ==============================

//         DELETE

//         call

//         DELETE /api/roles/:id

//         inside Delete button

//         ==============================

//         PUT

//         call

//         PUT /api/roles/:id

//         inside Edit button

//         */}
//       </div>
//     </Shell>
//   );
// }