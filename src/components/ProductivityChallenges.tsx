'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'streak' | 'completion' | 'time' | 'combo';
  target: number;
  duration: number; // in days
  reward: {
    points: number;
    badge?: string;
    title?: string;
  };
  requirements: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface UserChallenge {
  id: string;
  challengeId: string;
  userId: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'failed';
}

const AVAILABLE_CHALLENGES: Challenge[] = [
  {
    id: 'morning-routine',
    title: 'Morning Champion',
    description: 'Complete your morning routine for 7 consecutive days',
    type: 'streak',
    target: 7,
    duration: 7,
    reward: { points: 150, badge: '🌅', title: 'Early Bird' },
    requirements: ['Wake up before 7 AM', 'Exercise for 20+ minutes', 'Meditate or journal'],
    difficulty: 'medium',
    category: 'Health'
  },
  {
    id: 'focus-master',
    title: 'Focus Master',
    description: 'Complete 10 focus sessions with quality rating 4+',
    type: 'completion',
    target: 10,
    duration: 14,
    reward: { points: 200, badge: '🎯', title: 'Concentration King' },
    requirements: ['25+ minute sessions', 'Quality rating 4 or higher', 'No interruptions'],
    difficulty: 'hard',
    category: 'Productivity'
  },
  {
    id: 'task-completer',
    title: 'Task Destroyer',
    description: 'Complete 50 tasks in 30 days',
    type: 'completion',
    target: 50,
    duration: 30,
    reward: { points: 300, badge: '💪', title: 'Task Master' },
    requirements: ['Complete any tasks', 'Maintain completion rate', 'Track progress daily'],
    difficulty: 'medium',
    category: 'Productivity'
  },
  {
    id: 'habit-builder',
    title: 'Habit Builder',
    description: 'Maintain 3 habits with 14+ day streaks each',
    type: 'combo',
    target: 3,
    duration: 21,
    reward: { points: 250, badge: '🔥', title: 'Habit Hero' },
    requirements: ['Create 3 habits', 'Maintain 14+ day streaks', 'Track daily'],
    difficulty: 'hard',
    category: 'Habits'
  },
  {
    id: 'energy-tracker',
    title: 'Energy Optimizer',
    description: 'Log energy levels for 14 consecutive days',
    type: 'streak',
    target: 14,
    duration: 14,
    reward: { points: 100, badge: '⚡', title: 'Energy Expert' },
    requirements: ['Log energy 1-10 scale', 'Note contributing factors', 'Track daily patterns'],
    difficulty: 'easy',
    category: 'Wellness'
  },
  {
    id: 'deep-work-week',
    title: 'Deep Work Week',
    description: 'Accumulate 20+ hours of focused work time in 7 days',
    type: 'time',
    target: 1200, // 20 hours in minutes
    duration: 7,
    reward: { points: 180, badge: '🧠', title: 'Deep Thinker' },
    requirements: ['Focus sessions only', '25+ minutes each', 'High quality rating'],
    difficulty: 'medium',
    category: 'Productivity'
  }
];

export default function ProductivityChallenges() {
  const { user } = useAuth();
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showChallengeDetails, setShowChallengeDetails] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(AVAILABLE_CHALLENGES.map(c => c.category)))];

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'userChallenges'),
      where('userId', '==', user.uid),
      orderBy('startedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })) as UserChallenge[];
      setUserChallenges(challengeData);
    });

    return unsubscribe;
  }, [user?.uid]);

  const startChallenge = async (challengeId: string) => {
    if (!user?.uid) return;

    const existingChallenge = userChallenges.find(uc => uc.challengeId === challengeId && uc.status === 'active');
    if (existingChallenge) return; // Already active

    try {
      await addDoc(collection(db, 'userChallenges'), {
        challengeId,
        userId: user.uid,
        progress: 0,
        startedAt: Timestamp.now(),
        status: 'active'
      });
    } catch (error) {
      console.error('Error starting challenge:', error);
    }
  };

  const getChallengeStatus = (challenge: Challenge) => {
    const userChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
    return userChallenge?.status || 'not-started';
  };

  const getProgress = (challenge: Challenge) => {
    const userChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
    return userChallenge?.progress || 0;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredChallenges = selectedCategory === 'All'
    ? AVAILABLE_CHALLENGES
    : AVAILABLE_CHALLENGES.filter(c => c.category === selectedCategory);

  const activeChallenges = userChallenges.filter(uc => uc.status === 'active');
  const completedChallenges = userChallenges.filter(uc => uc.status === 'completed');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Productivity Challenges</h3>
          <p className="text-sm text-gray-500">Gamify your productivity journey with rewarding challenges</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Challenge Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{activeChallenges.length}</div>
          <p className="text-xs text-gray-500">Active Challenges</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completedChallenges.length}</div>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {completedChallenges.reduce((sum, c) => {
              const challenge = AVAILABLE_CHALLENGES.find(ac => ac.id === c.challengeId);
              return sum + (challenge?.reward.points || 0);
            }, 0)}
          </div>
          <p className="text-xs text-gray-500">Points Earned</p>
        </div>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Active Challenges</h4>
          <div className="space-y-3">
            {activeChallenges.map((userChallenge) => {
              const challenge = AVAILABLE_CHALLENGES.find(c => c.id === userChallenge.challengeId);
              if (!challenge) return null;

              const progressPercent = (userChallenge.progress / challenge.target) * 100;

              return (
                <div key={userChallenge.id} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{challenge.title}</h5>
                    <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Progress: {userChallenge.progress} / {challenge.target}
                    </span>
                    <span className="font-medium text-blue-600">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Challenges */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Available Challenges</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredChallenges.map((challenge) => {
            const status = getChallengeStatus(challenge);
            const progress = getProgress(challenge);

            return (
              <div key={challenge.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-1">{challenge.title}</h5>
                    <p className="text-sm text-gray-600 mb-2">{challenge.description}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">{challenge.category}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{challenge.duration} days</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">{challenge.reward.points}</div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>

                {status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <span className="text-lg">✅</span>
                    <span className="text-sm font-medium">Completed!</span>
                    <span className="text-lg">{challenge.reward.badge}</span>
                  </div>
                )}

                {status === 'active' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{progress} / {challenge.target}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(progress / challenge.target) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChallengeDetails(challenge.id)}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Details
                  </button>
                  {status === 'not-started' && (
                    <button
                      onClick={() => startChallenge(challenge.id)}
                      className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Start
                    </button>
                  )}
                  {status === 'active' && (
                    <button
                      className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg cursor-not-allowed"
                      disabled
                    >
                      Active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Challenge Details Modal */}
      {showChallengeDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {(() => {
                const challenge = AVAILABLE_CHALLENGES.find(c => c.id === showChallengeDetails);
                if (!challenge) return null;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
                      <button
                        onClick={() => setShowChallengeDetails(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <p className="text-gray-600 mb-4">{challenge.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500">Duration</span>
                        <div className="font-medium">{challenge.duration} days</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Reward</span>
                        <div className="font-medium flex items-center gap-1">
                          {challenge.reward.points} points {challenge.reward.badge}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                      <ul className="space-y-1">
                        {challenge.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-indigo-500 mt-1">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          startChallenge(challenge.id);
                          setShowChallengeDetails(null);
                        }}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        Start Challenge
                      </button>
                      <button
                        onClick={() => setShowChallengeDetails(null)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}