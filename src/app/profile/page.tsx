'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';

const CHRONOTYPES = [
  { value: 'lark', label: '🌅 Early Bird', desc: 'Peak energy in the morning' },
  { value: 'intermediate', label: '☀️ Intermediate', desc: 'Balanced energy throughout the day' },
  { value: 'owl', label: '🦉 Night Owl', desc: 'Peak energy in the evening' },
] as const;

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [chronotype, setChronotype] = useState(profile?.chronotype || 'intermediate');
  const [notifications, setNotifications] = useState(profile?.preferences?.notifications ?? true);
  const [reminders, setReminders] = useState(profile?.preferences?.reminders ?? true);
  const [suggestionAlerts, setSuggestionAlerts] = useState(profile?.preferences?.suggestionAlerts ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        fullName,
        chronotype,
        preferences: { notifications, reminders, suggestionAlerts },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?';

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{fullName || 'Your Name'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Basic Info</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Chronotype */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Chronotype</h2>
            <p className="text-xs text-gray-500">Helps the AI schedule tasks at your peak energy times</p>
            <div className="space-y-2">
              {CHRONOTYPES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChronotype(c.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    chronotype === c.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{c.label.split(' ')[0]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                  {chronotype === c.value && (
                    <div className="ml-auto w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Preferences</h2>
            {[
              { label: 'Notifications', desc: 'Receive app notifications', value: notifications, set: setNotifications },
              { label: 'Reminders', desc: 'Task deadline reminders', value: reminders, set: setReminders },
              { label: 'AI Suggestion Alerts', desc: 'Get notified of new AI suggestions', value: suggestionAlerts, set: setSuggestionAlerts },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                  <p className="text-xs text-gray-500">{pref.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => pref.set(!pref.value)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${pref.value ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pref.value ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>

          {saved && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Profile saved
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
