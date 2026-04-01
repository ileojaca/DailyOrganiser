# DailyOrganiser Implementation Plan - Refined & Actionable

## Project Status
- **Firebase**: Already set up and configured
- **Supabase**: Initially planned, switched to Firebase mock design (skip for now)
- **Current**: No backend AI/ML implemented yet
- **Goal**: Transform into simple, powerful daily AI planner for all ages

## Refined Vision: "DailyOrganiser - Your AI Planning Buddy"
A friendly AI coach that helps plan your day like a game. Works for 5-year-olds to busy professionals. Simple interface, powerful intelligence underneath.

---

## Database Strategy (Firebase Firestore - Already Set Up)

### Simplified Schema (Replace Complex Current Schema)
```
/users/{userId}
├── profile: {
│   name, ageGroup: 'kid'|'teen'|'adult'|'parent',
│   timezone, energyPattern, preferences
│ }
├── tasks/{taskId}: {
│   title, description, scheduledTime, duration,
│   priority: 1-5, category, completed, completedAt,
│   funLevel: 1-5, rewardEarned, createdAt
│ }
├── dailySchedule/{date}: {
│   tasks: [taskId], breaks: [breakId], rewards: []
│ }
├── energyLogs/{date}: {
│   morning: 1-5, afternoon: 1-5, evening: 1-5
│ }
├── family/{memberId}: {
│   relationship: 'child'|'parent'|'sibling',
│   name, avatar, assignedTasks: [taskId],
│   pointsBalance: number, achievements: []
│ }
└── habits/{habitId}: {
    name, frequency: 'daily'|'weekly',
    streak, lastCompleted, createdAt
  }
```

### Migration Notes
- Current complex schema can be gradually simplified
- Archive old data, start fresh with simpler structure
- Keep Firestore Security Rules for family data

---

## AI/ML Implementation Roadmap

### Phase 1: Rule-Based "AI" (MVP - 2 weeks)
**Goal**: Feel intelligent without actual ML

#### 1.1 Voice Task Creation
- Parse natural language: "homework tomorrow 3pm"
- Extract: task name, time, duration
- Simple keyword matching for category

#### 1.2 Energy Pattern Detection
- Daily 1-question check-in: "How energetic are you? (1-5 stars)"
- Store energyLogs/{date}
- Find peak hours by analyzing completed tasks vs energy

#### 1.3 Simple Scheduling Algorithm
```
Rule-Based Scheduler:
1. High priority tasks → Peak energy windows
2. Medium tasks → Mid-level energy windows
3. Low tasks → Any time
4. Always respect: meals, sleep, breaks
5. Group similar tasks together
```

#### 1.4 Voice Input Backend
- Create API endpoint: `POST /api/tasks/parse-voice`
- Input: audio or text transcript
- Output: structured task {title, time, duration, category}
- Use OpenAI Whisper API or simple regex for MVP

**Implementation**: Add to `src/app/api/tasks/parse-voice/route.ts`

---

### Phase 2: Basic ML (Month 2-3)
**Goal**: Personalized suggestions based on user patterns

#### 2.1 Duration Prediction
- Model: Simple linear regression
- Input: task category, day of week, time of day
- Output: predicted duration (with confidence)
- Training: User's historical task completions

#### 2.2 Success Prediction
- Model: Logistic regression
- Input: energy level, time of day, task priority, category
- Output: probability of completion (0-1)
- Use: Suggest when task has highest success chance

#### 2.3 Implementation
- Client-side: Use TensorFlow.js for inference
- Server-side: Train models on Vercel serverless
- Store trained models in Firebase Storage
- Update models weekly

**Implementation**: 
- Add to `src/utils/predictions/durationPredictor.ts`
- Add to `src/utils/predictions/successPredictor.ts`

---

### Phase 3: Advanced ML (Month 6+)
**Goal**: Premium tier with personalized AI coach

#### 3.1 Personalized Scheduling
- XGBoost model trained per user
- Considers: past patterns, energy cycles, family events
- Suggests: optimal times, break recommendations, task bundling

#### 3.2 Burnout Prevention
- Monitor: weekly work hours, family time, sleep quality
- Alert: "You're working too hard, I'm scheduling a break"
- Prevent: overcommitment based on historical burnout signals

#### 3.3 Smart Family Coordination
- Detect: when family members have overlapping free time
- Suggest: family activities, meal prep times, quality time

---

## Feature Implementation Priority

### Must-Have (MVP - Week 1-2)
- [ ] Firebase data model refinement
- [ ] Simple task CRUD (voice + manual input)
- [ ] Daily schedule view with drag-and-drop
- [ ] Basic energy tracking (1-5 scale daily)
- [ ] Simple rule-based scheduling

### Should-Have (Week 3-4)
- [ ] Gamification: points, streaks, achievements
- [ ] Family sharing: view shared calendar
- [ ] Reminders & notifications
- [ ] Task categories (homework, chores, exercise, etc.)

### Nice-to-Have (Month 2+)
- [ ] ML-based duration prediction
- [ ] Success probability scoring
- [ ] Smart suggestions engine
- [ ] Premium paywall with Stripe

---

## Database & Backend Checklist

### Firebase Setup (Already Done - Verify)
- [ ] Firestore collections initialized
- [ ] Security rules configured
- [ ] Authentication (OAuth providers)
- [ ] Backup/export functionality
- [ ] GDPR compliance (data export/delete)

### Backend APIs to Build
- [ ] `POST /api/tasks/create` - Add new task
- [ ] `POST /api/tasks/parse-voice` - NLP task parsing
- [ ] `GET /api/schedule?date=` - Get day's schedule
- [ ] `POST /api/energy-log` - Log daily energy
- [ ] `GET /api/suggestions?date=` - AI suggestions
- [ ] `POST /api/tasks/:id/complete` - Mark done, earn rewards

### Data Collection Strategy
- Collect from day 1: energy logs, task times, completions
- Use for training baseline models in Month 2
- Never use for analysis without user consent
- Aggregate data for insights (no individual tracking)

---

## Monetization Plan

### Free Tier (Core App)
- Unlimited basic task management
- Voice input & scheduling
- Family calendar view
- Basic rewards/points

### Premium Tier ($4.99/month)
- AI learns energy patterns & suggests optimal times
- Advanced family features (assign chores, track allowances)
- Unlimited integrations
- Custom themes
- Priority support

### Launch Strategy
- Launch free tier first (3-4 weeks)
- Get 100+ users, validate engagement
- Add free→premium upgrade page
- Premium roadmap based on user feedback

---

## Success Metrics to Track

### Usage Metrics
- Daily active users (DAU)
- Task creation rate (tasks/user/day)
- Voice input adoption (% using voice vs manual)
- Feature usage (which AI suggestions are tried?)

### Quality Metrics
- Task completion rate (% of scheduled tasks done)
- Energy prediction accuracy (>70% of suggestions accepted)
- User satisfaction (in-app rating after suggestions)

### Business Metrics
- Retention: 70% DAU retention after 30 days
- Premium conversion: 15%+ of free users upgrade
- Average revenue per user (ARPU)

---

## Next Immediate Steps

1. **Review & Simplify Firebase Schema** - Archive complex structure
2. **Build Voice Task Parser** - Start with regex, upgrade to AI later
3. **Implement Energy Tracking** - Simple daily 1-question check-in
4. **Create Basic Scheduler** - Rule-based task placement
5. **Add Gamification** - Points for completions, streaks
6. **Test with 10-20 Beta Users** - Get feedback before scaling

---

## Key Decisions Made
✅ Firebase only (no Supabase)
✅ Start with rule-based "AI" (no complex ML initially)
✅ Focus on voice input as a differentiator
✅ Gamification for engagement & retention
✅ Family sharing as key feature
✅ Simple pricing model with clear free→premium path
