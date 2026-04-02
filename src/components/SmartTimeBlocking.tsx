'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDb } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';

interface TimeBlock {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  category: 'work' | 'personal' | 'health' | 'learning' | 'social';
  priority: number; // 1-5
  energyRequired: number; // 1-10
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes
  isFlexible: boolean;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Conflict {
  block1: TimeBlock;
  block2: TimeBlock;
  overlapMinutes: number;
}

const CATEGORY_COLORS = {
  work: 'bg-blue-500',
  personal: 'bg-green-500',
  health: 'bg-red-500',
  learning: 'bg-purple-500',
  social: 'bg-pink-500'
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SmartTimeBlocking() {
  const { user } = useAuth();
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'work' as TimeBlock['category'],
    priority: 3,
    energyRequired: 5,
    bufferBefore: 15,
    bufferAfter: 15,
    isFlexible: false,
    notes: ''
  });

  useEffect(() => {
    if (!user?.uid) return;

    const startOfDay = new Date(`${selectedDate}T00:00:00`);
    const endOfDay = new Date(`${selectedDate}T23:59:59`);

    const q = query(
      collection(getDb(), 'timeBlocks'),
      where('userId', '==', user.uid),
      where('startTime', '>=', Timestamp.fromDate(startOfDay)),
      where('startTime', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blocks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate()
      })) as TimeBlock[];
      setTimeBlocks(blocks);
      detectConflicts(blocks);
    });

    return unsubscribe;
  }, [user?.uid, selectedDate]);

  const detectConflicts = (blocks: TimeBlock[]) => {
    const conflicts: Conflict[] = [];
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const block1 = blocks[i];
        const block2 = blocks[j];

        if (block1.startTime < block2.endTime && block2.startTime < block1.endTime) {
          const overlapStart = new Date(Math.max(block1.startTime.getTime(), block2.startTime.getTime()));
          const overlapEnd = new Date(Math.min(block1.endTime.getTime(), block2.endTime.getTime()));
          const overlapMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));

          conflicts.push({
            block1,
            block2,
            overlapMinutes
          });
        }
      }
    }
    setConflicts(conflicts);
  };

  const saveTimeBlock = async () => {
    if (!user?.uid) return;

    const startDateTime = new Date(`${selectedDate}T${newBlock.startTime}:00`);
    const endDateTime = new Date(`${selectedDate}T${newBlock.endTime}:00`);

    if (endDateTime <= startDateTime) {
      alert('End time must be after start time');
      return;
    }

    try {
      const blockData = {
        userId: user.uid,
        title: newBlock.title,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        category: newBlock.category,
        priority: newBlock.priority,
        energyRequired: newBlock.energyRequired,
        bufferBefore: newBlock.bufferBefore,
        bufferAfter: newBlock.bufferAfter,
        isFlexible: newBlock.isFlexible,
        notes: newBlock.notes || null,
        status: 'scheduled' as const
      };

      if (editingBlock) {
        await updateDoc(doc(getDb(), 'timeBlocks', editingBlock.id), blockData);
        setEditingBlock(null);
      } else {
        await addDoc(collection(getDb(), 'timeBlocks'), blockData);
      }

      setNewBlock({
        title: '',
        startTime: '09:00',
        endTime: '10:00',
        category: 'work',
        priority: 3,
        energyRequired: 5,
        bufferBefore: 15,
        bufferAfter: 15,
        isFlexible: false,
        notes: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error saving time block:', error);
    }
  };

  const deleteTimeBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this time block?')) return;

    try {
      await deleteDoc(doc(getDb(), 'timeBlocks', blockId));
    } catch (error) {
      console.error('Error deleting time block:', error);
    }
  };

  const editTimeBlock = (block: TimeBlock) => {
    setEditingBlock(block);
    setNewBlock({
      title: block.title,
      startTime: block.startTime.toTimeString().slice(0, 5),
      endTime: block.endTime.toTimeString().slice(0, 5),
      category: block.category,
      priority: block.priority,
      energyRequired: block.energyRequired,
      bufferBefore: block.bufferBefore,
      bufferAfter: block.bufferAfter,
      isFlexible: block.isFlexible,
      notes: block.notes || ''
    });
    setShowCreateForm(true);
  };

  const getAISuggestions = () => {
    const suggestions = [];

    if (conflicts.length > 0) {
      suggestions.push('⚠️ Conflicts detected! Consider rescheduling overlapping blocks.');
    }

    const totalScheduled = timeBlocks.reduce((sum, block) => {
      return sum + (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60);
    }, 0);

    if (totalScheduled > 8 * 60) {
      suggestions.push('⏰ Over 8 hours scheduled today. Consider adding breaks.');
    }

    const workBlocks = timeBlocks.filter(b => b.category === 'work');
    if (workBlocks.length > 0) {
      const avgEnergy = workBlocks.reduce((sum, b) => sum + b.energyRequired, 0) / workBlocks.length;
      if (avgEnergy > 7) {
        suggestions.push('🔋 High-energy work blocks detected. Schedule rest periods.');
      }
    }

    const hasBreaks = timeBlocks.some(block =>
      block.category === 'health' || block.title.toLowerCase().includes('break')
    );
    if (!hasBreaks && totalScheduled > 4 * 60) {
      suggestions.push('☕ No breaks scheduled. Add short breaks between intense sessions.');
    }

    return suggestions;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBlockStyle = (block: TimeBlock) => {
    const hasConflict = conflicts.some(c => c.block1.id === block.id || c.block2.id === block.id);
    return `${CATEGORY_COLORS[block.category]} ${hasConflict ? 'ring-2 ring-red-400' : ''}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Smart Time Blocking</h3>
          <p className="text-sm text-gray-500">AI-powered calendar optimization with conflict detection</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            + Add Block
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      {getAISuggestions().length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">AI Suggestions</h4>
          <div className="space-y-2">
            {getAISuggestions().map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600 mt-0.5">💡</div>
                <p className="text-sm text-blue-800">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">⚠️</span>
            <h4 className="text-sm font-medium text-red-900">Schedule Conflicts Detected</h4>
          </div>
          <div className="space-y-1">
            {conflicts.map((conflict, index) => (
              <p key={index} className="text-sm text-red-700">
                "{conflict.block1.title}" and "{conflict.block2.title}" overlap by {conflict.overlapMinutes} minutes
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Time Grid */}
      <div className="mb-6">
        <div className="grid grid-cols-1 gap-2">
          {HOURS.map(hour => {
            const hourBlocks = timeBlocks.filter(block => block.startTime.getHours() === hour);
            return (
              <div key={hour} className="flex items-center gap-2 p-2 border-b border-gray-100">
                <div className="w-16 text-sm text-gray-500 font-mono">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 min-h-[40px] relative">
                  {hourBlocks.map(block => (
                    <div
                      key={block.id}
                      className={`absolute top-0 h-10 rounded-lg p-2 text-white text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getBlockStyle(block)}`}
                      style={{
                        left: `${(block.startTime.getMinutes() / 60) * 100}%`,
                        width: `${((block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60 * 60)) * 100}%`
                      }}
                      onClick={() => editTimeBlock(block)}
                      title={`${block.title} (${formatTime(block.startTime)} - ${formatTime(block.endTime)})`}
                    >
                      <div className="truncate">{block.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Blocks List */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Scheduled Blocks ({timeBlocks.length})</h4>
        {timeBlocks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Time Blocks</h4>
            <p className="text-gray-500 mb-4">Create your first time block to get started with smart scheduling.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Create First Block
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {timeBlocks.map(block => (
              <div key={block.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[block.category]}`} />
                  <div>
                    <h5 className="font-medium text-gray-900">{block.title}</h5>
                    <p className="text-sm text-gray-500">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      {block.bufferBefore > 0 && ` (+${block.bufferBefore}m buffer)`}
                      {block.bufferAfter > 0 && ` (+${block.bufferAfter}m after)`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Priority: {block.priority}/5</span>
                      <span className="text-xs text-gray-500">Energy: {block.energyRequired}/10</span>
                      {block.isFlexible && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Flexible</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editTimeBlock(block)}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTimeBlock(block.id)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingBlock ? 'Edit Time Block' : 'Create Time Block'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingBlock(null);
                    setNewBlock({
                      title: '',
                      startTime: '09:00',
                      endTime: '10:00',
                      category: 'work',
                      priority: 3,
                      energyRequired: 5,
                      bufferBefore: 15,
                      bufferAfter: 15,
                      isFlexible: false,
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={newBlock.title}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Team Meeting, Exercise, Deep Work"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newBlock.startTime}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newBlock.endTime}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newBlock.category}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, category: e.target.value as TimeBlock['category'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-5)</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={newBlock.priority}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, priority: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-sm text-gray-500 mt-1">{newBlock.priority}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Energy Required (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newBlock.energyRequired}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, energyRequired: Number(e.target.value) }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-sm text-gray-500 mt-1">{newBlock.energyRequired}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Before (min)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={newBlock.bufferBefore}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, bufferBefore: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buffer After (min)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={newBlock.bufferAfter}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, bufferAfter: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="flexible"
                    type="checkbox"
                    checked={newBlock.isFlexible}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, isFlexible: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="flexible" className="text-sm text-gray-700">Flexible timing (can be rescheduled by AI)</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={newBlock.notes}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    placeholder="Additional details or context..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveTimeBlock}
                    disabled={!newBlock.title.trim()}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {editingBlock ? 'Update Block' : 'Create Block'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingBlock(null);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}