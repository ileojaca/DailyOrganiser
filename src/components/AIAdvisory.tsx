'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { LifeAdvice, WeeklyLifeReview, BurnoutPrediction } from '@/types/lifeManagement';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, query, orderBy, limit } from 'firebase/firestore';

export default function AIAdvisory() {
  const { user } = useAuth();
  const [advice, setAdvice] = useState<LifeAdvice[]>([]);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyLifeReview | null>(null);
  const [burnoutPrediction, setBurnoutPrediction] = useState<BurnoutPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'advice' | 'review' | 'burnout'>('advice');

  useEffect(() => {
    if (!user) return;

    const loadAndComputeInsights = async () => {
      try {
        const db = getDb();
        const uid = user.uid;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch all data in parallel
        const [goalsSnap, energySnap, sleepSnap, gamificationSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', uid, 'goals'), orderBy('createdAt', 'desc'), limit(50))),
          getDocs(query(collection(db, 'users', uid, 'energyLogs'), orderBy('date', 'desc'), limit(14))),
          getDocs(query(collection(db, 'users', uid, 'sleepRecords'), orderBy('date', 'desc'), limit(14))),
          getDoc(doc(db, 'users', uid, 'gamification', 'profile')),
        ]);

        const goals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const energyLogs = energySnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const sleepRecords = sleepSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const gamification = gamificationSnap.exists() ? gamificationSnap.data() : null;

        // --- Compute advice ---
        const computedAdvice: LifeAdvice[] = [];

        const recentCompletedGoals = goals.filter(g => {
          if (!g.completedAt) return false;
          const completedAt = g.completedAt?.toDate ? g.completedAt.toDate() : new Date(g.completedAt);
          return completedAt >= sevenDaysAgo;
        });

        if (recentCompletedGoals.length === 0) {
          computedAdvice.push({
            id: 'a1',
            userId: uid,
            category: 'productivity',
            insight: 'No tasks completed this week. Start with one small goal today.',
            actionItems: ['Pick your easiest pending goal', 'Set a 25-minute focus session'],
            evidence: ['0 completions in the last 7 days'],
            confidence: 0.9,
            dismissed: false,
            createdAt: now,
          });
        }

        const avgSleep = sleepRecords.length > 0
          ? sleepRecords.reduce((sum: number, r: any) => sum + (r.duration || 0), 0) / sleepRecords.length
          : null;

        if (avgSleep !== null && avgSleep < 420) {
          computedAdvice.push({
            id: 'a2',
            userId: uid,
            category: 'wellness',
            insight: `Your average sleep is ${Math.round(avgSleep / 60)}h ${Math.round(avgSleep % 60)}m, below the recommended 7 hours. Prioritize rest to improve performance.`,
            actionItems: ['Set a consistent bedtime', 'Avoid screens 30 minutes before bed'],
            evidence: [`Average sleep duration: ${Math.round(avgSleep)} minutes over last ${sleepRecords.length} records`],
            confidence: 0.85,
            dismissed: false,
            createdAt: now,
          });
        }

        const familyGoals = goals.filter((g: any) => g.category === 'family');
        const hasUserProfile = gamification !== null;
        const familyPlan = hasUserProfile ? gamification?.familyPlan : null;
        if (familyGoals.length === 0 && familyPlan) {
          computedAdvice.push({
            id: 'a3',
            userId: uid,
            category: 'relationships',
            insight: 'You have family time in your plan but no family goals set yet. Add a family goal to stay connected.',
            actionItems: ['Schedule a family activity this week', 'Add a recurring family event'],
            evidence: ['No family-category goals found', 'Family plan is configured'],
            confidence: 0.8,
            dismissed: false,
            createdAt: now,
          });
        }

        const streak = gamification?.currentStreak || 0;
        if (streak > 3) {
          computedAdvice.push({
            id: 'a4',
            userId: uid,
            category: 'growth',
            insight: `You're on a ${streak}-day streak! Keep up the momentum and challenge yourself with a harder goal.`,
            actionItems: ['Review your current goals', 'Add one stretch goal for the week'],
            evidence: [`Current streak: ${streak} days`],
            confidence: 0.95,
            dismissed: false,
            createdAt: now,
          });
        }

        setAdvice(computedAdvice);

        // --- Compute weekly review ---
        const completedThisWeek = goals.filter((g: any) => {
          if (!g.completedAt) return false;
          const completedAt = g.completedAt?.toDate ? g.completedAt.toDate() : new Date(g.completedAt);
          return completedAt >= weekStart;
        });

        const workGoalsCompleted = completedThisWeek.filter((g: any) => g.category === 'work').length;
        const totalCompleted = completedThisWeek.length;
        const workLifeBalance = totalCompleted > 0
          ? Math.round(100 - (workGoalsCompleted / totalCompleted) * 100)
          : 50;

        const familyEventsThisWeek = completedThisWeek.filter((g: any) => g.category === 'family');
        const familyTimeHours = familyEventsThisWeek.reduce((sum: number, g: any) => sum + ((g.estimatedDuration || 60) / 60), 0);

        const personalGoalsCompleted = completedThisWeek.filter((g: any) =>
          ['personal', 'health', 'learning'].includes(g.category)
        );
        const personalTimeHours = personalGoalsCompleted.reduce((sum: number, g: any) => sum + ((g.estimatedDuration || 60) / 60), 0);

        const avgSleepQuality = sleepRecords.length > 0
          ? sleepRecords.reduce((sum: number, r: any) => sum + (r.quality || 7), 0) / sleepRecords.length
          : 7;

        const overdueGoals = goals.filter((g: any) => {
          if (g.completedAt) return false;
          if (!g.targetDate) return false;
          const targetDate = g.targetDate?.toDate ? g.targetDate.toDate() : new Date(g.targetDate);
          return targetDate < now;
        });

        const reviewInsights: string[] = [];
        if (totalCompleted > 0) reviewInsights.push(`Completed ${totalCompleted} goal${totalCompleted !== 1 ? 's' : ''} this week`);
        if (familyEventsThisWeek.length > 0) reviewInsights.push(`Spent time on ${familyEventsThisWeek.length} family activit${familyEventsThisWeek.length !== 1 ? 'ies' : 'y'}`);
        if (sleepRecords.length > 0) reviewInsights.push(`Logged ${sleepRecords.length} sleep record${sleepRecords.length !== 1 ? 's' : ''} with average quality ${Math.round(avgSleepQuality * 10) / 10}/10`);
        if (reviewInsights.length === 0) reviewInsights.push('No activity data yet — start logging to see insights here');

        const reviewCelebrations = completedThisWeek.slice(0, 3).map((g: any) => `Completed: ${g.title || g.name || 'Goal'}`);

        const reviewWarnings = overdueGoals.slice(0, 3).map((g: any) => `Overdue: ${g.title || g.name || 'Goal'}`);

        const reviewRecommendations: string[] = [];
        if (workLifeBalance < 40) reviewRecommendations.push('Consider balancing work goals with personal time');
        if (familyTimeHours < 2) reviewRecommendations.push('Try to schedule at least 2 hours of family time next week');
        if (avgSleepQuality < 6) reviewRecommendations.push('Focus on improving sleep quality with a consistent routine');
        if (reviewRecommendations.length === 0) reviewRecommendations.push('Keep up the great work and maintain your current balance');

        setWeeklyReview({
          id: 'review_computed',
          userId: uid,
          weekStart,
          weekEnd: now,
          workLifeBalance,
          familyTime: Math.round(familyTimeHours * 10) / 10,
          personalTime: Math.round(personalTimeHours * 10) / 10,
          restQuality: Math.round(avgSleepQuality * 10) / 10,
          insights: reviewInsights,
          recommendations: reviewRecommendations,
          celebrations: reviewCelebrations,
          warnings: reviewWarnings,
          createdAt: now,
        });

        // --- Compute burnout prediction ---
        const incompleteHighPriority = goals.filter((g: any) => !g.completedAt && g.priority === 'high').length;

        const recentEnergyLogs = energyLogs.filter((e: any) => {
          const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
          return date >= sevenDaysAgo;
        });
        const avgEnergy = recentEnergyLogs.length > 0
          ? recentEnergyLogs.reduce((sum: number, e: any) => sum + (e.level || e.energy || 5), 0) / recentEnergyLogs.length
          : null;

        const optimalSleepMinutes = 8 * 60;
        const sleepDebtHours = sleepRecords.length > 0
          ? sleepRecords.reduce((debt: number, r: any) => debt + Math.max(0, optimalSleepMinutes - (r.duration || 0)), 0) / 60
          : 0;

        let riskScore = 0;
        const burnoutFactors: string[] = [];
        const burnoutRecommendations: string[] = [];

        if (incompleteHighPriority > 5) {
          riskScore += 2;
          burnoutFactors.push(`${incompleteHighPriority} incomplete high-priority goals`);
          burnoutRecommendations.push('Prioritize and delegate some high-priority goals');
        }
        if (avgEnergy !== null && avgEnergy < 5) {
          riskScore += 2;
          burnoutFactors.push(`Average energy level is low (${Math.round(avgEnergy * 10) / 10}/10)`);
          burnoutRecommendations.push('Schedule more recovery time and reduce workload');
        }
        if (sleepDebtHours > 5) {
          riskScore += 2;
          burnoutFactors.push(`Sleep debt of ${Math.round(sleepDebtHours * 10) / 10} hours accumulated`);
          burnoutRecommendations.push('Prioritize catching up on sleep this week');
        }
        if (overdueGoals.length > 3) {
          riskScore += 1;
          burnoutFactors.push(`${overdueGoals.length} overdue goals creating stress`);
          burnoutRecommendations.push('Review and reschedule overdue goals to reduce pressure');
        }

        if (burnoutFactors.length === 0) burnoutFactors.push('No significant risk factors detected');
        if (burnoutRecommendations.length === 0) burnoutRecommendations.push('Maintain your current healthy work-life balance');

        let riskLevel: BurnoutPrediction['riskLevel'] = 'low';
        let timeToBurnout = 90;
        let confidence = 0.6;

        if (riskScore >= 6) {
          riskLevel = 'critical';
          timeToBurnout = 7;
          confidence = 0.85;
        } else if (riskScore >= 4) {
          riskLevel = 'high';
          timeToBurnout = 14;
          confidence = 0.8;
        } else if (riskScore >= 2) {
          riskLevel = 'medium';
          timeToBurnout = 30;
          confidence = 0.7;
        }

        setBurnoutPrediction({
          userId: uid,
          riskLevel,
          confidence,
          factors: burnoutFactors,
          recommendations: burnoutRecommendations,
          timeToBurnout,
          predictedAt: now,
        });
      } catch (err) {
        console.error('Error loading AI advisory data from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAndComputeInsights();
  }, [user]);

  const dismissAdvice = (id: string) => {
    setAdvice(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const getCategoryIcon = (category: LifeAdvice['category']) => {
    const icons: Record<LifeAdvice['category'], string> = {
      productivity: '⚡',
      wellness: '🧘',
      relationships: '❤️',
      growth: '🌱',
    };
    return icons[category];
  };

  const getCategoryColor = (category: LifeAdvice['category']) => {
    const colors: Record<LifeAdvice['category'], string> = {
      productivity: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      wellness: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      relationships: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      growth: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    };
    return colors[category];
  };

  const getRiskColor = (risk: BurnoutPrediction['riskLevel']) => {
    const colors: Record<BurnoutPrediction['riskLevel'], string> = {
      low: 'text-green-600 dark:text-green-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      high: 'text-orange-600 dark:text-orange-400',
      critical: 'text-red-600 dark:text-red-400',
    };
    return colors[risk];
  };

  const getRiskBg = (risk: BurnoutPrediction['riskLevel']) => {
    const colors: Record<BurnoutPrediction['riskLevel'], string> = {
      low: 'bg-green-100 dark:bg-green-900/20',
      medium: 'bg-yellow-100 dark:bg-yellow-900/20',
      high: 'bg-orange-100 dark:bg-orange-900/20',
      critical: 'bg-red-100 dark:bg-red-900/20',
    };
    return colors[risk];
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeAdvice = advice.filter(a => !a.dismissed);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Life Advisory</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('advice')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'advice'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Insights ({activeAdvice.length})
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'review'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Weekly Review
        </button>
        <button
          onClick={() => setActiveTab('burnout')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'burnout'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Burnout Check
        </button>
      </div>

      {/* Advice Tab */}
      {activeTab === 'advice' && (
        <div className="space-y-4">
          {activeAdvice.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No new insights. Keep using the app to receive personalized advice.
            </p>
          ) : (
            activeAdvice.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border ${
                  item.dismissed ? 'opacity-50' : ''
                } ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.insight}</p>
                      <div className="mt-2 space-y-1">
                        {item.actionItems.map((action, index) => (
                          <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            • {action}
                          </p>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Confidence: {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAdvice(item.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly Review Tab */}
      {activeTab === 'review' && weeklyReview && (
        <div className="space-y-6">
          {/* Balance Score */}
          <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <p className="text-sm text-gray-600 dark:text-gray-400">Work-Life Balance</p>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {weeklyReview.workLifeBalance}/100
            </p>
          </div>

          {/* Time Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">Family</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {weeklyReview.familyTime}h
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">Personal</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {weeklyReview.personalTime}h
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">Rest</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {weeklyReview.restQuality}/10
              </p>
            </div>
          </div>

          {/* Celebrations */}
          {weeklyReview.celebrations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🎉 Celebrations
              </h4>
              <div className="space-y-2">
                {weeklyReview.celebrations.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {weeklyReview.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ⚠️ Areas to Improve
              </h4>
              <div className="space-y-2">
                {weeklyReview.warnings.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-yellow-500">!</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {weeklyReview.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                💡 Recommendations
              </h4>
              <div className="space-y-2">
                {weeklyReview.recommendations.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-indigo-500">→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Burnout Prediction Tab */}
      {activeTab === 'burnout' && burnoutPrediction && (
        <div className="space-y-6">
          {/* Risk Level */}
          <div className={`p-4 rounded-lg ${getRiskBg(burnoutPrediction.riskLevel)}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400">Burnout Risk</p>
            <p className={`text-3xl font-bold capitalize ${getRiskColor(burnoutPrediction.riskLevel)}`}>
              {burnoutPrediction.riskLevel}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Confidence: {Math.round(burnoutPrediction.confidence * 100)}%
            </p>
          </div>

          {/* Time to Burnout */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Time to Burnout</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {burnoutPrediction.timeToBurnout} days
            </p>
          </div>

          {/* Contributing Factors */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contributing Factors
            </h4>
            <div className="space-y-2">
              {burnoutPrediction.factors.map((factor, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-red-500">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recommendations
            </h4>
            <div className="space-y-2">
              {burnoutPrediction.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500">✓</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
