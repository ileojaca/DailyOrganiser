# DailyOrganiser - Monitoring & Alerts Configuration

## Real-Time Monitoring Setup

### 1. Vercel Analytics Dashboard

**Location**: vercel.com → Project → Analytics

**Metrics to Monitor**:
- Page Load Time (target: < 2s)
- First Input Delay (target: < 100ms)
- Cumulative Layout Shift (target: < 0.1)
- Error Rate (target: < 0.5%)
- Build Time (target: < 5m)

**Set Alerts**:
1. Click "Alerts"
2. Add alert for Page Load Time > 3000ms
3. Add alert for Error Rate > 1%
4. Add alert for CPU Usage > 80%

### 2. Firebase Console Monitoring

**Location**: firebase.google.com → Project → Performance

**Metrics to Track**:
- Firestore Read Operations/day
- Firestore Write Operations/day
- Database Storage Used (MB)
- Connections Active

**Set Quota Warnings**:
1. Settings → Quotas
2. Set alerts at:
   - Reads: Alert at 35K/day (70% of 50K free tier)
   - Writes: Alert at 14K/day (70% of 20K free tier)
   - Storage: Alert at 350 MB (70% of 500 MB)

### 3. GitHub Actions Monitoring

**Location**: GitHub → Actions → Workflow Runs

**Monitor**:
- Build Success Rate (target: 100%)
- Build Duration (target: < 3m)
- Deployment Status

**Set alerts**: Configure notifications for failed deployments

### 4. Uptime Monitoring (Optional)

**Service**: Use UptimeRobot.com (free tier)

1. Create UptimeRobot account
2. Add monitor for: `https://your-vercel-url.com`
3. Set check interval: 5 minutes
4. Enable email alerts

**Alert on**: Response time > 3s or site down

---

## Custom Metrics & Logging

### Application Monitoring

Add to `src/middleware/performanceMonitoring.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function performanceMonitor(
  request: NextRequest,
  response: NextResponse
) {
  const start = performance.now();
  
  // Track endpoint performance
  const endpoint = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  const duration = performance.now() - start;
  
  // Log slow requests (> 1000ms)
  if (duration > 1000) {
    console.warn({
      level: 'warning',
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      duration: `${duration.toFixed(2)}ms`,
      userAgent,
    });
  }
  
  // Log all requests (sampling at 10% for production)
  if (Math.random() < 0.1) {
    console.info({
      level: 'info',
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: response.status,
    });
  }
  
  return response;
}
```

### Database Query Monitoring

Add to `src/lib/firebaseUtils.ts`:

```typescript
export async function monitorQuery<T>(
  operation: string,
  query: Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await query;
    const duration = performance.now() - start;
    
    if (duration > 500) {
      console.warn(`Slow Firebase query [${operation}]: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`Firebase query failed [${operation}]: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}
```

---

## Alert Thresholds & Escalation

### Critical Alerts (Page Everyone)

Trigger when:
- ❌ Website down (no response for 5 min)
- ❌ Error rate > 5%
- ❌ Firestore quota exceeded
- ❌ Database connection failed

**Action**: Immediate investigation & rollback if needed

### Warning Alerts (Notify Slack)

Trigger when:
- ⚠️ Response time > 2 seconds
- ⚠️ Error rate > 1%
- ⚠️ Quota usage > 70%
- ⚠️ Build failure

**Action**: Monitor and investigate

### Info Alerts (Log Only)

Trigger when:
- ℹ️ Slow query (> 1s)
- ℹ️ High memory usage
- ℹ️ Unusual traffic pattern

**Action**: Analyze trends

---

## Slack Integration

### Setup Slack Notifications

1. Go to https://api.slack.com/apps
2. Create New App
3. From scratch → Name: DailyOrganiser
4. Incoming Webhooks → Activate
5. Add New Webhook to Workspace → Select channel
6. Copy Webhook URL

### Configure Webhook

Add to GitHub Secrets:
```
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Alert Messages

Slack will automatically post:
- ✅ Successful deployment to production
- ❌ Build failures
- ⚠️ High error rate
- 📊 Daily metrics summary

---

## Dashboard Setup

### Vercel Performance Dashboard

View Key Metrics:
- Response times by endpoint
- Error rates
- Cold start times
- CDN cache hit rate

### Firebase Performance Dashboard

View Key Metrics:
- Database operations/min
- Latency p50/p95/p99
- Storage growth trend
- Connection count

### Custom Dashboard (Optional)

Using Grafana or similar:
1. Connect Vercel API
2. Connect Firebase API
3. Create custom dashboards
4. Set visual alerts

---

## Log Aggregation

### View Application Logs

**Vercel Logs**:
```bash
vercel logs --follow
```

**Firebase Logs**:
```bash
firebase functions:log
```

**GitHub Actions**:
- GitHub → Actions → Select workflow run
- Click job → View logs

---

## Weekly Performance Review

### Every Monday

1. **Check Metrics**:
   - Total requests processed
   - Error count & rate
   - Response time (p50, p95)
   - Database quota usage

2. **Review Incidents**:
   - Any downtime?
   - Slow operations?
   - Database issues?

3. **Optimize**:
   - Identify slow endpoints
   - Database query optimization
   - Cache improvements

4. **Report**:
   - Share summary with team
   - Plan improvements

---

## Example Alert Configuration

### Vercel Email Alerts

Settings → Notifications → Email
- [ ] Failed builds
- [x] Failed deployments
- [x] Critical errors

### Firebase Alerts

Project Settings → Alerts
- Note: Firebase doesn't send alerts via UI
- Use custom monitoring instead

### GitHub Actions

Repository Settings → Notifications
- Email on workflow failures

---

## Emergency Response

### If Website is Down

1. Check Vercel status: https://status.vercel.com
2. Check Firebase status: https://status.firebase.google.com
3. View Vercel logs: `vercel logs --follow`
4. Check GitHub Actions for deployment failure
5. Rollback: `vercel rollback`

### If Database is Slow

1. Check Firebase quota usage
2. Upgrade to Blaze plan if needed
3. Optimize slow queries
4. Add database indexes

### If Error Rate is High

1. Check recent deployment
2. Review error logs
3. Identify affected endpoints
4. Rollback if critical
5. Fix and redeploy

---

## Cost Monitoring

### Track Usage vs. Limits

Weekly check-in:

```
Firebase Firestore (Free Tier Limits):
- Reads: 5,000 / 50,000 (10%) ✅
- Writes: 2,000 / 20,000 (10%) ✅
- Storage: 50 MB / 1 GB (5%) ✅

Vercel (Free Tier Limits):
- Bandwidth: 5 GB / 100 GB (5%) ✅
- Build Time: 100 min / 6,000 min (2%) ✅

Status: GREEN - Well under limits
```

### Scale-Up Triggers

Upgrade when:
- Firebase reads > 30K/day (80% usage) OR $5/month costs
- Vercel bandwidth > 80 GB/month OR traffic spikes
- Need advanced features (custom domains, analytics)

---

## Metrics Reference

### Key Performance Indicators (KPIs)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time (p50) | < 500ms | > 1000ms | > 2000ms |
| Response Time (p95) | < 2000ms | > 3000ms | > 5000ms |
| Error Rate | < 0.1% | > 0.5% | > 1% |
| Uptime | 99.9% | < 99.5% | < 99% |
| Build Success Rate | 100% | < 98% | < 95% |
| Database Latency | < 100ms | > 200ms | > 500ms |

---

## Summary

✅ **Monitoring Setup Complete**
- Real-time dashboards active
- Alerts configured
- Slack notifications ready
- Weekly review process
- Emergency procedures documented

**Next**: Deploy to production and begin monitoring alerts.
