'use client';

import {
  Activity,
  CheckCircle2,
  Building2,
  ArrowUpCircle,
  UserPlus,
  Clock,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'organization' | 'approval' | 'plan' | 'user';
}

interface ActivityCardProps {
  activities?: ActivityItem[];
}

export default function ActivityCard({
  activities = [
    {
      id: '1',
      title: 'New Organization Registered',
      description: 'ABC Construction created an account',
      time: '5 min ago',
      type: 'organization',
    },
    {
      id: '2',
      title: 'Plan Request Approved',
      description: 'Gold Plan approved for Sky Builders',
      time: '18 min ago',
      type: 'approval',
    },
    {
      id: '3',
      title: 'Subscription Upgraded',
      description: 'Prime Infra upgraded to Platinum',
      time: '1 hour ago',
      type: 'plan',
    },
    {
      id: '4',
      title: 'New Admin Added',
      description: 'Admin added for XYZ Construction',
      time: '2 hours ago',
      type: 'user',
    },
  ],
}: ActivityCardProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'organization':
        return (
          <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
        );

      case 'approval':
        return (
          <div className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
        );

      case 'plan':
        return (
          <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center">
            <ArrowUpCircle className="w-5 h-5 text-purple-600" />
          </div>
        );

      case 'user':
        return (
          <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-orange-600" />
          </div>
        );

      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">

      {/* Header */}

      <div className="flex items-center gap-3 mb-8">

        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">

          <Activity className="w-4 h-4 text-indigo-600" />

        </div>

        <div>

          <h2 className="text-base font-bold text-slate-900">
            Recent Activity
          </h2>

          <p className="text-slate-500 text-sm">
            Latest system events
          </p>

        </div>

      </div>

      {/* Activity List */}

      <div className="space-y-5">

        {activities.length === 0 ? (
          <div className="py-12 text-center">

            <Activity className="mx-auto w-10 h-10 text-slate-300 mb-3" />

            <p className="text-slate-500">
              No recent activity.
            </p>

          </div>
        ) : (
          activities.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-slate-200 rounded-2xl p-5 hover:bg-slate-50 transition">
              {getIcon(item.type)}

              <div className="flex-1">

                <h3 className="font-semibold text-slate-900">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {item.description}
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">

                <Clock className="w-4 h-4" />

                {item.time}

              </div>

            </div>
          ))
        )}

      </div>

      {/*
      ===================================================

      Backend Integration

      GET /superadmin/dashboard

      Expected response:

      {
        recentActivity: [
          {
            id,
            title,
            description,
            time,
            type
          }
        ]
      }

      Replace the static activities array
      with the API response.

      ===================================================
      */}

    </div>
  );
}