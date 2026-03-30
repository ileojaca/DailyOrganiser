import { supabase } from '@/lib/supabase';

export interface UsageRecord {
  userId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
}

export async function trackApiUsage(
  userId: string,
  endpoint: string,
  method: string,
  responseTime: number,
  statusCode: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        endpoint,
        method,
        response_time: responseTime,
        status_code: statusCode,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error tracking API usage:', error);
    }
  } catch (error) {
    console.error('Error tracking API usage:', error);
  }
}

export async function getUserUsageStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
}> {
  try {
    const { data, error } = await supabase
      .from('api_usage')
      .select('endpoint, response_time')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching usage stats:', error);
      return { totalRequests: 0, averageResponseTime: 0, requestsByEndpoint: {} };
    }

    const totalRequests = data?.length || 0;
    const totalResponseTime = data?.reduce((sum, record) => sum + (record.response_time || 0), 0) || 0;
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    const requestsByEndpoint: Record<string, number> = {};
    data?.forEach((record) => {
      requestsByEndpoint[record.endpoint] = (requestsByEndpoint[record.endpoint] || 0) + 1;
    });

    return {
      totalRequests,
      averageResponseTime,
      requestsByEndpoint,
    };
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return { totalRequests: 0, averageResponseTime: 0, requestsByEndpoint: {} };
  }
}

export async function checkUsageLimit(
  userId: string,
  limit: number
): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const stats = await getUserUsageStats(userId, startOfMonth, endOfMonth);

    return {
      allowed: stats.totalRequests < limit,
      currentUsage: stats.totalRequests,
      limit,
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return { allowed: true, currentUsage: 0, limit };
  }
}
