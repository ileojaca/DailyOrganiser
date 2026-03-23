# AI-Powered Daily Planner - Development Roadmap (Zero-Dollar Priority)

## Executive Summary

This document outlines a phased development approach for the AI-powered daily planner SaaS, with a **primary focus on zero-cost deployment** using free-tier cloud services. The roadmap distinguishes between Minimum Viable Product (MVP) features and future AI-driven iterations, while ensuring every phase is deployable without infrastructure costs.

**Key Principle:** Build for the free tier, optimize relentlessly, and scale only when revenue justifies it.

---

## Zero-Dollar Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZERO-DOLLAR PRODUCTION STACK                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐         │
│   │   Vercel     │◄────►│  Supabase    │◄────►│ GitHub Actions│         │
│   │   Free Tier  │      │   Free Tier  │      │    Free Tier  │         │
│   │              │      │              │      │               │         │
│   │ • 100 GB/mo  │      │ • 500 MB DB  │      │ • 2,000 min   │         │
│   │ • 6K builds  │      │ • 200 conn   │      │ • 500 MB art  │         │
│   │ • Edge funcs │      │ • 500K funcs │      │ • 20 jobs     │         │
│   └──────────────┘      └──────────────┘      └──────────────┘         │
│          │                     │                     │                    │
│          ▼                     ▼                     ▼                    │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐         │
│   │  Next.js 14  │      │  PostgreSQL  │      │  Automated   │         │
│   │  React App   │      │  + Real-time │      │  CI/CD       │         │
│   │              │      │  + Auth      │      │  Pipeline    │         │
│   └──────────────┘      └──────────────┘      └──────────────┘         │
│                                                                             │
│   TOTAL COST: $0/month (all free tiers)                                     │
│   CAPACITY: 1,000+ users, 50K+ tasks/month                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Revised Phase Overview (Zero-Dollar Optimized)

### Phase 0: Zero-Dollar Infrastructure Setup (Week 1) - **NEW**

**Objective:** Establish production-ready infrastructure using only free-tier services before writing application code.

| Task | Provider | Free Tier Limit | Action |
|------|----------|-----------------|--------|
| Create Vercel account | Vercel | 100 GB/mo bandwidth | Set up project, configure GitHub integration |
| Create Supabase project | Supabase | 500 MB database | Configure database, enable RLS, set up auth |
| Configure GitHub Actions | GitHub | 2,000 min/month | Set up CI/CD workflow |
| Set up monitoring | Vercel + Supabase dashboards | Built-in | Configure alerts at 70% of limits |
| Configure custom domain | Vercel | Unlimited domains | Optional: use free subdomain |

**Deliverables:**
- [ ] Production URL live (e.g., `daily-planner.vercel.app`)
- [ ] Database connected and accessible
- [ ] CI/CD pipeline running
- [ ] Monitoring dashboards configured
- [ ] Documentation of all environment variables

---

### Phase 1: MVP with Zero-Dollar Deployment (Months 1-3)

**Objective:** Launch a fully functional daily planner hosted entirely on free-tier infrastructure, optimized to stay within limits while serving 1,000+ users.

#### 1.1 Zero-Dollar Optimized Features

| Feature | Description | Free Tier Optimization |
|---------|-------------|------------------------|
| **Task CRUD** | Full task management | Use Supabase REST API, cache in localStorage |
| **Time Blocks** | Schedule management | Store as JSONB in PostgreSQL, minimal rows |
| **Importance Levels** | 1-5 priority scale | Simple enum, no additional storage |
| **Basic Auth** | Email + OAuth | Use Supabase Auth (unlimited users) |
| **Real-time Sync** | Live updates | Supabase real-time (200 concurrent) |
| **Static Dashboard** | Analytics view | Pre-compute daily, cache aggressively |

#### 1.2 Data Architecture for 500MB Limit

```sql
-- Optimized schema for minimal storage

-- Users: ~200 bytes per user
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}', -- Compressed storage
    energy_pattern JSONB DEFAULT '{}'
);

-- Tasks: ~500 bytes per task
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT, -- NULL if empty
    category VARCHAR(50),
    priority SMALLINT CHECK (priority BETWEEN 1 AND 5),
    estimated_duration INTEGER, -- minutes
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    context JSONB DEFAULT '{}', -- Compressed
    energy_required SMALLINT CHECK (energy_required BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- History: Aggregated, archived after 90 days
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    scheduled_date DATE,
    scheduled_hour SMALLINT, -- 0-23, reduces storage
    actual_duration INTEGER,
    completion_status VARCHAR(20),
    energy_level_at_start SMALLINT,
    efficiency_score FLOAT
);

-- Automated cleanup (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Archive history older than 90 days
    DELETE FROM task_history
    WHERE scheduled_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Soft delete old completed tasks (keep for 1 year)
    UPDATE tasks
    SET status = 'archived'
    WHERE status = 'completed'
    AND completed_at < CURRENT_DATE - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;
```

**Storage Calculation:**
- 1,000 users × 200 bytes = 200 KB
- 50 tasks/user × 500 bytes = 25 MB
- 100 history records/user × 100 bytes = 10 MB
- **Total: ~35 MB for 1,000 users** (well under 500 MB limit)

#### 1.3 Free Tier Monitoring & Alerts

| Metric | Limit | Alert At | Action |
|--------|-------|----------|--------|
| Vercel Bandwidth | 100 GB/mo | 70 GB | Enable aggressive caching |
| Vercel Build Minutes | 6,000/mo | 4,200 | Skip non-essential builds |
| Supabase DB Size | 500 MB | 350 MB | Archive old data |
| Supabase Connections | 200 | 140 | Implement connection pooling |
| GitHub Actions Minutes | 2,000/mo | 1,400 | Optimize workflow |

---

### Phase 2: AI Foundation with Free-Tier ML (Months 4-6)

**Objective:** Deploy lightweight ML models using free-tier resources and client-side computation where possible.

#### 2.1 Free-Tier ML Strategy

| ML Task | Approach | Free Tier Solution |
|---------|----------|-------------------|
| Duration Prediction | Lightweight XGBoost | Client-side inference with pre-trained models |
| Pattern Detection | Statistical analysis | PostgreSQL queries + edge functions |
| Productivity Scoring | Rule-based + light ML | Supabase edge functions (500K invocations) |
| Chronotype Detection | Clustering algorithm | Client-side computation |
| Feedback Loop | Online learning | Incremental updates in database |

#### 2.2 Client-Side ML Architecture

```javascript
// Lightweight ML models running in browser
// No server-side ML infrastructure needed

// 1. Pre-trained model weights stored as JSON
const durationModelWeights = {
  // XGBoost model: ~50KB compressed
  trees: [...],
  featureImportance: {...}
};

// 2. Client-side inference
class DurationPredictor {
  predict(taskFeatures) {
    // Run XGBoost inference in browser
    // Uses WebAssembly for performance
    const prediction = wasmXGBoost.predict(
      taskFeatures,
      durationModelWeights
    );
    return {
      estimatedMinutes: prediction.value,
      confidence: prediction.confidence,
      range: [prediction.lower, prediction.upper]
    };
  }
}

// 3. Periodic model updates
// Download new model weights weekly from CDN
async function updateModel() {
  const response = await fetch(
    'https://cdn.dailyplanner.app/models/duration-predictor-v2.json'
  );
  const newWeights = await response.json();
  localStorage.setItem('durationModel', JSON.stringify(newWeights));
}
```

#### 2.3 Supabase Edge Functions for ML

```typescript
// Supabase Edge Function: Pattern Detection
// Runs on Deno Deploy (500K invocations/month free)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { userId, timeRange } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Pattern detection using PostgreSQL analytics
  const { data: patterns, error } = await supabase.rpc('detect_patterns', {
    p_user_id: userId,
    p_days: timeRange
  });
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ patterns }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

### Phase 3: AI Enhancement (Months 7-9)

**Objective:** Deploy smart suggestion system with high user value while maintaining zero-cost infrastructure.

#### 3.1 Smart Suggestions (Free-Tier Optimized)

| Feature | Implementation | Resource Usage |
|---------|---------------|----------------|
| Duration Adjustments | Client-side XGBoost | Browser compute only |
| Task Ordering | Edge function + caching | ~1KB per request |
| Break Reminders | Client-side timer + localStorage | Zero server calls |
| Focus Mode | Browser APIs (Fullscreen, Notifications) | Zero server calls |
| Batching | Edge function pattern matching | ~2KB per request |

---

### Phase 4: AI Maturity (Months 10-12)

**Objective:** Achieve fully autonomous learning while maintaining zero-cost infrastructure through efficient architecture.

#### 4.1 Continuous Learning (Zero-Cost)

| Feature | Free-Tier Implementation |
|---------|-------------------------|
| Automated Retraining | Weekly client-side model updates from CDN |
| Online Learning | Incremental updates in localStorage + periodic sync |
| Multi-User Learning | Federated learning patterns (anonymized) |
| Explainable AI | Rule-based explanations generated client-side |
| Performance Monitoring | Built-in Vercel + Supabase analytics |

---

## Zero-Dollar Migration Path

### When to Migrate to Paid Tiers

| Trigger | Current Metric | Migration Action | Cost |
|---------|--------------|------------------|------|
| Database size > 400 MB | 500 MB limit | Upgrade Supabase Pro | $25/month |
| Bandwidth > 70 GB/mo | 100 GB limit | Upgrade Vercel Pro | $20/month |
| Build minutes > 4,000 | 6,000 limit | Optimize builds first | $0 |
| Edge invocations > 400K | 500K limit | Add caching layer | $0 |
| Users > 800 | ~1,000 capacity | Optimize queries | $0 |

### Cost-Effective Scaling Strategy

```
Phase 0-1 (0-1K users): $0/month
├── Vercel Free: Frontend hosting (100 GB bandwidth)
├── Supabase Free: Database + Auth (500 MB, 200 connections)
└── GitHub Actions: CI/CD (2,000 minutes)

Phase 2 (1K-5K users): ~$45/month
├── Vercel Pro: $20/month (increased bandwidth + features)
├── Supabase Pro: $25/month (increased DB size + connections)
└── GitHub Actions: Still free (within limits)

Phase 3 (5K-20K users): ~$120/month
├── Vercel Pro: $20/month
├── Supabase Pro: $25/month
├── Additional Supabase storage: $25/month
└── Monitoring/Analytics tools: $50/month

Phase 4 (20K+ users): Custom pricing
├── Enterprise evaluation
├── Dedicated infrastructure
└── Custom AI model hosting
```

---

## Zero-Dollar Success Metrics

| Phase | Primary Metric | Target | Infrastructure Constraint |
|-------|---------------|--------|------------------------|
| Phase 0 | Infrastructure Live | 100% uptime | All services deployed |
| Phase 1 | Users within free tier | < 1,000 | Database < 400 MB |
| Phase 2 | AI features deployed | 5 features | Edge functions < 400K |
| Phase 3 | Zero-cost maintained | $0 spend | All metrics < 70% limits |
| Phase 4 | Migration ready | Clear path | Documented upgrade plan |

---

## Conclusion

This revised roadmap prioritizes **zero-dollar deployment** from day one, ensuring the AI-Powered Daily Planner can be built, deployed, and scaled to 1,000+ users without any infrastructure costs. By leveraging Vercel, Supabase, and GitHub Actions free tiers, we create a production-ready foundation that can support the full MVP and early AI features.

**Key Success Factors:**
1. **Deploy First:** Get infrastructure live before writing code
2. **Monitor Religiously:** Track all free tier metrics weekly
3. **Optimize Early:** Implement caching and compression from day one
4. **Plan for Growth:** Have clear migration triggers and paths
5. **Stay Lean:** Resist over-engineering; free tiers reward simplicity

---

*Document Version: 2.0 - Zero-Dollar Edition*  
*Last Updated: 2026-03-23*  
*Status: Ready for Zero-Cost Implementation*
