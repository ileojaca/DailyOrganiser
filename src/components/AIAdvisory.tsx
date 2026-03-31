'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { LifeAdvice, WeeklyLifeReview, BurnoutPrediction } from '@/types/lifeManagement';

export default function AIAdvisory() {
  const { user } = useAuth();
  const [advice, setAdvice] = useState<LifeAdvice[]>([]);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyLifeReview | null>(null);
  const [burnoutPrediction, setBurnoutPrediction] = useState<BurnoutPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'advice' | 'review' | 'burnout'>('advice');

  useEffect(() => {
    if (!user) return;

    // Load from localStorage
    const savedAdvice = localStorage.getItem(`life_advice_${user.uid}`);
    const savedReview = localStorage.getItem(`weekly_review_${user.uid}`);
    const savedBurnout = localStorage.getItem(`burnout_prediction_${user.uid}`);

    if (savedAdvice) setAdvice(JSON.parse(savedAdvice));
    if (savedReview) setWeeklyReview(JSON.parse(savedReview));
    if (savedBurnout) setBurnoutPrediction(JSON.parse(savedBurnout));

    // Generate sample advice if none exists
    if (!savedAdvice) {
      const sampleAdvice: LifeAdvice[] = [
        {
          id: 'advice_1',
          userId: user.uid,
          category: 'productivity',
          insight: 'Your productivity peaks between 9-11 AM. Schedule your most important tasks during this window.',
          actionItems: ['Block 9-11 AM for deep work', 'Avoid meetings during peak hours'],
          evidence: ['Based on your task completion patterns', 'Consistent with your chronotype'],
          confidence: 0.85,
          dismissed: false,
          createdAt: new Date(),
        },
        {
          id: 'advice_2',
          userId: user.uid,
          category: 'wellness',
          insight: 'You\'ve been working late 3 nights this week. Consider setting a hard stop at 6 PM.',
          actionItems: ['Set a calendar reminder for 5:30 PM', 'Plan evening activities'],
          evidence: ['Sleep quality decreased by 15%', 'Increased caffeine consumption detected'],
          confidence: 0.78,
          dismissed: false,
          createdAt: new Date(),
        },
        {
          id: 'advice_3',
          userId: user.uid,
          category: 'relationships',
          insight: 'It\'s been 5 days since you scheduled family time. Your family connection score is declining.',
          actionItems: ['Plan a family dinner this weekend', 'Call a friend today'],
          evidence: ['Last family event: 5 days ago', 'Social interactions down 30%'],
          confidence: 0.92,
          dismissed: false,
          createdAt: new Date(),
        },
      ];
      setAdvice(sampleAdvice);
      localStorage.setItem(`life_advice_${user.uid}`, JSON.stringify(sampleAdvice));
    }

    // Generate sample weekly review if none exists
    if (!savedReview) {
      const sampleReview: WeeklyLifeReview = {
        id: 'review_1',
        userId: user.uid,
        weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(),
        workLifeBalance: 65,
        familyTime: 8,
        personalTime: 5,
        restQuality: 7,
        insights: [
          'You completed 85% of your planned tasks',
          'Family time increased by 20% from last week',
          'Sleep quality improved with consistent bedtime',
        ],
        recommendations: [
          'Try to add one more hour of personal time next week',
          'Schedule a digital detox on Sunday',
          'Plan a date night with your partner',
        ],
        celebrations: [
          'Completed your first 5K run!',
          'Finished the quarterly report ahead of schedule',
          'Maintained a 7-day meditation streak',
        ],
        warnings: [
          'Screen time exceeded 8 hours on 3 days',
          'Skipped lunch twice this week',
        ],
        createdAt: new Date(),
      };
      setWeeklyReview(sampleReview);
      localStorage.setItem(`weekly_review_${user.uid}`, JSON.stringify(sampleReview));
    }

    // Generate sample burnout prediction if none exists
    if (!savedBurnout) {
      const sampleBurnout: BurnoutPrediction = {
        userId: user.uid,
        riskLevel: 'medium',
        confidence: 0.72,
        factors: [
          'Working 50+ hours for 3 consecutive weeks',
          'Decreased social interactions',
          'Increased caffeine consumption',
          'Sleep quality declining',
        ],
        recommendations: [
          'Take a long weekend (3 days) within the next 2 weeks',
          'Delegate 2-3 tasks to team members',
          'Schedule daily 15-minute breaks',
          'Reduce screen time after 8 PM',
        ],
        timeToBurnout: 21,
        predictedAt: new Date(),
      };
      setBurnoutPrediction(sampleBurnout);
      localStorage.setItem(`burnout_prediction_${user.uid}`, JSON.stringify(sampleBurnout));
    }

    setLoading(false);
  }, [user]);

  const dismissAdvice = (id: string) => {
    if (!user) return;
    const updated = advice.map(a => a.id === id ? { ...a, dismissed: true } : a);
    setAdvice(updated);
    localStorage.setItem(`life_advice_${user.uid}`, JSON.stringify(updated));
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
