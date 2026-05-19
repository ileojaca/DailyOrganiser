'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, GoalRecurrence } from '@/hooks/useGoals';
import { getDb } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface WorkSchedule {
  enabled: boolean;
  name: string;
  days: number[];
  startTime: string;
  endTime: string;
  breakDuration: number;
}

interface HabitEntry {
  id: string;
  name: string;
  duration: number;
  preferredTime: string;
  recurrence: 'daily' | 'weekdays' | 'weekend' | 'custom';
  customDays: number[];
  enabled: boolean;
  category: 'personal' | 'health' | 'family' | 'learning';
}

interface ProjectEntry {
  enabled: boolean;
  title: string;
  targetDate: string;
  studyDuration: number;
  preferredTime: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESET_HABITS: HabitEntry[] = [
  { id: 'prayer', name: 'Prayer / Devotion', duration: 15, preferredTime: '06:00', recurrence: 'daily', customDays: [], enabled: false, category: 'personal' },
  { id: 'exercise', name: 'Morning Exercise', duration: 30, preferredTime: '06:30', recurrence: 'daily', customDays: [], enabled: false, category: 'health' },
  { id: 'family', name: 'Family Time', duration: 60, preferredTime: '19:00', recurrence: 'daily', customDays: [], enabled: false, category: 'family' },
  { id: 'reading', name: 'Reading', duration: 30, preferredTime: '21:00', recurrence: 'daily', customDays: [], enabled: false, category: 'learning' },
  { id: 'meditation', name: 'Meditation', duration: 15, preferredTime: '07:00', recurrence: 'daily', customDays: [], enabled: false, category: 'health' },
];

const PEAK_OPTIONS = [
  { id: 'early_morning', label: 'Early Morning', sub: '5am – 9am', emoji: '🌅' },
  { id: 'morning', label: 'Morning', sub: '9am – 12pm', emoji: '☀️' },
  { id: 'afternoon', label: 'Afternoon', sub: '12pm – 5pm', emoji: '🌤' },
  { id: 'evening', label: 'Evening', sub: '5pm – 10pm', emoji: '🌙' },
];

const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm';
const ringStyle = { '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties;
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { createGoal } = useGoals(user?.uid);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — Work Schedule
  const [work, setWork] = useState<WorkSchedule>({
    enabled: false,
    name: 'Work',
    days: [1, 2, 3, 4, 5],
    startTime: '',
    endTime: '',
    breakDuration: 30,
  });

  // Step 3 — Habits
  const [habits, setHabits] = useState<HabitEntry[]>(PRESET_HABITS);
  const [customHabitName, setCustomHabitName] = useState('');

  // Step 4 — Project
  const [project, setProject] = useState<ProjectEntry>({
    enabled: false,
    title: '',
    targetDate: '',
    studyDuration: 45,
    preferredTime: '',
  });

  // Step 5 — Focus
  const [peakTime, setPeakTime] = useState('morning');
  const [additionalContext, setAdditionalContext] = useState('');

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const toggleWorkDay = (day: number) => {
    setWork(w => ({
      ...w,
      days: w.days.includes(day) ? w.days.filter(d => d !== day) : [...w.days, day],
    }));
  };

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h));
  };

  const updateHabit = (id: string, field: keyof HabitEntry, value: unknown) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const toggleHabitDay = (id: string, day: number) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const days = h.customDays.includes(day) ? h.customDays.filter(d => d !== day) : [...h.customDays, day];
      return { ...h, customDays: days };
    }));
  };

  const addCustomHabit = () => {
    if (!customHabitName.trim()) return;
    const newHabit: HabitEntry = {
      id: `custom_${Date.now()}`,
      name: customHabitName.trim(),
      duration: 30,
      preferredTime: '',
      recurrence: 'daily',
      customDays: [],
      enabled: true,
      category: 'personal',
    };
    setHabits(prev => [...prev, newHabit]);
    setCustomHabitName('');
  };

  const computeNetWork = () => {
    if (!work.startTime || !work.endTime) return 0;
    const [sh, sm] = work.startTime.split(':').map(Number);
    const [eh, em] = work.endTime.split(':').map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - work.breakDuration);
  };

  const canProceed = () => {
    if (step === 2 && work.enabled) {
      return !!(work.startTime && work.endTime && work.name.trim());
    }
    if (step === 4 && project.enabled) {
      return !!(project.title.trim() && project.targetDate);
    }
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Create work block
      if (work.enabled && work.startTime && work.endTime) {
        const rec: GoalRecurrence = {
          type: work.days.length === 5 && [1,2,3,4,5].every(d => work.days.includes(d)) ? 'weekdays' : 'custom',
          days: work.days,
          fixedStart: work.startTime,
          fixedEnd: work.endTime,
          breakDuration: work.breakDuration,
        };
        await createGoal({
          title: work.name || 'Work',
          category: 'work',
          priority: 5,
          goalType: 'block',
          estimatedDuration: computeNetWork(),
          recurrence: rec,
        });
      }

      // Create enabled habits
      for (const habit of habits.filter(h => h.enabled)) {
        const rec: GoalRecurrence = {
          type: habit.recurrence,
          timesPerDay: 1,
          preferredTime: habit.preferredTime || undefined,
          days: habit.recurrence === 'custom' ? habit.customDays : undefined,
        };
        await createGoal({
          title: habit.name,
          category: habit.category,
          priority: 3,
          goalType: 'habit',
          estimatedDuration: habit.duration,
          recurrence: rec,
        });
      }

      // Create project goal
      if (project.enabled && project.title.trim() && project.targetDate) {
        await createGoal({
          title: project.title.trim(),
          category: 'learning',
          priority: 4,
          goalType: 'project',
          estimatedDuration: project.studyDuration,
          studySessionDuration: project.studyDuration,
          targetDate: new Date(project.targetDate),
          recurrence: {
            type: 'daily',
            timesPerDay: 1,
            preferredTime: project.preferredTime || undefined,
          },
          description: `Target: ${project.targetDate}. Study ${project.studyDuration} min/day.`,
        });
      }

      // Save profile flags
      const db = getDb();
      await setDoc(doc(db, 'users', user.uid), {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        focusPeak: peakTime,
        additionalContext: additionalContext.trim() || null,
      }, { merge: true });

      localStorage.setItem('dailyOrganiserNeverShowOnboarding', 'true');
      onComplete();
    } catch (err) {
      console.error('Error saving onboarding:', err);
      setSaving(false);
    }
  };

  const enabledHabits = habits.filter(h => h.enabled);

  // ─── Step renderers ───────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="text-center py-4">
      <div className="text-6xl mb-6">🎯</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Welcome to DailyOrganiser</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
        Let's spend 2 minutes setting up your planner so the AI knows your real life — not just your tasks.
      </p>
      <div className="space-y-3 text-left">
        {[
          { icon: '🔒', text: 'Your work hours and habits are blocked off — AI never schedules over them' },
          { icon: '🧠', text: 'The AI plans your day around your actual schedule' },
          { icon: '📈', text: 'Long-term goals get broken into daily actions automatically' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Work schedule</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Block your work hours so AI never schedules over them.</p>

      <div className="flex gap-3 mb-5">
        <button
          type="button"
          onClick={() => setWork(w => ({ ...w, enabled: true }))}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${work.enabled ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
          style={work.enabled ? { background: 'var(--accent-color)' } : undefined}
        >
          Yes, regular hours
        </button>
        <button
          type="button"
          onClick={() => setWork(w => ({ ...w, enabled: false }))}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${!work.enabled ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
          style={!work.enabled ? { background: 'var(--accent-color)' } : undefined}
        >
          No / flexible
        </button>
      </div>

      {work.enabled && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Block name</label>
            <input type="text" value={work.name} onChange={e => setWork(w => ({ ...w, name: e.target.value }))}
              placeholder="e.g. Work, Part-time job, School..." className={inputClass} style={ringStyle} />
          </div>

          <div>
            <label className={labelClass}>Which days?</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleWorkDay(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${work.days.includes(i) ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                  style={work.days.includes(i) ? { background: 'var(--accent-color)' } : undefined}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start time <span className="text-red-400">*</span></label>
              <input type="time" value={work.startTime} onChange={e => setWork(w => ({ ...w, startTime: e.target.value }))}
                className={inputClass} style={ringStyle} />
            </div>
            <div>
              <label className={labelClass}>End time <span className="text-red-400">*</span></label>
              <input type="time" value={work.endTime} onChange={e => setWork(w => ({ ...w, endTime: e.target.value }))}
                className={inputClass} style={ringStyle} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Total break time (min) — lunch, short breaks</label>
            <input type="number" value={work.breakDuration} onChange={e => setWork(w => ({ ...w, breakDuration: parseInt(e.target.value) || 0 }))}
              min="0" max="120" step="5" className={inputClass} style={ringStyle} />
            {computeNetWork() > 0 && (
              <p className="text-xs text-gray-400 mt-1">Net work time: {computeNetWork()} min ({(computeNetWork() / 60).toFixed(1)}h)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Daily habits & commitments</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Toggle any that apply — customize the time and duration.</p>

      <div className="space-y-2 mb-4">
        {habits.map(habit => (
          <div key={habit.id} className={`border rounded-xl transition-all ${habit.enabled ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
            <button type="button" onClick={() => toggleHabit(habit.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${habit.enabled ? 'border-transparent text-white' : 'border-gray-300 dark:border-gray-600'}`}
                style={habit.enabled ? { background: 'var(--accent-color)' } : undefined}>
                {habit.enabled && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{habit.name}</span>
              {!habit.enabled && <span className="ml-auto text-xs text-gray-400">{habit.duration}min</span>}
            </button>

            {habit.enabled && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Duration (min)</label>
                    <input type="number" value={habit.duration} min="5" max="240" step="5"
                      onChange={e => updateHabit(habit.id, 'duration', parseInt(e.target.value) || 15)}
                      className={inputClass} style={ringStyle} />
                  </div>
                  <div>
                    <label className={labelClass}>Preferred time</label>
                    <input type="time" value={habit.preferredTime}
                      onChange={e => updateHabit(habit.id, 'preferredTime', e.target.value)}
                      className={inputClass} style={ringStyle} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Recurrence</label>
                  <select value={habit.recurrence} onChange={e => updateHabit(habit.id, 'recurrence', e.target.value)}
                    className={inputClass} style={ringStyle}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon–Fri)</option>
                    <option value="weekend">Weekends</option>
                    <option value="custom">Custom days</option>
                  </select>
                </div>
                {habit.recurrence === 'custom' && (
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, i) => (
                      <button key={i} type="button" onClick={() => toggleHabitDay(habit.id, i)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${habit.customDays.includes(i) ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                        style={habit.customDays.includes(i) ? { background: 'var(--accent-color)' } : undefined}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="text" value={customHabitName} onChange={e => setCustomHabitName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomHabit()}
          placeholder="Add your own habit..."
          className={inputClass} style={ringStyle} />
        <button type="button" onClick={addCustomHabit} disabled={!customHabitName.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 flex-shrink-0"
          style={{ background: 'var(--accent-color)' }}>
          Add
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Long-term goals</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Certifications, courses, projects — the AI will schedule daily progress sessions.</p>

      <div className="flex gap-3 mb-5">
        <button type="button" onClick={() => setProject(p => ({ ...p, enabled: true }))}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${project.enabled ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
          style={project.enabled ? { background: 'var(--accent-color)' } : undefined}>
          Yes, I have a project
        </button>
        <button type="button" onClick={() => setProject(p => ({ ...p, enabled: false }))}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${!project.enabled ? 'text-white border-transparent' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
          style={!project.enabled ? { background: 'var(--accent-color)' } : undefined}>
          Not right now
        </button>
      </div>

      {project.enabled && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Goal title <span className="text-red-400">*</span></label>
            <input type="text" value={project.title} onChange={e => setProject(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. AWS certification, Learn Spanish, Write a book..."
              className={inputClass} style={ringStyle} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Target date <span className="text-red-400">*</span></label>
              <input type="date" value={project.targetDate} onChange={e => setProject(p => ({ ...p, targetDate: e.target.value }))}
                className={inputClass} style={ringStyle} />
            </div>
            <div>
              <label className={labelClass}>Daily study (min)</label>
              <input type="number" value={project.studyDuration} onChange={e => setProject(p => ({ ...p, studyDuration: parseInt(e.target.value) || 45 }))}
                min="15" max="180" step="5" className={inputClass} style={ringStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Preferred study time (optional)</label>
            <input type="time" value={project.preferredTime} onChange={e => setProject(p => ({ ...p, preferredTime: e.target.value }))}
              className={inputClass} style={ringStyle} />
          </div>
          <p className="text-xs text-gray-400">The AI will fit study sessions around your other commitments.</p>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">When do you do your best work?</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">The AI schedules important tasks at your peak time.</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {PEAK_OPTIONS.map(opt => (
          <button key={opt.id} type="button" onClick={() => setPeakTime(opt.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${peakTime === opt.id ? 'border-transparent' : 'border-gray-200 dark:border-gray-700'}`}
            style={peakTime === opt.id ? { background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)', borderColor: 'var(--accent-color)' } : undefined}>
            <div className="text-2xl mb-1">{opt.emoji}</div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{opt.sub}</p>
          </button>
        ))}
      </div>

      <div>
        <label className={labelClass}>Anything else for your AI assistant? (optional)</label>
        <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
          placeholder="e.g. I pick up kids at 3pm, I don't work Sundays, I prefer short tasks in the morning..."
          rows={3} className={`${inputClass} resize-none`} style={ringStyle} />
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all set!</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Here's what we've set up for you:</p>

      <div className="space-y-2 text-left mb-6">
        {work.enabled && work.startTime && work.endTime && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <span className="text-lg">💼</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{work.name}</p>
              <p className="text-xs text-gray-500">{work.startTime} – {work.endTime} · {work.days.map(d => DAY_LABELS[d]).join(', ')}</p>
            </div>
          </div>
        )}
        {enabledHabits.map(h => (
          <div key={h.id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <span className="text-lg">🔄</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{h.name}</p>
              <p className="text-xs text-gray-500">{h.duration}min · {h.recurrence}{h.preferredTime ? ` at ${h.preferredTime}` : ''}</p>
            </div>
          </div>
        ))}
        {project.enabled && project.title && project.targetDate && (
          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{project.title}</p>
              <p className="text-xs text-gray-500">{project.studyDuration}min/day · target {project.targetDate}</p>
            </div>
          </div>
        )}
        {!work.enabled && enabledHabits.length === 0 && !project.enabled && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No recurring items — you can add them any time from Tasks.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">Your AI assistant is ready to plan around your life.</p>
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6][step - 1]?.();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-lg">
        {/* Progress */}
        <div className="px-8 pt-8 pb-2">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'var(--accent-color)' }} />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 min-h-[380px] overflow-y-auto max-h-[60vh]">
          {stepContent}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex gap-3">
          {step > 1 && step < 6 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Back
            </button>
          )}
          {step < 5 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--accent-color)' }}>
              {step === 1 ? "Let's get started" : 'Next'}
            </button>
          )}
          {step === 5 && (
            <button onClick={() => setStep(6)}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'var(--accent-color)' }}>
              Review & Finish
            </button>
          )}
          {step === 6 && (
            <button onClick={handleFinish} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent-color)' }}>
              {saving ? 'Setting up...' : 'Go to Dashboard →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
