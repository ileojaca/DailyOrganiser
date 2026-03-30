/**
 * Automated Backups Utility
 * 
 * Handles automated backups of user data to cloud storage
 */

import { supabase } from '@/lib/supabase';

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeFiles: boolean;
}

interface BackupMetadata {
  id: string;
  userId: string;
  timestamp: string;
  size: number;
  tables: string[];
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  frequency: 'daily',
  retentionDays: 30,
  includeFiles: false,
};

/**
 * Create a backup for a user
 */
export async function createUserBackup(
  userId: string,
  config: Partial<BackupConfig> = {}
): Promise<BackupMetadata> {
  const backupConfig = { ...DEFAULT_CONFIG, ...config };
  const timestamp = new Date().toISOString();
  const backupId = `backup_${userId}_${Date.now()}`;

  const metadata: BackupMetadata = {
    id: backupId,
    userId,
    timestamp,
    size: 0,
    tables: [],
    status: 'pending',
  };

  try {
    // Store backup metadata
    const { error: metaError } = await supabase
      .from('backup_metadata')
      .insert(metadata);

    if (metaError) throw metaError;

    // Backup user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      await supabase.from('backups').insert({
        backup_id: backupId,
        user_id: userId,
        table_name: 'user_profiles',
        data: profile,
        created_at: timestamp,
      });
      metadata.tables.push('user_profiles');
    }

    // Backup goals
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (goals && goals.length > 0) {
      for (const goal of goals) {
        await supabase.from('backups').insert({
          backup_id: backupId,
          user_id: userId,
          table_name: 'goals',
          data: goal,
          created_at: timestamp,
        });
      }
      metadata.tables.push('goals');
    }

    // Backup time blocks
    const { data: timeBlocks } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('user_id', userId);

    if (timeBlocks && timeBlocks.length > 0) {
      for (const block of timeBlocks) {
        await supabase.from('backups').insert({
          backup_id: backupId,
          user_id: userId,
          table_name: 'time_blocks',
          data: block,
          created_at: timestamp,
        });
      }
      metadata.tables.push('time_blocks');
    }

    // Backup accomplishment logs
    const { data: logs } = await supabase
      .from('accomplishment_logs')
      .select('*')
      .eq('user_id', userId);

    if (logs && logs.length > 0) {
      for (const log of logs) {
        await supabase.from('backups').insert({
          backup_id: backupId,
          user_id: userId,
          table_name: 'accomplishment_logs',
          data: log,
          created_at: timestamp,
        });
      }
      metadata.tables.push('accomplishment_logs');
    }

    // Backup notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefs) {
      await supabase.from('backups').insert({
        backup_id: backupId,
        user_id: userId,
        table_name: 'notification_preferences',
        data: prefs,
        created_at: timestamp,
      });
      metadata.tables.push('notification_preferences');
    }

    // Update metadata
    metadata.status = 'completed';
    metadata.size = metadata.tables.length;

    await supabase
      .from('backup_metadata')
      .update(metadata)
      .eq('id', backupId);

    return metadata;
  } catch (error) {
    metadata.status = 'failed';
    metadata.errorMessage = String(error);

    await supabase
      .from('backup_metadata')
      .update(metadata)
      .eq('id', backupId);

    return metadata;
  }
}

/**
 * Restore user data from backup
 */
export async function restoreUserBackup(
  backupId: string,
  userId: string
): Promise<{ success: boolean; restoredTables: string[]; errors: string[] }> {
  const restoredTables: string[] = [];
  const errors: string[] = [];

  try {
    // Get all backup data for this backup ID
    const { data: backupData, error } = await supabase
      .from('backups')
      .select('*')
      .eq('backup_id', backupId)
      .eq('user_id', userId);

    if (error) throw error;

    if (!backupData || backupData.length === 0) {
      return { success: false, restoredTables, errors: ['No backup data found'] };
    }

    // Group by table
    const tableGroups: Record<string, unknown[]> = {};
    for (const item of backupData) {
      if (!tableGroups[item.table_name]) {
        tableGroups[item.table_name] = [];
      }
      tableGroups[item.table_name].push(item.data);
    }

    // Restore each table
    for (const [tableName, data] of Object.entries(tableGroups)) {
      try {
        if (tableName === 'user_profiles') {
          // Upsert user profile
          const { error: upsertError } = await supabase
            .from('user_profiles')
            .upsert(data[0] as Record<string, unknown>);

          if (upsertError) throw upsertError;
        } else {
          // Insert other records
          for (const record of data) {
            const { error: insertError } = await supabase
              .from(tableName)
              .upsert(record as Record<string, unknown>);

            if (insertError) throw insertError;
          }
        }

        restoredTables.push(tableName);
      } catch (err) {
        errors.push(`Failed to restore ${tableName}: ${err}`);
      }
    }

    return {
      success: errors.length === 0,
      restoredTables,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      restoredTables,
      errors: [`Restore failed: ${error}`],
    };
  }
}

/**
 * Get backup history for a user
 */
export async function getBackupHistory(userId: string): Promise<BackupMetadata[]> {
  const { data, error } = await supabase
    .from('backup_metadata')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching backup history:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete old backups based on retention policy
 */
export async function cleanupOldBackups(userId: string, retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data: oldBackups } = await supabase
    .from('backup_metadata')
    .select('id')
    .eq('user_id', userId)
    .lt('timestamp', cutoffDate.toISOString());

  if (!oldBackups || oldBackups.length === 0) return 0;

  let deletedCount = 0;

  for (const backup of oldBackups) {
    // Delete backup data
    await supabase
      .from('backups')
      .delete()
      .eq('backup_id', backup.id);

    // Delete metadata
    await supabase
      .from('backup_metadata')
      .delete()
      .eq('id', backup.id);

    deletedCount++;
  }

  return deletedCount;
}

/**
 * Check if backup is needed based on frequency
 */
export async function isBackupNeeded(
  userId: string,
  frequency: 'daily' | 'weekly' | 'monthly'
): Promise<boolean> {
  const { data: lastBackup } = await supabase
    .from('backup_metadata')
    .select('timestamp')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (!lastBackup) return true;

  const lastBackupDate = new Date(lastBackup.timestamp);
  const now = new Date();
  const daysSinceLastBackup = Math.floor(
    (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'daily':
      return daysSinceLastBackup >= 1;
    case 'weekly':
      return daysSinceLastBackup >= 7;
    case 'monthly':
      return daysSinceLastBackup >= 30;
    default:
      return true;
  }
}
