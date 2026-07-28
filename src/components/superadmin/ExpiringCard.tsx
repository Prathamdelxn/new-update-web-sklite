'use client';

import { AlertTriangle, Calendar } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  plan: string;
  expiryDate: string;
}

interface ExpiringCardProps {
  organizations?: Organization[];
}

export default function ExpiringCard({
  organizations = [
    {
      id: '1',
      name: 'ABC Construction',
      plan: 'Gold',
      expiryDate: '12 Jul 2026',
    },
    {
      id: '2',
      name: 'Sky Builders',
      plan: 'Silver',
      expiryDate: '14 Jul 2026',
    },
    {
      id: '3',
      name: 'Prime Infra',
      plan: 'Platinum',
      expiryDate: '18 Jul 2026',
    },
  ],
}: ExpiringCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">

      {/* Header */}

      <div className="flex items-center gap-3 mb-8">

        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">

          <AlertTriangle className="w-6 h-6 text-orange-600" />

        </div>

        <div>

          <h2 className="text-base font-bold text-slate-900">
            Organizations Expiring Soon
          </h2>

          <p className="text-slate-500 text-sm">
            Upcoming subscription expirations
          </p>

        </div>

      </div>

      {/* List */}

      <div className="space-y-5">

        {organizations.length === 0 ? (
          <div className="text-center py-10">

            <AlertTriangle className="mx-auto w-10 h-10 text-slate-300 mb-3" />

            <p className="text-slate-500">
              No organizations expiring soon.
            </p>

          </div>
        ) : (
          organizations.map((org) => (
            <div
              key={org.id}
              className="flex items-center justify-between border border-slate-200 rounded-2xl p-5 hover:bg-slate-50 transition"
            >
              <div>

                <h3 className="font-bold text-slate-900">
                  {org.name}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {org.plan} Plan
                </p>

              </div>

              <div className="flex items-center gap-2 text-orange-600 font-semibold">

                <Calendar className="w-4 h-4" />

                {org.expiryDate}

              </div>

            </div>
          ))
        )}

      </div>

      {/*
      ===================================

      Backend Integration

      GET /superadmin/dashboard

      Example response

      {
        expiringOrganizations: [
          {
            id,
            name,
            plan,
            expiryDate
          }
        ]
      }

      Replace the default organizations prop
      with API response.

      ===================================
      */}

    </div>
  );
}