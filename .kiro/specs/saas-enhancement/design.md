# SaaS Enhancement - Technical Design Document

## 1. System Architecture

### 1.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages: /, /auth, /planner, /focus, /insights, /profile, /team │
│  Components: AppShell, GoalInput, TaskDashboard, AISuggestions │
│  Hooks: useGoals, useTimeBlocks, useAccomplishmentLogs         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js API)                     │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/* - Authentication endpoints                         │
│  /api/goals/* - Goal CRUD operations                            │
│  /api/ai/* - AI processing endpoints                            │
│  /api/subscriptions/* - Stripe subscription management          │
│  /api/webhooks/* - External webhook handlers                    │
│  /api/teams/* - Team collaboration endpoints                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Services                              │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Auth - Authentication                                  │
│  Firestore - Real-time database                                 │
│  Stripe - Payment processing                                    │
│  OpenAI - NLP task parsing (optional)                           │
│  Google Calendar API - Calendar integration                     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Model

#### User Profile Collection
```
users/{userId}
├── email: string
├── fullName: string
├── timezone: string
├── chronotype: 'lark' | 'owl' | 'intermediate'
├── energyPattern: { peakHours: string[], lowHours: string[] }
├── preferences: { notifications: boolean, reminders: boolean, ... }
├── subscription: { tier: 'free' | 'pro' | 'team', stripeCustomerId: string }
├── theme: { mode: 'light' | 'dark', accentColor: string }
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### Goals Collection
```
users/{userId}/goals/{goalId}
├── title: string
├── description: string?
├── category: 'work' | 'personal' | 'health' | 'learning' | 'social'
├── priority: number (1-5)
├── status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred'
├── estimatedDuration: number (minutes)
├── deadline: timestamp?
├── energyRequired: number (1-10)
├── context: { location?: string, tools?: string[], networkStatus?: string }
├── isRecurring: boolean
├── recurringPattern: 'daily' | 'weekly' | 'monthly' | 'weekdays'?
├── aiSuggestedTime: timestamp?
├── createdAt: timestamp
├── updatedAt: timestamp
└── completedAt: timestamp?
```

#### Teams Collection
```
teams/{teamId}
├── name: string
├── ownerId: string
├── members: { userId: string, role: 'owner' | 'admin' | 'member' }[]
├── inviteCode: string
├── settings: { sharedGoals: boolean, notifications: boolean }
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

## 2. Component Design

### 2.1 GoalInput Component (Enhanced)
```
Props:
- userId: string | undefined
- onGoalCreated?: (goal: Goal) => void
- initialData?: Partial<ParsedTask> // From NLP

State:
- formData: GoalFormData
- isNLPMode: boolean // Toggle between form and natural language
- isSubmitting: boolean
- status: 'idle' | 'success' | 'error'

NLP Integration:
- parseTaskInput(input: string): ParsedTask
- Auto-populate form fields from parsed result
- Show confidence indicators for parsed fields
```

### 2.2 AISuggestions Component (Enhanced)
```
Props:
- userId: string | undefined
- goals: Goal[]
- userEnergy: number
- context: TaskContext

Features:
- Real-time suggestions based on current context
- Burnout detection alerts
- Task batching recommendations
- Break suggestions
```

### 2.3 Theme Provider
```
Context: ThemeContext
├── mode: 'light' | 'dark' | 'system'
├── accentColor: string
├── setMode(mode: 'light' | 'dark' | 'system'): void
├── setAccentColor(color: string): void

Implementation:
- Tailwind CSS dark mode with class strategy
- CSS custom properties for accent colors
- LocalStorage persistence
- System preference detection
```

---

## 3. API Design

### 3.1 Authentication Endpoints
```
POST /api/auth/verify-email
├── body: { email: string, token: string }
└── response: { success: boolean }

POST /api/auth/session
├── body: { userId: string }
└── response: { sessions: Session[] }

POST /api/auth/force-logout
├── body: { userId: string, sessionId: string }
└── response: { success: boolean }
```

### 3.2 AI Endpoints
```
POST /api/ai/parse-task
├── body: { input: string }
└── response: { parsed: ParsedTask, confidence: number }

POST /api/ai/suggest-schedule
├── body: { goals: Goal[], timeBlocks: TimeBlock[], energyPattern: EnergyPattern }
└── response: { suggestions: ScheduleSuggestion[] }

POST /api/ai/predict-productivity
├── body: { userId: string, date: string }
└── response: { score: number, factors: string[], recommendations: string[] }
```

### 3.3 Subscription Endpoints
```
POST /api/subscriptions/create-checkout
├── body: { tier: 'pro' | 'team', successUrl: string, cancelUrl: string }
└── response: { checkoutUrl: string }

POST /api/subscriptions/portal
├── body: { userId: string }
└── response: { portalUrl: string }

POST /api/webhooks/stripe
├── body: { event: Stripe.Event }
└── response: { received: boolean }
```

### 3.4 Team Endpoints
```
POST /api/teams/create
├── body: { name: string, ownerId: string }
└── response: { teamId: string, inviteCode: string }

POST /api/teams/join
├── body: { inviteCode: string, userId: string }
└── response: { success: boolean, team: Team }

POST /api/teams/{teamId}/goals
├── body: { goal: Goal, assigneeId: string }
└── response: { goalId: string }
```

---

## 4. Security Design

### 4.1 Authentication Flow
```
1. User signs up/in via Firebase Auth
2. Server creates/updates user profile in Firestore
3. JWT token generated with custom claims (subscription tier)
4. Client stores token and includes in API requests
5. Server validates token and checks subscription tier for premium features
```

### 4.2 Rate Limiting
```
- API routes: 100 requests per minute per IP
- Auth endpoints: 10 requests per minute per IP
- AI endpoints: 20 requests per minute per user (free), unlimited (pro)
```

### 4.3 Data Security
```
- Firestore security rules for user data isolation
- API key rotation every 90 days
- Input sanitization on all endpoints
- CSRF protection via Next.js built-in middleware
```

---

## 5. Integration Design

### 5.1 Google Calendar Sync
```
Flow:
1. User authorizes Google Calendar access (OAuth2)
2. Store refresh token securely in Firestore
3. On task schedule change → create/update calendar event
4. On calendar event change → sync to app tasks
5. Bi-directional sync every 5 minutes via cron
```

### 5.2 Stripe Subscription Flow
```
1. User selects tier → redirect to Stripe Checkout
2. Stripe webhook → update user subscription in Firestore
3. Custom claims updated with new tier
4. Premium features unlocked immediately
```

### 5.3 Push Notifications
```
Service Worker: /public/sw.js
├── Notification permission request on first visit
├── Subscribe to FCM topics (deadlines, reminders, team)
├── Handle notification clicks → navigate to relevant page
```

---

## 6. Performance Design

### 6.1 Caching Strategy
```
- Static pages: ISR with 60 second revalidation
- User data: React Query with 5 minute stale time
- AI suggestions: Cache for 1 minute
- Team data: Real-time via Firestore listeners
```

### 6.2 Optimistic Updates
```
- Task creation: Immediate UI update, rollback on error
- Task status changes: Instant feedback
- Goal completion: Mark complete, sync in background
```

### 6.3 Bundle Optimization
```
- Dynamic imports for heavy components (charts, calendar)
- Code splitting per route
- Image optimization via next/image
- Font subsetting
```

---

## 7. PWA Configuration

### 7.1 Manifest (public/manifest.json)
```json
{
  "name": "DailyOrganiser",
  "short_name": "DailyOrg",
  "theme_color": "#4F46E5",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "start_url": "/",
  "icons": [/* various sizes */]
}
```

### 7.2 Service Worker
```
- Cache-first for static assets
- Network-first for API calls
- Background sync for offline task creation
- Push notification handling
```

---

## 8. Error Handling

### 8.1 Error Boundaries
```
- Page-level error boundary with retry option
- Component-level error boundaries for non-critical features
- Global error tracking via Sentry
```

### 8.2 User Feedback
```
- Toast notifications for success/error states
- Inline validation messages
- Loading states with skeleton screens
- Offline mode indicators
```

---

## 9. Testing Strategy

### 9.1 Unit Tests
```
- NLP parser: 90% coverage
- Utility functions: 80% coverage
- Component logic: 70% coverage
```

### 9.2 Integration Tests
```
- Auth flow: Sign up, sign in, sign out
- Goal CRUD: Create, read, update, delete
- Subscription: Create, upgrade, cancel
```

### 9.3 E2E Tests
```
- Critical user paths using Playwright
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile responsive testing
```