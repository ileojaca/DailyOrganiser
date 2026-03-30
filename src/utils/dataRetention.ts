/**
 * Data Retention Utility
 * 
 * Handles GDPR-compliant data retention and cleanup policies
 */

import { supabase } from '@/lib/supabase';

interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  description: string;
}

// Default retention policies (in days)
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'accomplishment_logs',
    retentionDays: 365, // 1 year
    description: 'Task completion logs and productivity data',
  },
  {
    dataType: 'api_usage',
    retentionDays: 90, // 3 months
    description: 'API usage tracking data',
  },
  {
    dataType: 'notification_logs',
    retentionDays: 30, // 1 month
    description: 'Notification delivery logs',
  },
  {
    dataType: 'email_logs',
    retentionDays: 90, // 3 months
    description: 'Email notification logs',
  },
  {
    dataType: 'push_subscriptions',
    retentionDays: 365, // 1 year (or until manually removed)
    description: 'Push notification subscriptions',
  },
  {
    dataType: 'sessions',
    retentionDays: 30, // 1 month
    description: 'User session data',
  },
];

/**
 * Clean up expired data based on retention policies
 */
export async function cleanupExpiredData(userId?: string): Promise<{
  success: boolean;
  deletedCounts: Record<string, number>;
  errors: string[];
}> {
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];

  for (const policy of DEFAULT_RETENTION_POLICIES) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      let query = supabase
        .from(policy.dataType)
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      // If userId is provided, only clean up that user's data
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error, count } = await query;

      if (error) {
        errors.push(`Failed to clean up ${policy.dataType}: ${error.message}`);
      } else {
        deletedCounts[policy.dataType] = count || 0;
      }
    } catch (err) {
      errors.push(`Error cleaning up ${policy.dataType}: ${err}`);
    }
  }

  return {
    success: errors.length === 0,
    deletedCounts,
    errors,
  };
}

/**
 * Get data retention status for a user
 */
export async function getDataRetentionStatus(userId: string): Promise<{
  policies: Array<RetentionPolicy & { currentCount: number; oldestRecord: string | null }>;
  totalRecords: number;
}> {
  const policiesWithStatus = [];

  for (const policy of DEFAULT_RETENTION_POLICIES) {
    try {
      const { count } = await supabase
        .from(policy.dataType)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data: oldest } = await supabase
        .from(policy.dataType)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      policiesWithStatus.push({
        ...policy,
        currentCount: count || 0,
        oldestRecord: oldest?.created_at || null,
      });
    } catch {
      policiesWithStatus.push({
        ...policy,
        currentCount: 0,
        oldestRecord: null,
      });
    }
  }

  const totalRecords = policiesWithStatus.reduce((sum, p) => sum + p.currentCount, 0);

  return {
    policies: policiesWithStatus,
    totalRecords,
  };
}

/**
 * Export user data for GDPR compliance
 */
export async function exportUserData(userId: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const userData: Record<string, unknown> = {};

    // Export user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    userData.profile = profile;

    // Export goals
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);
    userData.goals = goals || [];

    // Export time blocks
    const { data: timeBlocks } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId);
    userData.timeBlocks = timeBlocks || [];

    // Export accomplishment logs
    const { data: logs } = await supabase
      .from('accomplishment_logs')
      .select('*')
      .eq('user_id', userId);
    userData.accomplishmentLogs = logs || [];

    // Export team memberships
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', userId);
    userData.teams = teamMembers || [];

    // Export notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    userData.notificationPreferences = prefs;

    // Export subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    userData.subscription = subscription;

    return {
      success: true,
      data: userData,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to export user data: ${error}`,
    };
  }
}

/**
 * Delete all user data (GDPR right to be forgotten)
 */
export async function deleteAllUserData(userId: string): Promise<{
  success: boolean;
  deletedCounts: Record<string, number>;
  errors: string[];
}> {
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];

  const tablesToDelete = [
    'accomplishment_logs',
    'api_usage',
    'notification_logs',
    'email_logs',
    'push_subscriptions',
    'sessions',
    'notification_preferences',
    'time_blocks',
    'goals',
    'team_members',
    'subscriptions',
    'user_profiles',
  ];

  for (const table of tablesToDelete) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        errors.push(`Failed to delete from ${table}: ${error.message}`);
      } else {
        deletedCounts[table] = count || 0;
      }
    } catch (err) {
      errors.push(`Error deleting from ${table}: ${err}`);
    }
  }

  // Delete the auth user
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      errors.push(`Failed to delete auth user: ${error.message}`);
    }
  } catch (err) {
    errors.push(`Error deleting auth user: ${err}`);
  }

  return {
    success: errors.length === 0,
    deletedCounts,
    errors,
  };
}

/**
 * Get retention policy for a specific data type
 */
export function getRetentionPolicy(dataType: string): RetentionPolicy | undefined {
  return DEFAULT_RETENTION_POLICIES.find(p => p.dataType === dataType);
}

/**
 * Get all retention policies
 */
export function getAllRetentionPolicies(): RetentionPolicy[] {
  return [...DEFAULT_RETENTION_POLICIES];
}
