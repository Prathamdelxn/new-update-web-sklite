// 'use client';

// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   ArrowLeft,
//   Bell,
//   LogOut,
//   ThumbsUp,
// } from 'lucide-react';
// import Cookies from 'js-cookie';

// export default function SuperAdminLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const pathname = usePathname();
//   const router = useRouter();

//   const logout = () => {
//     localStorage.removeItem('saToken');
//     localStorage.removeItem('superAdmin');

//     Cookies.remove('saToken');

//     router.replace('/login');
//   };

//   const tabs = [
//     {
//       name: 'Dashboard',
//       href: '/superadmin/dashboard',
//     },
//     {
//       name: 'Organizations',
//       href: '/superadmin/organizations',
//     },
//     {
//       name: 'Plan Requests',
//       href: '/superadmin/plan-requests',
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-[#F5F7FD]">

//       {/* Header */}

//       <div className="bg-[#2F1B69] text-white">

//         <div className="max-w-7xl mx-auto">

//           <div className="flex items-center justify-between px-8 py-6">

//             {/* Left */}

//             <div className="flex items-center gap-6">

//               <button
//                 onClick={() => router.back()}
//                 className="hover:opacity-80"
//               >
//                 <ArrowLeft className="w-8 h-8" />
//               </button>

//               <h1 className="text-4xl font-black">
//                 Super Admin
//               </h1>

//             </div>

//             {/* Right */}

//             <div className="flex items-center gap-6">

//               <button className="hover:opacity-80">
//                 <ThumbsUp className="w-8 h-8" />
//               </button>

//               <button className="hover:opacity-80">
//                 <Bell className="w-8 h-8" />
//               </button>

//               <button
//                 onClick={logout}
//                 className="hover:text-red-300 transition"
//               >
//                 <LogOut className="w-8 h-8" />
//               </button>

//             </div>

//           </div>

//           {/* Tabs */}

//           <div className="flex">

//             {tabs.map((tab) => {

//               const active = pathname === tab.href;

//               return (
//                 <Link
//                   key={tab.href}
//                   href={tab.href}
//                   className={`px-8 py-5 text-xl font-semibold transition border-b-4 ${
//                     active
//                       ? 'border-white text-white'
//                       : 'border-transparent text-white/70 hover:text-white'
//                   }`}
//                 >
//                   {tab.name}
//                 </Link>
//               );
//             })}

//           </div>

//         </div>

//       </div>

//       {/* Page */}

//       <div className="max-w-7xl mx-auto px-8 py-8">

//         {children}

//       </div>

//     </div>
//   );
// }




'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  LogOut,
  ThumbsUp,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useAuth } from '@/providers/AuthContext';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  const tabs = [
    {
      name: 'Dashboard',
      href: '/superadmin/dashboard',
    },
    {
      name: 'Organizations',
      href: '/superadmin/organizations',
    },
    {
      name: 'Plan Requests',
      href: '/superadmin/plan-requests',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FD]">

      {/* Header */}
      <div className="bg-[#2F1B69] text-white">

        <div className="max-w-7xl mx-auto">

          <div className="flex items-center justify-between px-5 py-3">

            {/* Left */}
            <div className="flex items-center gap-3">

              {/* <button
                onClick={() => router.back()}
                className="hover:opacity-80"
              >
                <ArrowLeft className="w-5 h-5" />
              </button> */}

              <h1 className="text-2xl font-bold">
                Super Admin
              </h1>

            </div>


            {/* Right */}
            <div className="flex items-center gap-4">

              <button className="hover:opacity-80">
                <ThumbsUp className="w-5 h-5" />
              </button>

              <button className="hover:opacity-80">
                <Bell className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                className="hover:text-red-300 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>

            </div>

          </div>


          {/* Tabs */}
          <div className="flex">

            {tabs.map((tab) => {

              const active = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-5 py-3 text-sm font-medium transition border-b-2 ${
                    active
                      ? 'border-white text-white'
                      : 'border-transparent text-white/70 hover:text-white'
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}

          </div>

        </div>

      </div>


      {/* Page */}
      <div className="max-w-7xl mx-auto px-5 py-5">

        {children}

      </div>

    </div>
  );
}