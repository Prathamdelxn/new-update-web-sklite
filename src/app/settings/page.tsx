'use client';
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import AppInfoModal from '@/components/settings/AppInfoModal';
import { cn } from '@/lib/utils';

import {
  Bell,
  Globe,
  CreditCard,
  Users,
  ShoppingCart,
  FileText,
  Info,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';

const Toggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => (
  <button type="button" onClick={onToggle}>
    {enabled ? (
      <ToggleRight className="w-8 h-8 text-blue-600" />
    ) : (
      <ToggleLeft className="w-8 h-8 text-gray-300" />
    )}
  </button>
);

const Divider = () => (
  <div className="border-t border-slate-100" />
);

const Group = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <h2 className="uppercase tracking-widest text-xs text-slate-500 font-bold">
      {title}
    </h2>

    <GlassCard className="rounded-3xl overflow-hidden border border-slate-200">
      {children}
    </GlassCard>
  </div>
);

const Row = ({
  icon: Icon,
  title,
  subtitle,
  right,
  onClick,
}: any) => {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cn(
        "w-full px-6 py-5 flex justify-between items-center transition text-left",
        onClick ? "hover:bg-slate-50 cursor-pointer" : ""
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>

        <div className="text-left">
          <div className="font-semibold text-slate-900">
            {title}
          </div>

          {subtitle && (
            <div className="text-sm text-slate-500 mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {right}
    </Component>
  );
};



export default function SettingsPage() {
  const { user } = useAuth() as any;
  const toast = useToast();
  const router = useRouter();

  const [language, setLanguage] = useState('English');
  const [savingLanguage, setSavingLanguage] = useState(false);

  const [notifications, setNotifications] = useState(true);

  const [subscription, setSubscription] = useState<any>(null);

  const [loadingPlan, setLoadingPlan] = useState(true);

  const [showAppInfo, setShowAppInfo] = useState(false);

  useEffect(() => {
    const lang = localStorage.getItem('language');

    if (lang) {
      setLanguage(lang);
    }

    api
      .get('/organization/subscription')
      .then((res) => {
        setSubscription(res.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingPlan(false);
      });
  }, []);

  const saveLanguage = async () => {
    setSavingLanguage(true);

    try {
      await api.patch('/user/preferences', {
        language,
      });

      localStorage.setItem('language', language);

      toast.success('Language Updated');
    } catch {
      toast.error('Unable to update language');
    } finally {
      setSavingLanguage(false);
    }
  };

  const toggleNotification = async () => {
    const value = !notifications;

    setNotifications(value);

    try {
      await api.patch('/organization/notifications', {
        pushNotifications: value,
      });

      toast.success('Notification Updated');
    } catch {
      toast.error('Unable to update notification');
    }
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}

        <div>
          <h1 className="text-3xl font-bold">
            Settings
          </h1>

          <p className="text-slate-500 mt-2">
            Manage your account, workspace and preferences.
          </p>
        </div>

        {/* Profile */}

        <GlassCard className="rounded-3xl p-7">

          <div className="flex items-center gap-5">

            <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-bold">

              {user?.name?.charAt(0)?.toUpperCase() || 'U'}

            </div>

            <div className="flex-1">

              <div className="flex items-center gap-3">

                <h2 className="text-xl font-bold">

                  {user?.name || 'Administrator'}

                </h2>

                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm">

                  Admin

                </span>

              </div>

              <p className="text-slate-500 mt-2">

                {user?.email}

              </p>

            </div>

          </div>

        </GlassCard>

        {/* Preferences */}

        <Group title="Preferences">

          <Row
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive important updates"
            right={
              <Toggle
                enabled={notifications}
                onToggle={toggleNotification}
              />
            }
          />

          <Divider />

          <Row
            icon={Globe}
            title="Language"
            subtitle={language}
            right={
              savingLanguage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )
            }
            onClick={saveLanguage}
          />

        </Group>
                {/* Workspace */}

        <Group title="Workspace">

          <Row
            icon={CreditCard}
            title="Plan & Billing"
            subtitle={
              loadingPlan
                ? "Loading subscription..."
                : subscription?.planName ||
                  subscription?.plan ||
                  "Free Plan"
            }
            right={<ChevronRight className="w-5 h-5 text-slate-400" />}
            onClick={() => router.push("/settings/plan-billing")}
          />

          <Divider />

            <Row
              icon={Users}
              title="User Management"
              subtitle="Manage team members & roles"
              right={<ChevronRight className="w-5 h-5 text-slate-400" />}
              onClick={() => router.push("/settings/user-management")}
            />

            {/* <Row
              icon={Users}
              title="User Management"
              subtitle="Manage team members & roles"
              right={<ChevronRight className="w-5 h-5 text-slate-400" />}
              onClick={() => router.push("/users")}
            /> */}

          <Divider />

          <Row
            icon={ShoppingCart}
            title="Vendor Management"
            subtitle="Suppliers and vendor settings"
            right={<ChevronRight className="w-5 h-5 text-slate-400" />}
            onClick={() => toast.success("Coming Soon")}
          />

        </Group>

        {/* Support */}

        <Group title="Support">

          <Row
            icon={FileText}
            title="Terms & Conditions"
            subtitle="Read our terms of service"
            right={<ChevronRight className="w-5 h-5 text-slate-400" />}
           onClick={() => router.push('/settings/terms')}
          />

          <Divider />


          <Divider />

          <Row
            icon={Info}
            title="App Information"
            subtitle="Version 1.0.0"
            right={<ChevronRight className="w-5 h-5 text-slate-400" />}
            onClick={() => setShowAppInfo(true)}
          />

        </Group>


      </div>

      <AppInfoModal
        open={showAppInfo}
        onClose={() => setShowAppInfo(false)}
      />
    </Shell>
  );
}