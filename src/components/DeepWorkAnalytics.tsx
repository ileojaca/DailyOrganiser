'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDb } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface FocusSession {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  taskId?: string;
  interruptions: number;
  quality: number; // 1-5 rating
  notes?: string;
}

export default function DeepWorkAnalytics() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    if (!user?.uid) return;

    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const q = query(
      collection(getDb(), 'focusSessions'),
      where('userId', '==', user.uid),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate()
      })) as FocusSession[];
      setSessions(sessionData);
    });

    return unsubscribe;
  }, [user?.uid, timeRange]);

  const totalFocusTime = sessions.reduce((sum, session) => sum + session.duration, 0);
  const averageSessionLength = sessions.length > 0 ? Math.round(totalFocusTime / sessions.length) : 0;
  const averageQuality = sessions.length > 0
    ? Math.round((sessions.reduce((sum, session) => sum + session.quality, 0) / sessions.length) * 10) / 10
    : 0;
  const totalInterruptions = sessions.reduce((sum, session) => sum + session.interruptions, 0);

  const getQualityColor = (quality: number) => {
    if (quality >= 4) return 'text-green-600 bg-green-50';
    if (quality >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 4) return 'Excellent';
    if (quality >= 3) return 'Good';
    if (quality >= 2) return 'Fair';
    return 'Poor';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getBestFocusTime = () => {
    if (sessions.length === 0) return 'No data yet';

    const hourCounts = new Array(24).fill(0);
    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      hourCounts[hour]++;
    });

    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
    const hour12 = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
    const ampm = bestHour >= 12 ? 'PM' : 'AM';
    return `${hour12}:00 ${ampm}`;
  };

  const getProductivityInsights = () => {
    const insights = [];

    if (sessions.length === 0) {
      insights.push('Start your first focus session to see insights!');
      return insights;
    }

    if (averageQuality >= 4) {
      insights.push('🎯 Your focus quality is excellent! Keep up the great work.');
    } else if (averageQuality >= 3) {
      insights.push('📈 Your focus quality is good. Try minimizing interruptions for better results.');
    } else {
      insights.push('⚡ Consider shorter sessions or different times to improve focus quality.');
    }

    if (averageSessionLength > 90) {
      insights.push('⏰ Long sessions detected. Remember to take breaks every 90 minutes.');
    } else if (averageSessionLength < 25) {
      insights.push('⏱️ Short sessions work well for you. Consider building up gradually.');
    }

    if (totalInterruptions > sessions.length * 2) {
      insights.push('🚫 High interruption rate. Try creating a dedicated focus environment.');
    }

    const bestTime = getBestFocusTime();
    insights.push(`🌅 Your most productive time appears to be around ${bestTime}.`);

    return insights;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Deep Work Analytics</h3>
          <p className="text-sm text-gray-500">Track your focus sessions and productivity patterns</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">Last 3 Months</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{formatDuration(totalFocusTime)}</div>
          <p className="text-xs text-gray-500">Total Focus Time</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{sessions.length}</div>
          <p className="text-xs text-gray-500">Sessions Completed</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{formatDuration(averageSessionLength)}</div>
          <p className="text-xs text-gray-500">Avg Session</p>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getQualityColor(averageQuality).split(' ')[0]}`}>
            {averageQuality}/5
          </div>
          <p className="text-xs text-gray-500">Avg Quality</p>
        </div>
      </div>

      {/* Productivity Insights */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Productivity Insights</h4>
        <div className="space-y-2">
          {getProductivityInsights().map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-600 mt-0.5">💡</div>
              <p className="text-sm text-blue-800">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Focus Sessions</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sessions.slice(0, 10).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getQualityColor(session.quality)}`}>
                    <span className="text-sm font-bold">{session.quality}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {session.startTime.toLocaleDateString()} • {formatDuration(session.duration)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {session.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {session.interruptions > 0 && ` • ${session.interruptions} interruptions`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${getQualityColor(session.quality)}`}>
                    {getQualityLabel(session.quality)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Focus Sessions Yet</h4>
          <p className="text-gray-500 mb-4">Start your first focus session to see analytics and insights.</p>
          <button
            onClick={() => window.location.href = '/focus'}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Go to Focus Timer
          </button>
        </div>
      )}
    </div>
  );
}