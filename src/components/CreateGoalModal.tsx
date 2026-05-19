'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, Goal, GoalRecurrence } from '@/hooks/useGoals';

type GoalType = 'task' | 'habit' | 'block' | 'project';
type RecurrenceType = 'daily' | 'weekdays' | 'weekend' | 'weekly' | 'custom';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingGoal?: Goal;
  mode?: 'create' | 'edit';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ringStyle = { '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties;

const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function CreateGoalModal({ isOpen, onClose, onSuccess, editingGoal, mode = 'create' }: CreateGoalModalProps) {
  const { user } = useAuth();
  const { createGoal, updateGoal, deleteGoal } = useGoals(user?.uid);

  // Goal type tab
  const [goalType, setGoalType] = useState<GoalType>('task');

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Goal['category']>('work');
  const [priority, setPriority] = useState('3');

  // Task fields
  const [duration, setDuration] = useState('60');
  const [deadline, setDeadline] = useState('');

  // Habit fields
  const [habitDuration, setHabitDuration] = useState('30');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerDay, setTimesPerDay] = useState('1');
  const [preferredTime, setPreferredTime] = useState('');

  // Time Block fields
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [breakDuration, setBreakDuration] = useState('0');
  const [blockRecurrenceType, setBlockRecurrenceType] = useState<RecurrenceType>('weekdays');
  const [blockCustomDays, setBlockCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Project fields
  const [targetDate, setTargetDate] = useState('');
  const [studySessionDuration, setStudySessionDuration] = useState('45');
  const [projectPreferredTime, setProjectPreferredTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prefill from editingGoal when mode=edit
  useEffect(() => {
    if (mode === 'edit' && editingGoal) {
      setGoalType(editingGoal.goalType || 'task');
      setTitle(editingGoal.title || '');
      setDescription(editingGoal.description || '');
      setCategory(editingGoal.category || 'work');
      setPriority(String(editingGoal.priority || 3));
      setDuration(String(editingGoal.estimatedDuration || 60));
      if (editingGoal.deadline) {
        const d = new Date(editingGoal.deadline);
        setDeadline(d.toISOString().split('T')[0]);
      }
      if (editingGoal.recurrence) {
        const r = editingGoal.recurrence;
        if (editingGoal.goalType === 'block') {
          setBlockRecurrenceType(r.type);
          setBlockCustomDays(r.days || [1, 2, 3, 4, 5]);
          setBlockStart(r.fixedStart || '');
          setBlockEnd(r.fixedEnd || '');
          setBreakDuration(String(r.breakDuration || 0));
        } else if (editingGoal.goalType === 'habit') {
          setRecurrenceType(r.type);
          setCustomDays(r.days || []);
          setTimesPerDay(String(r.timesPerDay || 1));
          setPreferredTime(r.preferredTime || '');
          setHabitDuration(String(editingGoal.estimatedDuration || 30));
        }
      }
      if (editingGoal.targetDate) {
        const d = new Date(editingGoal.targetDate);
        setTargetDate(d.toISOString().split('T')[0]);
      }
      if (editingGoal.studySessionDuration) {
        setStudySessionDuration(String(editingGoal.studySessionDuration));
      }
    } else if (mode === 'create') {
      // Reset all fields
      setGoalType('task');
      setTitle('');
      setDescription('');
      setCategory('work');
      setPriority('3');
      setDuration('60');
      setDeadline('');
      setHabitDuration('30');
      setRecurrenceType('daily');
      setCustomDays([1, 2, 3, 4, 5]);
      setTimesPerDay('1');
      setPreferredTime('');
      setBlockStart('');
      setBlockEnd('');
      setBreakDuration('0');
      setBlockRecurrenceType('weekdays');
      setBlockCustomDays([1, 2, 3, 4, 5]);
      setTargetDate('');
      setStudySessionDuration('45');
      setProjectPreferredTime('');
      setError('');
    }
  }, [editingGoal, mode, isOpen]);

  const toggleCustomDay = (day: number, isBlock: boolean) => {
    if (isBlock) {
      setBlockCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    } else {
      setCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }
  };

  const computeBlockDuration = (): number => {
    const [sh, sm] = blockStart.split(':').map(Number);
    const [eh, em] = blockEnd.split(':').map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, total - parseInt(breakDuration || '0'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let recurrence: GoalRecurrence | undefined;
      let estimatedDuration: number | undefined;
      let parsedDeadline: Date | undefined;
      let parsedTargetDate: Date | undefined;
      let parsedStudySession: number | undefined;
      let finalTitle = title.trim();
      let finalPriority = parseInt(priority);
      let finalCategory = category;

      if (goalType === 'task') {
        estimatedDuration = parseInt(duration) || 60;
        if (deadline) parsedDeadline = new Date(deadline);
      } else if (goalType === 'habit') {
        estimatedDuration = parseInt(habitDuration) || 30;
        recurrence = {
          type: recurrenceType,
          timesPerDay: parseInt(timesPerDay) || 1,
          preferredTime: preferredTime || undefined,
        };
        if (recurrenceType === 'custom') recurrence.days = customDays;
      } else if (goalType === 'block') {
        if (!finalTitle) return setError('Please enter a name for this time block');
        if (!blockStart || !blockEnd) return setError('Please set start and end times');
        finalPriority = 5;
        estimatedDuration = computeBlockDuration();
        recurrence = {
          type: blockRecurrenceType,
          fixedStart: blockStart,
          fixedEnd: blockEnd,
          breakDuration: parseInt(breakDuration) || 0,
        } as GoalRecurrence;
        if (blockRecurrenceType === 'custom') recurrence.days = blockCustomDays;
      } else if (goalType === 'project') {
        if (targetDate) parsedTargetDate = new Date(targetDate);
        parsedStudySession = parseInt(studySessionDuration) || 45;
        estimatedDuration = parsedStudySession;
        recurrence = {
          type: 'daily',
          preferredTime: projectPreferredTime || undefined,
          timesPerDay: 1,
        };
      }

      if (mode === 'edit' && editingGoal) {
        await updateGoal(editingGoal.id, {
          title: finalTitle,
          description: description.trim() || undefined,
          category: finalCategory,
          priority: finalPriority,
          estimatedDuration,
          deadline: parsedDeadline,
          goalType,
          recurrence,
          targetDate: parsedTargetDate,
          studySessionDuration: parsedStudySession,
        });
      } else {
        await createGoal({
          title: finalTitle,
          description: description.trim() || undefined,
          category: finalCategory,
          priority: finalPriority,
          estimatedDuration,
          deadline: parsedDeadline,
          goalType,
          recurrence,
          targetDate: parsedTargetDate,
          studySessionDuration: parsedStudySession,
        });
      }

      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingGoal || !user) return;
    if (!window.confirm(`Delete "${editingGoal.title}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await deleteGoal(editingGoal.id);
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const GOAL_TYPES: { id: GoalType; label: string }[] = [
    { id: 'task', label: 'Task' },
    { id: 'habit', label: 'Habit' },
    { id: 'block', label: 'Time Block' },
    { id: 'project', label: 'Project' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full lg:w-[480px] lg:rounded-2xl rounded-t-2xl shadow-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'edit' ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goal type tabs */}
        {mode === 'create' && (
          <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 overflow-x-auto">
            {GOAL_TYPES.map(gt => (
              <button
                key={gt.id}
                type="button"
                onClick={() => setGoalType(gt.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  goalType === gt.id
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                style={goalType === gt.id ? { background: 'var(--accent-color)' } : undefined}
              >
                {gt.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable form content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Title - shown for all types, optional for block */}
            <div>
              <label className={labelClass}>
                {goalType === 'block' ? 'Block name' : 'Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={goalType === 'block' ? 'e.g., Work, Family time, Prayer, Exercise...' : goalType === 'project' ? 'e.g., AWS Solutions Architect certification' : 'What do you want to achieve?'}
                className={inputClass}
                style={ringStyle}
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description {goalType !== 'project' && '(optional)'}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={goalType === 'project' ? 'Describe your goal, certification, or course...' : 'Add notes or context...'}
                rows={2}
                className={`${inputClass} resize-none`}
                style={ringStyle}
                disabled={loading}
              />
            </div>

            {/* Category and Priority - not needed for block (priority fixed at 5) */}
            {goalType !== 'block' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as Goal['category'])} className={inputClass} style={ringStyle} disabled={loading}>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="family">Family</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass} style={ringStyle} disabled={loading}>
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">Medium</option>
                    <option value="4">High</option>
                    <option value="5">Critical</option>
                  </select>
                </div>
              </div>
            )}

            {/* ---- TASK FIELDS ---- */}
            {goalType === 'task' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Duration (min)</label>
                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="5" max="480" step="5" className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                  <div>
                    <label className={labelClass}>Deadline (optional)</label>
                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                </div>
              </>
            )}

            {/* ---- HABIT FIELDS ---- */}
            {goalType === 'habit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Duration per occurrence (min)</label>
                    <input type="number" value={habitDuration} onChange={(e) => setHabitDuration(e.target.value)} min="5" max="240" step="5" className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                  <div>
                    <label className={labelClass}>Times per day</label>
                    <select value={timesPerDay} onChange={(e) => setTimesPerDay(e.target.value)} className={inputClass} style={ringStyle} disabled={loading}>
                      <option value="1">1×</option>
                      <option value="2">2×</option>
                      <option value="3">3×</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Recurrence</label>
                  <select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)} className={inputClass} style={ringStyle} disabled={loading}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays (Mon–Fri)</option>
                    <option value="weekend">Weekends (Sat–Sun)</option>
                    <option value="custom">Custom days</option>
                  </select>
                </div>

                {recurrenceType === 'custom' && (
                  <div>
                    <label className={labelClass}>Days</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleCustomDay(i, false)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            customDays.includes(i) ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                          style={customDays.includes(i) ? { background: 'var(--accent-color)' } : undefined}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Preferred time (optional)</label>
                  <input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} />
                </div>
              </>
            )}

            {/* ---- WORK BLOCK FIELDS ---- */}
            {goalType === 'block' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start time</label>
                    <input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                  <div>
                    <label className={labelClass}>End time</label>
                    <input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Break / lunch duration (min)</label>
                  <input type="number" value={breakDuration} onChange={(e) => setBreakDuration(e.target.value)} min="0" max="120" step="5" className={inputClass} style={ringStyle} disabled={loading} />
                  <p className="text-xs text-gray-400 mt-1">Net work time: {computeBlockDuration()} min</p>
                </div>

                <div>
                  <label className={labelClass}>Recurrence</label>
                  <select value={blockRecurrenceType} onChange={(e) => setBlockRecurrenceType(e.target.value as RecurrenceType)} className={inputClass} style={ringStyle} disabled={loading}>
                    <option value="weekdays">Weekdays (Mon–Fri)</option>
                    <option value="daily">Daily</option>
                    <option value="weekend">Weekends (Sat–Sun)</option>
                    <option value="custom">Custom days</option>
                  </select>
                </div>

                {blockRecurrenceType === 'custom' && (
                  <div>
                    <label className={labelClass}>Days</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleCustomDay(i, true)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            blockCustomDays.includes(i) ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                          style={blockCustomDays.includes(i) ? { background: 'var(--accent-color)' } : undefined}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as Goal['category'])} className={inputClass} style={ringStyle} disabled={loading}>
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="family">Family</option>
                    <option value="social">Social</option>
                  </select>
                </div>
              </>
            )}

            {/* ---- PROJECT FIELDS ---- */}
            {goalType === 'project' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Target date <span className="text-red-500">*</span></label>
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} required />
                  </div>
                  <div>
                    <label className={labelClass}>Study session (min)</label>
                    <input type="number" value={studySessionDuration} onChange={(e) => setStudySessionDuration(e.target.value)} min="15" max="240" step="5" className={inputClass} style={ringStyle} disabled={loading} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Preferred study time (optional)</label>
                  <input type="time" value={projectPreferredTime} onChange={(e) => setProjectPreferredTime(e.target.value)} className={inputClass} style={ringStyle} disabled={loading} />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex gap-3">
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || (goalType === 'block' && (!blockStart || !blockEnd)) || (goalType === 'project' && !targetDate)}
                className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--accent-color)' }}
              >
                {mode === 'edit' ? null : <Plus className="w-4 h-4" />}
                {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create Goal')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
