'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AppShell from '@/components/AppShell';
import { SUBSCRIPTION_TIERS, getTierById } from '@/config/subscriptionTiers';

interface UserProfile {
  email: string;
  fullName?: string;
  timezone: string;
  chronotype: 'lark' | 'owl' | 'intermediate';
  energyPattern: { peakHours: string[]; lowHours: string[] };
  preferences: { notifications: boolean; reminders: boolean; suggestionAlerts: boolean };
}

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { mode, setMode, accentColor, setAccentColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'subscription' | 'account'>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fullName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    chronotype: 'intermediate',
    energyPattern: { peakHours: ['09:00-11:00', '15:00-17:00'], lowHours: ['13:00-14:00'] },
    preferences: { notifications: true, reminders: true, suggestionAlerts: true },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        chronotype: profile.chronotype || 'intermediate',
        energyPattern: profile.energyPattern || { peakHours: ['09:00-11:00', '15:00-17:00'], lowHours: ['13:00-14:00'] },
        preferences: profile.preferences || { notifications: true, reminders: true, suggestionAlerts: true },
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile(formData);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Australia/Sydney', 'Pacific/Auckland',
  ];

  const accentColors = [
    { name: 'Indigo', value: '#4F46E5' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Orange', value: '#F97316' },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'subscription', label: 'Subscription' },
            { id: 'account', label: 'Account' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone || 'UTC'}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chronotype
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'lark', label: 'Early Bird', desc: 'Peak energy in morning' },
                  { value: 'intermediate', label: 'Intermediate', desc: 'Balanced energy' },
                  { value: 'owl', label: 'Night Owl', desc: 'Peak energy in evening' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, chronotype: type.value as UserProfile['chronotype'] })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.chronotype === type.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{type.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Push Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications for reminders</p>
              </div>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences!,
                      notifications: !formData.preferences?.notifications,
                    },
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.preferences?.notifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.preferences?.notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Task Reminders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get reminded before tasks start</p>
              </div>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences!,
                      reminders: !formData.preferences?.reminders,
                    },
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.preferences?.reminders ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.preferences?.reminders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">AI Suggestions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive AI-powered planning suggestions</p>
              </div>
              <button
                onClick={() =>
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences!,
                      suggestionAlerts: !formData.preferences?.suggestionAlerts,
                    },
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.preferences?.suggestionAlerts ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.preferences?.suggestionAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Notification Settings'}
            </button>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setMode(theme.value as 'light' | 'dark' | 'system')}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      mode === theme.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{theme.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Accent Color
              </label>
              <div className="grid grid-cols-6 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAccentColor(color.value)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${
                      accentColor === color.value
                        ? 'border-gray-900 dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Current Plan</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getTierById(profile?.subscription_tier || 'free')?.name || 'Free'} Plan
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {profile?.subscription_tier === 'free' ? 'Limited features' : 'Full access to all features'}
                    </p>
                  </div>
                  {profile?.subscription_tier !== 'free' && (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loadingPortal}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {loadingPortal ? 'Loading...' : 'Manage Subscription'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Available Plans</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.values(SUBSCRIPTION_TIERS).map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-lg border-2 ${
                      profile?.subscription_tier === tier.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">{tier.name}</h4>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      ${tier.price}<span className="text-sm font-normal">/month</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {profile?.subscription_tier !== tier.id && tier.price > 0 && (
                      <button
                        onClick={() => handleUpgrade(tier.priceId)}
                        className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Upgrade to {tier.name}
                      </button>
                    )}
                    {profile?.subscription_tier === tier.id && (
                      <div className="mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-center text-sm font-medium">
                        Current Plan
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Connected Accounts</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-900 dark:text-white">Google</span>
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <button
                onClick={handleSignOut}
                className="w-full py-2 px-4 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
