



'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Shell } from '@/components/layouts/Shell';
import { UserList } from '@/features/users/components/UserList';


export default function MembersPage() {
  const router = useRouter();

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-8">

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-3xl font-bold">
              Member Management
            </h1>

            <p className="text-gray-500 mt-1">
              Manage all organization members.
            </p>
          </div>
        </div>

        <UserList />

      </div>
    </Shell>
  );
}
















// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Shell } from '@/components/layouts/Shell';
// import { GlassCard } from '@/components/ui/GlassCard';

// import {
//   ArrowLeft,
//   Plus,
//   Search,
//   Users,
//   Mail,
//   Shield,
//   MoreVertical,
//   Pencil,
//   Trash2,
// } from 'lucide-react';

// export default function MembersPage() {
//   const router = useRouter();

//   const [search, setSearch] = useState('');

//   // =====================================================
//   // TODO:
//   // Replace this static data with:
//   // GET /api/members
//   // =====================================================

//   const members = [
//     {
//       id: 1,
//       name: 'John Doe',
//       email: 'john@example.com',
//       role: 'Administrator',
//       status: 'Active',
//     },
//     {
//       id: 2,
//       name: 'Rahul Sharma',
//       email: 'rahul@example.com',
//       role: 'Project Manager',
//       status: 'Active',
//     },
//     {
//       id: 3,
//       name: 'Amit Patel',
//       email: 'amit@example.com',
//       role: 'Site Engineer',
//       status: 'Inactive',
//     },
//     {
//       id: 4,
//       name: 'Priya Singh',
//       email: 'priya@example.com',
//       role: 'HR',
//       status: 'Active',
//     },
//     {
//       id: 5,
//       name: 'Neha Gupta',
//       email: 'neha@example.com',
//       role: 'Accountant',
//       status: 'Active',
//     },
//   ];

//   const filteredMembers = members.filter(
//     (member) =>
//       member.name.toLowerCase().includes(search.toLowerCase()) ||
//       member.email.toLowerCase().includes(search.toLowerCase()) ||
//       member.role.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <Shell>
//       <div className="max-w-7xl mx-auto p-8">

//         {/* Header */}

//         <div className="flex justify-between items-center mb-8">

//           <div className="flex items-center gap-4">

//             <button
//               onClick={() => router.back()}
//               className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
//             >
//               <ArrowLeft className="w-5 h-5" />
//             </button>

//             <div>

//               <h1 className="text-3xl font-bold">
//                 Member Management
//               </h1>

//               <p className="text-gray-500 mt-1">
//                 Manage organization members.
//               </p>

//             </div>

//           </div>

//           <button
//             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2"
//           >
//             <Plus className="w-5 h-5" />

//             Invite Member
//           </button>

//         </div>

//         {/* Search */}

//         <GlassCard className="rounded-2xl p-4 mb-8">

//           <div className="flex items-center gap-3">

//             <Search className="w-5 h-5 text-gray-400" />

//             <input
//               type="text"
//               placeholder="Search member..."
//               className="w-full outline-none bg-transparent"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />

//           </div>

//         </GlassCard>

//         {/* Members */}

//         <h2 className="uppercase text-sm tracking-widest text-gray-500 mb-4">
//           Organization Members
//         </h2>

//         <div className="grid lg:grid-cols-2 gap-6">

//           {filteredMembers.map((member) => (

//             <GlassCard
//               key={member.id}
//               className="rounded-3xl border border-gray-200 p-6 hover:shadow-lg transition"
//             >

//               <div className="flex justify-between">

//                 <div className="flex gap-4">

//                   <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

//                     <Users className="w-7 h-7 text-blue-600" />

//                   </div>

//                   <div>

//                     <h3 className="text-lg font-bold">
//                       {member.name}
//                     </h3>

//                     <div className="flex items-center gap-2 text-gray-500 mt-1">

//                       <Mail className="w-4 h-4" />

//                       {member.email}

//                     </div>

//                   </div>

//                 </div>

//                 <button>

//                   <MoreVertical className="w-5 h-5 text-gray-500" />

//                 </button>

//               </div>

//               <div className="mt-6 flex justify-between items-center">

//                 <div>

//                   <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">

//                     <Shield className="w-4 h-4" />

//                     {member.role}

//                   </span>

//                 </div>

//                 <span
//                   className={`px-3 py-1 rounded-full text-sm font-medium ${
//                     member.status === 'Active'
//                       ? 'bg-green-100 text-green-700'
//                       : 'bg-red-100 text-red-700'
//                   }`}
//                 >
//                   {member.status}
//                 </span>

//               </div>

//               <div className="border-t mt-6 pt-4 flex justify-end gap-5">

//                 <button className="text-blue-600 flex items-center gap-2">

//                   <Pencil className="w-4 h-4" />

//                   Edit

//                 </button>

//                 <button className="text-red-600 flex items-center gap-2">

//                   <Trash2 className="w-4 h-4" />

//                   Delete

//                 </button>

//               </div>

//             </GlassCard>

//           ))}

//         </div>

//         {/* ======================================================

//         TODO API

//         GET /api/members

//         Replace members[] with API response

//         -------------------------------------------------------

//         Invite Button

//         POST /api/members

//         -------------------------------------------------------

//         Edit Button

//         PUT /api/members/:id

//         -------------------------------------------------------

//         Delete Button

//         DELETE /api/members/:id

//         ====================================================== */}

//       </div>
//     </Shell>
//   );
// }