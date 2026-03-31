# Firestore Schema Migration

## Overview

This document describes the migration from Supabase PostgreSQL to Firebase Firestore for the DailyOrganiser application.

## Migration Mapping

### Supabase Table → Firestore Collection

| Supabase Table | Firestore Path | Notes |
|----------------|----------------|-------|
| `public.users` | `/users/{userId}` | Top-level collection |
| `public.goals` | `/users/{userId}/goals/{goalId}` | Subcollection |
| `public.time_blocks` | `/users/{userId}/timeBlocks/{blockId}` | Subcollection |
| `public.accomplishment_logs` | `/users/{userId}/accomplishmentLogs/{logId}` | Subcollection |

## Schema Definitions

### 1. User Profile (/users/{userId})

```typescript
interface UserProfile {
  email: string
  fullName?: string
  avatarUrl?: string
  timezone: string
  chronotype: 'lark' | 'owl' | 'intermediate'
  energyPattern: {
    peakHours: string[]
    lowHours: string[]
  }
  preferences: {
    notifications: boolean
    reminders: boolean
    suggestionAlerts: boolean
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Migration from Supabase:**
- `id` → Document ID (userId)
- `email` → `email`
- `full_name` → `fullName` (camelCase)
- `avatar_url` → `avatarUrl` (camelCase)
- `timezone` → `timezone`
- `chronotype` → `chronotype`
- `energy_pattern` → `energyPattern` (camelCase, JSON)
- `preferences` → `preferences` (JSON)
- `created_at` → `createdAt` (Timestamp)
- `updated_at` → `updatedAt` (Timestamp)

### 2. Goals (/users/{userId}/goals/{goalId})

```typescript
interface Goal {
  title: string
  description?: string
  category: 'work' | 'personal' | 'health' | 'learning' | 'social'
  priority: number // 1-5
  aiAdjustedPriority: boolean
  adjustmentReason?: string
  estimatedDuration?: number // minutes
  deadline?: Timestamp
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
  context: {
    location?: string
    tools?: string[]
    networkStatus?: string
  }
  energyRequired?: number // 1-10
  scheduledStart?: Timestamp
  scheduledEnd?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}
```

**Migration from Supabase:**
- `id` → Document ID (goalId)
- `user_id` → Parent path (userId)
- `title` → `title`
- `description` → `description`
- `category` → `category`
- `priority` → `priority`
- `ai_adjusted_priority` → `aiAdjustedPriority` (camelCase)
- `adjustment_reason` → `adjustmentReason` (camelCase)
- `estimated_duration` → `estimatedDuration` (camelCase)
- `deadline` → `deadline` (Timestamp)
- `status` → `status`
- `context` → `context` (JSON)
- `energy_required` → `energyRequired` (camelCase)
- `scheduled_start` → `scheduledStart` (camelCase, Timestamp)
- `scheduled_end` → `scheduledEnd` (camelCase, Timestamp)
- `created_at` → `createdAt` (Timestamp)
- `updated_at` → `updatedAt` (Timestamp)
- `completed_at` → `completedAt` (Timestamp)

### 3. Time Blocks (/users/{userId}/timeBlocks/{blockId})

```typescript
interface TimeBlock {
  name: string
  blockType: 'fixed' | 'flexible' | 'protected'
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  durationMinutes: number
  daysOfWeek: number[] // 0=Sunday, 6=Saturday
  energyLevel: 'high' | 'medium' | 'low'
  preferredTaskTypes?: string[]
  isProtected: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Migration from Supabase:**
- `id` → Document ID (blockId)
- `user_id` → Parent path (userId)
- `name` → `name`
- `block_type` → `blockType` (camelCase)
- `start_time` → `startTime` (camelCase)
- `end_time` → `endTime` (camelCase)
- `duration_minutes` → `durationMinutes` (camelCase)
- `days_of_week` → `daysOfWeek` (camelCase)
- `energy_level` → `energyLevel` (camelCase)
- `preferred_task_types` → `preferredTaskTypes` (camelCase)
- `is_protected` → `isProtected` (camelCase)
- `created_at` → `createdAt` (Timestamp)
- `updated_at` → `updatedAt` (Timestamp)

### 4. Accomplishment Logs (/users/{userId}/accomplishmentLogs/{logId})

```typescript
interface AccomplishmentLog {
  goalId?: string
  scheduledDate: string // YYYY-MM-DD format
  scheduledHour: number // 0-23
  actualDuration?: number // minutes
  completionStatus: 'completed' | 'partial' | 'abandoned'
  energyLevelAtStart?: number // 1-10
  contextSnapshot: {
    location?: string
    tools?: string[]
    distractions?: string[]
  }
  efficiencyScore: number // 0-1
  createdAt: Timestamp
}
```

**Migration from Supabase:**
- `id` → Document ID (logId)
- `user_id` → Parent path (userId)
- `goal_id` → `goalId` (camelCase)
- `scheduled_date` → `scheduledDate` (camelCase)
- `scheduled_hour` → `scheduledHour` (camelCase)
- `actual_duration` → `actualDuration` (camelCase)
- `completion_status` → `completionStatus` (camelCase)
- `energy_level_at_start` → `energyLevelAtStart` (camelCase)
- `context_snapshot` → `contextSnapshot` (camelCase)
- `efficiency_score` → `efficiencyScore` (camelCase)
- `created_at` → `createdAt` (Timestamp)

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Helper function to check if user is team member
    function isTeamMember(teamId) {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }
    
    // Helper function to check if user is team admin/owner
    function isTeamAdmin(teamId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'admin'];
    }
    
    // Users collection - users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Goals subcollection
    match /users/{userId}/goals/{goalId} {
      allow read, write: if isOwner(userId);
    }
    
    // Time blocks subcollection
    match /users/{userId}/timeBlocks/{blockId} {
      allow read, write: if isOwner(userId);
    }
    
    // Accomplishment logs subcollection
    match /users/{userId}/accomplishmentLogs/{logId} {
      allow read, write: if isOwner(userId);
    }
    
    // Teams collection
    match /teams/{teamId} {
      allow read: if isTeamMember(teamId);
      allow write: if isTeamAdmin(teamId);
    }
    
    // Team members subcollection
    match /teams/{teamId}/members/{userId} {
      allow read: if isTeamMember(teamId);
      allow write: if isTeamAdmin(teamId) || (isOwner(userId) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastActive', 'status']));
    }
    
    // Team invitations
    match /teamInvitations/{invitationId} {
      allow read: if isAuthenticated() && resource.data.email == request.auth.token.email;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && resource.data.email == request.auth.token.email;
    }
    
    // Subscriptions collection
    match /subscriptions/{subscriptionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false; // Only server-side via Admin SDK
    }
    
    // Notification preferences
    match /notificationPreferences/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Push subscriptions
    match /pushSubscriptions/{subscriptionId} {
      allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // API keys (read-only for user, write only via Admin SDK)
    match /apiKeys/{keyId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false; // Only server-side via Admin SDK
    }
    
    // Webhooks
    match /webhooks/{webhookId} {
      allow read, write: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Usage tracking (read-only for user)
    match /usageTracking/{trackingId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false; // Only server-side via Admin SDK
    }
  }
}
```

## Indexes Required

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "goals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "goals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "priority", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "timeBlocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "accomplishmentLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scheduledDate", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Migration Script (Data Transfer)

```typescript
// scripts/migrateToFirebase.ts
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
})
const firestore = getFirestore(firebaseApp)

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function migrateUsers() {
  const { data: users } = await supabase.from('users').select('*')
  
  for (const user of users || []) {
    await firestore.collection('users').doc(user.id).set({
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      timezone: user.timezone,
      chronotype: user.chronotype,
      energyPattern: user.energy_pattern,
      preferences: user.preferences,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    })
  }
}

async function migrateGoals() {
  const { data: goals } = await supabase.from('goals').select('*')
  
  for (const goal of goals || []) {
    await firestore
      .collection('users')
      .doc(goal.user_id)
      .collection('goals')
      .doc(goal.id)
      .set({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        aiAdjustedPriority: goal.ai_adjusted_priority,
        adjustmentReason: goal.adjustment_reason,
        estimatedDuration: goal.estimated_duration,
        deadline: goal.deadline,
        status: goal.status,
        context: goal.context,
        energyRequired: goal.energy_required,
        scheduledStart: goal.scheduled_start,
        scheduledEnd: goal.scheduled_end,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
        completedAt: goal.completed_at
      })
  }
}

async function migrateTimeBlocks() {
  const { data: blocks } = await supabase.from('time_blocks').select('*')
  
  for (const block of blocks || []) {
    await firestore
      .collection('users')
      .doc(block.user_id)
      .collection('timeBlocks')
      .doc(block.id)
      .set({
        name: block.name,
        blockType: block.block_type,
        startTime: block.start_time,
        endTime: block.end_time,
        durationMinutes: block.duration_minutes,
        daysOfWeek: block.days_of_week,
        energyLevel: block.energy_level,
        preferredTaskTypes: block.preferred_task_types,
        isProtected: block.is_protected,
        createdAt: block.created_at,
        updatedAt: block.updated_at
      })
  }
}

async function migrateAccomplishmentLogs() {
  const { data: logs } = await supabase.from('accomplishment_logs').select('*')
  
  for (const log of logs || []) {
    await firestore
      .collection('users')
      .doc(log.user_id)
      .collection('accomplishmentLogs')
      .doc(log.id)
      .set({
        goalId: log.goal_id,
        scheduledDate: log.scheduled_date,
        scheduledHour: log.scheduled_hour,
        actualDuration: log.actual_duration,
        completionStatus: log.completion_status,
        energyLevelAtStart: log.energy_level_at_start,
        contextSnapshot: log.context_snapshot,
        efficiencyScore: log.efficiency_score,
        createdAt: log.created_at
      })
  }
}

async function main() {
  console.log('Starting migration...')
  
  await migrateUsers()
  console.log('✓ Users migrated')
  
  await migrateGoals()
  console.log('✓ Goals migrated')
  
  await migrateTimeBlocks()
  console.log('✓ Time blocks migrated')
  
  await migrateAccomplishmentLogs()
  console.log('✓ Accomplishment logs migrated')
  
  console.log('Migration complete!')
  process.exit(0)
}

main().catch(console.error)
```

---

*Document Version: 1.0*  
*Last Updated: 2026-03-24*  
*Status: Active - Firebase Migration Guide*