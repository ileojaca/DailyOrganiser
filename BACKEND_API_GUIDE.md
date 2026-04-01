# DailyOrganiser Backend API Documentation

## Quick Start Guide

### Environment Setup

1. **Firebase Configuration** - Already set up with:
   - Firestore Database
   - Authentication (OAuth + Email/Password)
   - Security Rules (document-level access control)

2. **Required Headers for All API Calls**
   ```
   x-user-id: {userId}  // Firebase user ID
   Content-Type: application/json
   ```

---

## Core APIs

### 1. Task Management

#### Create Task
```bash
POST /api/goals

{
  "title": "Do homework",
  "category": "homework",           # homework|work|chores|exercise|social|personal|family|rest
  "priority": 4,                     # 1-5 (5 = critical)
  "duration": 60,                    # minutes
  "energyRequired": 4,               # 1-5 (1 = low mental effort)
  "scheduledTime": "2026-03-31T15:00:00Z",  # optional
  "pointsValue": 10,                 # points earned on completion
  "funLevel": 3,                     # 1-5 (how fun is this task?)
  "voiceCreated": false              # was this created via voice?
}

Response:
{
  "task": {
    "id": "abc123",
    "userId": "user123",
    "title": "Do homework",
    "category": "homework",
    "priority": 4,
    "completed": false,
    "createdAt": "2026-03-31T12:00:00Z"
  }
}
```

#### Get Tasks (with filtering)
```bash
GET /api/goals?category=homework&priority=4&completed=false

Response:
{
  "tasks": [
    { /* task objects */ }
  ]
}
```

#### Complete Task (and earn rewards!)
```bash
POST /api/tasks/{taskId}/complete

Response:
{
  "task": { /* updated task */ },
  "rewards": {
    "pointsEarned": 10,
    "newTotalPoints": 150,
    "leveledUp": false,
    "newLevel": 0,
    "streakContinues": true,
    "currentStreak": 3,
    "newAchievements": [
      {
        "id": "first-10",
        "name": "🎯 Task Master",
        "description": "Complete 10 tasks"
      }
    ]
  }
}
```

---

### 2. Voice & Natural Language Parsing

#### Parse Voice Input
```bash
POST /api/tasks/parse-voice

{
  "input": "Do homework for 2 hours tomorrow at 3pm",
  "createImmediate": true  # auto-create if confidence > 0.7
}

Response:
{
  "parsed": {
    "taskTitle": "Do homework",
    "category": "homework",
    "priority": 3,
    "duration": 120,
    "energyRequired": 4,
    "scheduledTime": "2026-04-01T15:00:00Z",
    "confidence": 0.85
  },
  "confirmation": "Got it! I'll create: **Do homework** (homework) - about 120 mins at 3:00 PM",
  "createdTask": { /* task object if autoCreated */ },
  "autoCreated": true
}
```

**Supported Voice Patterns:**
- "Do homework for 2 hours tomorrow at 3pm"
- "urgent: finish project report"
- "take a 30 min break this afternoon"
- "call mom tonight"
- "study for exam - high priority"

---

### 3. Energy Level Tracking

#### Log Daily Energy
```bash
POST /api/energy-log

{
  "date": "2026-03-31",
  "morning": 4,         # 1-5 scale
  "afternoon": 5,
  "evening": 2,
  "notes": "Felt great after coffee"
}

Response:
{
  "energyLog": {
    "date": "2026-03-31",
    "morning": 4,
    "afternoon": 5,
    "evening": 2,
    "userId": "user123",
    "createdAt": "2026-03-31T12:00:00Z"
  }
}
```

#### Get Energy Log
```bash
GET /api/energy-log?date=2026-03-31

Response:
{
  "energyLog": {
    "date": "2026-03-31",
    "morning": 4,
    "afternoon": 5,
    "evening": 2
  }
  // or null if not logged today
}
```

---

### 4. AI Schedule Generation

#### Get Daily Schedule with Suggestions
```bash
GET /api/schedule?date=2026-03-31

# If schedule doesn't exist, generates one automatically!

Response:
{
  "schedule": {
    "date": "2026-03-31",
    "tasks": [
      {
        "taskId": "abc123",
        "scheduledTime": "14:00",
        "order": 0
      }
    ],
    "breaks": [],
    "pointsEarned": 0,
    "tasksCompleted": 0
  },
  "plan": {
    "date": "2026-03-31",
    "tasks": [ /* task objects */ ],
    "suggestions": [
      {
        "taskId": "abc123",
        "recommendedTime": "14:00",
        "reason": "Best time for homework based on your energy patterns",
        "successProbability": 0.75,
        "confidence": 0.82
      }
    ],
    "energyForecast": {
      "morning": "⚡ Good",
      "afternoon": "⚡⚡ Great",
      "evening": "😴 Low"
    },
    "totalPointsPossible": 45
  },
  "generated": true
}
```

#### Save/Update Schedule
```bash
POST /api/schedule

{
  "date": "2026-03-31",
  "tasks": [
    {
      "taskId": "abc123",
      "scheduledTime": "15:00",
      "order": 0
    }
  ],
  "breaks": [
    {
      "name": "Lunch",
      "startTime": "12:00",
      "endTime": "13:00",
      "type": "meal"
    }
  ],
  "pointsEarned": 0,
  "tasksCompleted": 0
}

Response:
{
  "schedule": { /* saved schedule */ }
}
```

---

## Rule-Based AI Logic

### How Scheduling Works (Without ML)

1. **Peak Energy Detection**
   - Analyzes energy logs from last 7 days
   - Finds when user is most energetic (morning/afternoon/evening)
   
2. **Task Categorization**
   - Each category has preferred times:
     - Homework: afternoon (after school)
     - Work: morning (peak focus)
     - Exercise: morning (ideally)
     - Social: evening
     - Family: evening
     - Rest: anytime

3. **Energy Matching**
   - High-energy tasks (priority 5, energy 4-5) → peak hours
   - Medium tasks (priority 3) → flexible afternoon
   - Low tasks (priority 1) → anytime

4. **Success Scoring**
   - Combines category preference + energy match + priority boost
   - Generates confidence score (0-1)

### Example: How "Do homework tomorrow at 3pm" Gets Scheduled

```
Input: "Do homework for 2 hours tomorrow at 3pm"
  ↓
Parser extracts:
  - Title: "Do homework"
  - Category: "homework"
  - Duration: 120 min
  - Energy: 4/5 (requires focus)
  - Priority: 3/5 (default)
  ↓
Scheduler analyzes:
  - User's energy patterns (last 7 days)
  - "Are you typically energetic at 3pm?" 
  - "Is homework better in afternoon? Yes!"
  - Success probability: 75%
  - Confidence: high (user specified time, so follow it)
  ↓
Result:
  - Scheduled: 3pm (user specified)
  - Why? "Best time for homework based on your energy patterns"
  - Confidence: 0.82/1.0
```

---

## Gamification System

### Points & Rewards

- **Base Points**: 10 per task (configurable by `pointsValue`)
- **Bonus Points**: Extra for early completion, high priority, etc.
- **Levels**: 500 points per level (Level 0 → 1 at 500 pts, etc.)

### Streaks

- **Current Streak**: Consecutive days with completed tasks
- **Longest Streak**: All-time record
- **Daily Reset**: Must complete at least 1 task to maintain streak

### Achievements

Automatically unlocked at milestones:

| Achievement | Trigger | Emoji |
|------------|---------|-------|
| Task Master | 10 tasks | 🎯 |
| Achiever | 50 tasks | ⭐ |
| Century | 100 tasks | 💯 |
| Week Warrior | 7-day streak | ⚡ |
| Month Master | 30-day streak | 🔥 |
| Level 5 | Reach level 5 | 📈 |
| Level 10 | Reach level 10 | 🚀 |
| One Hour | 60 min completed | ⏱️ |
| Five Hours | 300 min completed | ⏳ |

---

## Data Types Reference

### Task
```typescript
{
  id: string;
  userId: string;
  title: string;
  description?: string;
  scheduledTime?: Date;
  duration: number; // minutes
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'homework' | 'work' | 'chores' | 'exercise' | 'social' | 'personal' | 'family' | 'rest';
  energyRequired: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  completedAt?: Date;
  pointsValue: number;
  funLevel: 1 | 2 | 3 | 4 | 5;
  voiceCreated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### EnergyLog
```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  morning: 1 | 2 | 3 | 4 | 5;
  afternoon: 1 | 2 | 3 | 4 | 5;
  evening: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Gamification
```typescript
{
  userId: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  tasksCompleted: number;
  totalTimeSpent: number; // minutes
  updatedAt: Date;
}
```

---

## Testing with cURL

### Full Flow Example

```bash
# 1. Create a task
curl -X POST http://localhost:3000/api/goals \
  -H "x-user-id: testuser123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math homework",
    "category": "homework",
    "priority": 4,
    "duration": 60,
    "energyRequired": 4,
    "pointsValue": 15
  }'

# Response: { "task": { "id": "task-abc123", ... } }

# 2. Log today's energy
curl -X POST http://localhost:3000/api/energy-log \
  -H "x-user-id: testuser123" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-31",
    "morning": 3,
    "afternoon": 5,
    "evening": 2
  }'

# 3. Get daily schedule with AI suggestions
curl -X GET "http://localhost:3000/api/schedule?date=2026-03-31" \
  -H "x-user-id: testuser123"

# Response: Includes suggestions like "Schedule for 2-4pm - your peak afternoon energy!"

# 4. Parse voice input
curl -X POST http://localhost:3000/api/tasks/parse-voice \
  -H "x-user-id: testuser123" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Study for science test tomorrow at 4pm",
    "createImmediate": true
  }'

# 5. Complete a task and earn rewards
curl -X POST http://localhost:3000/api/tasks/task-abc123/complete \
  -H "x-user-id: testuser123"

# Response: Shows points earned, streaks, new achievements!
```

---

## Architecture Overview

### File Structure
```
src/
├── types/
│   └── simplified.ts          # All TypeScript interfaces
├── lib/
│   ├── firebase.ts            # Firebase initialization
│   └── firebaseUtils.ts       # Firestore CRUD operations
├── utils/
│   ├── ruleBasedScheduler.ts  # AI scheduling logic
│   ├── voiceTaskParser.ts     # NLP parsing
│   └── gamificationEngine.ts  # Points, streaks, achievements
└── app/api/
    ├── goals/
    │   └── route.ts           # Task CRUD
    ├── tasks/
    │   ├── parse-voice/route.ts
    │   └── [id]/complete/route.ts
    ├── energy-log/route.ts
    └── schedule/route.ts
```

### Data Flow

```
Voice Input
    ↓
[voiceTaskParser] extracts task details
    ↓
[createTask] saves to Firestore
    ↓
[ruleBasedScheduler] analyzes energy patterns
    ↓
Suggests optimal time with confidence score
    ↓
User completes task
    ↓
[gamificationEngine] awards points, checks achievements
    ↓
Streak updated, new level unlocked?
    ↓
Frontend shows rewards animation
```

---

## Common Issues & Solutions

### "User ID required" Error
- **Cause**: Missing `x-user-id` header
- **Solution**: Add header to all API requests

### Schedule has no suggestions
- **Cause**: No energy logs yet
- **Solution**: Log energy first with POST /api/energy-log
- **Default**: Uses afternoon peak if no logs available

### Task not appearing in GET /api/goals
- **Cause**: Might be completed or filter is excluding it
- **Solution**: Try without filters: `GET /api/goals`

### Voice parser low confidence
- **Cause**: Ambiguous input (e.g., "do stuff")
- **Solution**: Be more specific ("Do math homework for 2 hours")

---

## Next Steps (Frontend Integration)

1. **Task Creation UI** - Input form + voice button
2. **Daily Dashboard** - Shows today's schedule with AI suggestions
3. **Energy Check-in** - Daily popup: "How energetic are you?"
4. **Rewards Display** - Animated point gains, achievement popups
5. **Streak Tracker** - Fire emoji counter 🔥

---

## Phase 2 Enhancements (With ML)

Once Phase 1 gets traction:
- Duration prediction (learn how long tasks actually take)
- Success prediction (when is user likely to complete?)
- Smart bundling (group similar tasks)
- Burnout detection (suggest breaks)
- Family time optimization

---

## Questions?

Check `IMPLEMENTATION_PLAN.md` for the full strategic vision, or the individual utility files for detailed algorithm documentation.

Happy scheduling! 🚀
