# AI Feedback Loop Mechanism Specification

## Executive Summary

This document details the mathematical and statistical methods by which the AI-powered daily planner tracks completion metrics, learns from user behavior, and continuously improves planning accuracy through a closed-loop feedback system.

---

## 1. Feedback Loop Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI FEEDBACK LOOP ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────────┐                                                            │
│   │   INPUT      │  User goals, importance levels, time blocks               │
│   │   LAYER      │  External data (calendar, weather, health)             │
│   └──────┬───────┘                                                            │
│          │                                                                    │
│          ▼                                                                    │
│   ┌──────────────┐     ┌──────────────────────────────────────────────┐      │
│   │   AI PLANNING│────▶│  ML MODELS                                  │      │
│   │   ENGINE     │     │  • Duration Predictor (XGBoost)            │      │
│   └──────┬───────┘     │  • Productivity Scorer (Neural Network)    │      │
│          │             │  • Pattern Detector (LSTM)                 │      │
│          │             │  • Recommendation Engine (Hybrid CF)       │      │
│          │             └──────────────────────────────────────────────┘      │
│          │                                                                    │
│          ▼                                                                    │
│   ┌──────────────┐     ┌──────────────────────────────────────────────┐      │
│   │   EXECUTION  │────▶│  TRACKING METRICS                           │      │
│   │   & TRACKING │     │  • Task completion timestamps               │      │
│   └──────┬───────┘     │  • Actual vs estimated duration            │      │
│          │             │  • Energy self-reports                      │      │
│          │             │  • Interruption events                      │      │
│          │             │  • Quality ratings                          │      │
│          │             └──────────────────────────────────────────────┘      │
│          │                                                                    │
│          ▼                                                                    │
│   ┌──────────────┐     ┌──────────────────────────────────────────────┐      │
│   │   ANALYSIS   │────▶│  STATISTICAL METHODS                      │      │
│   │   & LEARNING │     │  • Bayesian updating for duration estimates│      │
│   └──────┬───────┘     │  • Moving averages for productivity trends  │      │
│          │             │  • Correlation analysis for patterns       │      │
│          │             │  • Regression for success factors           │      │
│          │             └──────────────────────────────────────────────┘      │
│          │                                                                    │
│          ▼                                                                    │
│   ┌──────────────┐                                                            │
│   │   MODEL      │  Retraining with new data, weight updates               │
│   │   UPDATES    │  A/B testing for algorithm improvements                 │
│   └──────┬───────┘                                                            │
│          │                                                                    │
│          └──────────────────────────────────────────────────────────────▶    │
│                                    (Loop back to INPUT LAYER)                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Collection Layer

### 2.1 Tracked Metrics Specification

| Data Point | Collection Method | Frequency | Storage Format | Privacy Level |
|------------|-------------------|-----------|----------------|---------------|
| **Task Creation Events** | API logging | Real-time | JSON | Internal |
| **Task Completion Timestamp** | User check-in + automatic detection | Per event | ISO 8601 datetime | Internal |
| **Estimated Duration** | User input at creation | Per task | Integer (minutes) | Internal |
| **Actual Duration** | Completion time - start time | Per completion | Integer (minutes) | Internal |
| **Energy Self-Reports** | Optional user input (1-10 scale) | 2-3x daily | Integer | Internal |
| **Interruption Events** | User logging + calendar sync | Per event | JSON with context | Internal |
| **Goal Achievement Status** | Binary completion tracking | Per goal | Boolean + timestamp | Internal |
| **Schedule Modifications** | Audit log of all changes | Per change | JSON diff | Internal |
| **User Feedback on Suggestions** | Accept/reject/modify actions | Per suggestion | Enum + rating | Internal |
| **Quality Ratings** | Post-completion satisfaction (1-5) | Per task | Integer | Internal |
| **Context Tags** | Location, device, app usage | Per session | JSON | Anonymized |

### 2.2 Data Schema for ML Features

```python
# Core Feature Schema for ML Models

class TaskFeatures:
    """Feature vector for task-level predictions"""
    
    # Temporal Features
    hour_of_day: int              # 0-23
    day_of_week: int              # 0-6 (Mon-Sun)
    month: int                    # 1-12
    is_weekend: bool
    is_holiday: bool
    days_until_deadline: int
    
    # Task Characteristics
    category: str                 # One-hot encoded
    importance_level: int         # 1-5
    estimated_duration: int         # Minutes
    has_dependencies: bool
    dependency_count: int
    subtask_count: int
    
    # Historical Patterns
    user_avg_completion_rate: float
    user_avg_duration_accuracy: float
    category_completion_rate: float
    time_slot_success_rate: float
    
    # Context Features
    calendar_density: float       # 0-1 (busy-ness)
    energy_level: int             # 1-10 (if reported)
    weather_condition: str        # Categorical
    sleep_quality: int            # 1-10 (if available)


class UserBehaviorFeatures:
    """Feature vector for user-level pattern analysis"""
    
    # Productivity Metrics
    daily_completion_rate: float
    weekly_completion_rate: float
    avg_tasks_per_day: float
    peak_productivity_hour: int
    
    # Behavioral Patterns
    procrastination_score: float
    consistency_score: float
    planning_accuracy: float
    reschedule_frequency: float
    
    # Preference Profiles
    preferred_task_duration: int
    preferred_break_length: int
    chronotype: str
    work_style: str
    
    # Learning Progress
    model_accuracy_trend: float
    suggestion_acceptance_rate: float
    insight_engagement_rate: float
```

---

## 3. Statistical Methods for Learning

### 3.1 Duration Prediction Model

**Algorithm**: Bayesian Linear Regression with XGBoost Boosting

**Mathematical Foundation**:

```
Predicted Duration = f(Task Features, User Historical Patterns)

Where f is a composite model:

1. Base Estimate (Bayesian):
   P(duration | features) ∝ P(features | duration) × P(duration)
   
   Prior: P(duration) ~ Gamma(α, β) where α, β learned from user history
   
2. Boosted Correction (XGBoost):
   correction = Σ(γ_i × h_i(features))
   
   Where h_i are decision trees and γ_i are learning rates

3. Final Prediction:
   duration_pred = base_estimate × (1 + correction)
   
4. Confidence Interval:
   CI_95 = [duration_pred × 0.8, duration_pred × 1.2] (calibrated per user)
```

**Model Update Mechanism**:
- Online learning: Update after each task completion
- Batch retraining: Weekly with last 90 days of data
- Weight decay: Older data weighted 0.95^n where n = weeks ago

### 3.2 Productivity Scoring Algorithm

**Algorithm**: Weighted Moving Average with Neural Network Pattern Recognition

**Mathematical Foundation**:

```
Productivity Score (0-100) = w1×Completion + w2×Quality + w3×Efficiency + w4×Consistency

Where:

1. Completion Component (w1 = 0.35):
   Completion = (tasks_completed / tasks_planned) × 100
   
   Weighted by importance:
   Completion_weighted = Σ(completed_i × importance_i) / Σ(planned_i × importance_i) × 100

2. Quality Component (w2 = 0.25):
   Quality = average(user_quality_ratings) × 20
   
   Adjusted by task complexity:
   Quality_adjusted = Quality × (1 + 0.1 × complexity_factor)

3. Efficiency Component (w3 = 0.25):
   Efficiency = 100 - |actual_duration - estimated_duration| / estimated_duration × 100
   
   Capped at 100, floor at 0

4. Consistency Component (w4 = 0.15):
   Consistency = 100 - standard_deviation(daily_scores_last_7_days)
   
   Higher consistency = lower variance

Temporal Smoothing:
Score_today = 0.7 × Score_calculated + 0.3 × Score_yesterday
```

### 3.3 Pattern Recognition Statistics

**Algorithm**: LSTM Neural Network with Attention Mechanism

**Mathematical Foundation**:

```
Pattern Detection = LSTM(Sequence of User Events) + Attention Weights

1. Sequence Encoding:
   For each day d in sequence [d-30, ..., d-1, d]:
   x_d = [completion_rate, avg_duration, energy, interruptions, ...]

2. LSTM Processing:
   h_t, c_t = LSTM(x_t, h_{t-1}, c_{t-1})
   
   Where:
   - h_t = hidden state at time t
   - c_t = cell state at time t
   - Forget gate: f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
   - Input gate: i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
   - Output gate: o_t = σ(W_o · [h_{t-1}, x_t] + b_o)

3. Attention Mechanism:
   Attention weights: α_t = softmax(W_a · h_t + b_a)
   Context vector: c = Σ(α_t · h_t)

4. Pattern Classification:
   Pattern_type = softmax(W_p · c + b_p)
   
   Classes: ["Morning_Person", "Night_Owl", "Consistent", "Erratic", 
              "Deadline_Driven", "Proactive", "Reactive", ...]

5. Confidence Score:
   Confidence = max(Pattern_type) - second_max(Pattern_type)
```

---

## 4. UI/API Layer Interaction

### 4.1 API Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      REST API (HTTP/JSON)                      │ │
│  │  Base URL: https://api.dailyplanner.ai/v1                      │ │
│  │  Authentication: JWT Bearer Token                              │ │
│  │  Rate Limiting: 1000 requests/hour (adjustable per tier)       │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│          ┌───────────────────┼───────────────────┐                    │
│          ▼                   ▼                   ▼                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │  Goal APIs   │   │  Task APIs   │   │ Schedule APIs│           │
│  │ ──────────── │   │ ──────────── │   │ ──────────── │           │
│  │ POST /goals  │   │ POST /tasks  │   │ POST /sched  │           │
│  │ GET /goals   │   │ GET /tasks   │   │ GET /sched   │           │
│  │ PUT /goals   │   │ PUT /tasks   │   │ PUT /sched   │           │
│  │ DEL /goals   │   │ DEL /tasks   │   │ DEL /sched   │           │
│  └──────────────┘   └──────────────┘   └──────────────┘           │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │ Analytics    │   │ Suggestion   │   │ Integration  │           │
│  │ APIs         │   │ APIs         │   │ APIs         │           │
│  │ ──────────── │   │ ──────────── │   │ ──────────── │           │
│  │ GET /analy   │   │ GET /suggest │   │ POST /integ  │           │
│  │ GET /insights│   │ POST /feedback│  │ GET /integ   │           │
│  │ GET /reports │   │ GET /history │   │ DEL /integ   │           │
│  └──────────────┘   └──────────────┘   └──────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 UI Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      UI COMPONENT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      STATE MANAGEMENT (Redux/Zustand)            │ │
│  │  • User Profile State                                            │ │
│  │  • Goals & Tasks State                                           │ │
│  │  • Schedule State                                                  │ │
│  │  • AI Suggestions State                                            │ │
│  │  • Analytics State                                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│          ┌───────────────────┼───────────────────┐                    │
│          ▼                   ▼                   ▼                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │  Input       │   │  Display     │   │  Feedback    │           │
│  │  Components  │   │  Components  │   │  Components  │           │
│  │ ──────────── │   │ ──────────── │   │ ──────────── │           │
│  │ GoalForm     │   │ ScheduleView │   │ SuggestionCard│          │
│  │ TaskForm     │   │ Timeline     │   │ FeedbackButtons│          │
│  │ Importance   │   │ CalendarGrid │   │ RatingModal   │          │
│  │ TimeBlock    │   │ ProgressBar  │   │ InsightCard   │          │
│  │ Duration     │   │ Heatmap      │   │ AlertBanner   │          │
│  └──────────────┘   └──────────────┘   └──────────────┘           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      API CLIENT LAYER                            │ │
│  │  • REST API Client (Axios/Fetch)                                 │ │
│  │  • WebSocket Client (Real-time updates)                          │ │
│  │  • GraphQL Client (Complex queries)                              │ │
│  │  • Request Caching & Retry Logic                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Real-Time Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User Action                    System Response                       │
│  ───────────                    ───────────────                       │
│                                                                       │
│  ┌─────────┐                   ┌─────────────┐                     │
│  │ Creates │──────────────────▶│  Store in   │                     │
│  │  Goal   │                   │  Database   │                     │
│  └─────────┘                   └──────┬──────┘                     │
│                                       │                              │
│                                       ▼                              │
│                              ┌─────────────┐                         │
│                              │  Trigger    │                         │
│                              │  ML Models  │                         │
│                              └──────┬──────┘                         │
│                                     │                                  │
│           ┌─────────────────────────┼─────────────────────────┐       │
│           ▼                         ▼                         ▼       │
│    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐│
│    │  Duration   │          │  Schedule   │          │ Suggestion  ││
│    │  Prediction │          │  Optimizer  │          │   Engine    ││
│    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘│
│           │                         │                         │       │
│           └─────────────────────────┼─────────────────────────┘       │
│                                     ▼                                  │
│                            ┌─────────────┐                             │
│                            │  Aggregate  │                             │
│                            │  Results    │                             │
│                            └──────┬──────┘                             │
│                                   │                                    │
│                                   ▼                                    │
│  ┌─────────┐              ┌─────────────┐              ┌─────────┐   │
│  │  User   │◀─────────────│  WebSocket  │─────────────▶│   UI    │   │
│  │Receives│              │   Push      │              │ Updates │   │
│  │Suggestions│            └─────────────┘              └─────────┘   │
│  └─────────┘                                                             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Methods for Tracking Completion Metrics

### 2.1 Task Duration Accuracy Tracking

**Objective**: Measure and improve the accuracy of time estimates

**Metric: Mean Absolute Percentage Error (MAPE)**

```
MAPE = (1/n) × Σ |(Actual_i - Estimated_i) / Actual_i| × 100

Where:
- n = number of completed tasks
- Actual_i = actual time taken for task i
- Estimated_i = estimated time for task i

Target: MAPE < 25% (industry standard for time estimation)
```

**Metric: Duration Prediction Confidence Interval**

```
For each prediction, calculate 95% confidence interval:

CI_lower = prediction × (1 - calibration_factor × MAPE_user)
CI_upper = prediction × (1 + calibration_factor × MAPE_user)

Where calibration_factor is learned per user (typically 0.5-1.5)
```

### 2.2 Completion Rate Tracking

**Objective**: Measure goal achievement consistency

**Metric: Weighted Completion Rate (WCR)**

```
WCR = Σ(completed_task_i × importance_weight_i) / Σ(planned_task_i × importance_weight_i)

Where importance_weights:
- Critical (5): weight = 2.0
- High (4): weight = 1.5
- Medium (3): weight = 1.0
- Low (2): weight = 0.7
- Minimal (1): weight = 0.5

Target: WCR > 0.75 (75% weighted completion)
```

**Metric: Completion Velocity Trend**

```
Velocity_t = α × WCR_t + (1-α) × Velocity_{t-1}

Where α = 0.3 (smoothing factor)

Trend direction:
- Velocity_t > Velocity_{t-7}: Improving (↑)
- Velocity_t < Velocity_{t-7}: Declining (↓)
- |difference| < 0.05: Stable (→)
```

### 2.3 Productivity Pattern Metrics

**Objective**: Identify when users are most productive

**Metric: Hourly Productivity Score (HPS)**

```
For each hour h of the day:

HPS_h = (1/n) × Σ [completion_rate × quality_rating × efficiency_score]

Where:
- n = number of days with data for hour h
- completion_rate = tasks completed / tasks planned for that hour
- quality_rating = average user-reported quality (1-5 scale)
- efficiency_score = estimated_duration / actual_duration (capped at 2.0)

Peak hours identified as: argmax(HPS_h) for h in [0, 23]
```

**Metric: Day-of-Week Performance Index (DPI)**

```
For each day of week d:

DPI_d = (WCR_d - mean(WCR)) / std(WCR)

Interpretation:
- DPI > 0.5: High performance day
- -0.5 < DPI < 0.5: Average performance day
- DPI < -0.5: Low performance day
```

### 2.4 Learning Effectiveness Metrics

**Objective**: Measure how well the AI is improving

**Metric: Prediction Accuracy Improvement (PAI)**

```
PAI_t = (MAPE_baseline - MAPE_current) / MAPE_baseline × 100

Where:
- MAPE_baseline = MAPE using simple heuristic (e.g., average of last 5 similar tasks)
- MAPE_current = MAPE using AI model predictions

Target: PAI > 20% (AI performs 20% better than baseline)
```

**Metric: Suggestion Acceptance Rate (SAR)**

```
SAR = accepted_suggestions / total_suggestions × 100

Breakdown by suggestion type:
- SAR_duration: Acceptance of duration adjustments
- SAR_scheduling: Acceptance of schedule changes
- SAR_prioritization: Acceptance of priority changes
- SAR_breaks: Acceptance of break suggestions

Target: SAR > 60% overall, > 40% for each category
```

---

## 3. Weight Update Mechanisms

### 3.1 User-Specific Planning Weights

The system maintains a set of weights that personalize the planning algorithm for each user. These weights are updated based on observed behavior.

**Weight Vector Definition**:

```
W_user = [w_chronotype, w_category_pref, w_duration_bias, w_break_need, w_buffer_time]

Where:
- w_chronotype: Weight for time-of-day preferences (0.5 - 2.0)
- w_category_pref: Category-specific productivity weights (vector of 7 values)
- w_duration_bias: Systematic over/under-estimation correction (-0.3 to +0.3)
- w_break_need: Break frequency preference multiplier (0.5 - 1.5)
- w_buffer_time: Transition time preference in minutes (5 - 30)
```

**Weight Update Formula**:

```
For each completed task, update weights using gradient descent:

w_new = w_old - α × ∂L/∂w

Where:
- α = learning rate (0.01 for stability)
- L = loss function (prediction error)
- ∂L/∂w = gradient of loss with respect to weight

Specific updates:

1. Chronotype Weight:
   If task completed successfully at hour h:
   w_chronotype[h] += 0.05 × (quality_rating - 3)
   
   Normalized: w_chronotype = softmax(w_chronotype)

2. Duration Bias:
   error = (actual - estimated) / estimated
   w_duration_bias += 0.01 × error
   
   Clamped: w_duration_bias ∈ [-0.3, 0.3]

3. Category Preferences:
   For each category c:
   w_category_pref[c] += 0.02 × (completion_rate_c - 0.5)
   
   Normalized: w_category_pref = softmax(w_category_pref)
```

### 3.2 Model Retraining Triggers

| Trigger Type | Condition | Action |
|--------------|-----------|--------|
| **Volume Trigger** | 1000 new task completions | Incremental model update |
| **Time Trigger** | 7 days elapsed | Scheduled retraining |
| **Performance Trigger** | MAPE increases > 10% | Emergency retraining |
| **User Trigger** | User reports inaccurate predictions | Priority retraining |
| **Seasonal Trigger** | Month/season change | Full retraining with seasonal features |

---

## 4. Feedback Loop Cycle

### 4.1 Micro-Loop (Per Task)

**Frequency**: Real-time (every task event)
**Latency**: < 100ms

```
1. Task Created → Store features, generate initial prediction
2. Task Started → Log start time, context
3. Task Completed → Calculate actual duration, quality
4. Immediate Update → Update user weights, cache
5. Feedback Generated → Show comparison, collect rating
```

### 4.2 Mini-Loop (Daily)

**Frequency**: End of each day
**Latency**: < 5 minutes

```
1. Aggregate daily metrics (completion rate, productivity score)
2. Update daily pattern models
3. Generate daily insights report
4. Adjust tomorrow's schedule based on learnings
5. Send personalized daily briefing
```

### 4.3 Macro-Loop (Weekly/Monthly)

**Frequency**: Weekly analysis, monthly model retraining
**Latency**: Hours (batch processing)

```
1. Aggregate weekly/monthly patterns
2. Run full pattern detection algorithms
3. Retrain ML models with new data
4. A/B test algorithm improvements
5. Deploy updated models
6. Generate comprehensive insights report
```

---

## 5. Appendices

### Appendix A: API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/goals` | CRUD | Goal management |
| `/api/v1/tasks` | CRUD | Task management |
| `/api/v1/schedule` | GET/POST | Schedule generation |
| `/api/v1/suggestions` | GET | AI recommendations |
| `/api/v1/analytics` | GET | User analytics |
| `/api/v1/insights` | GET | Pattern insights |
| `/api/v1/integrations` | CRUD | Third-party connections |

### Appendix B: Database Schema Overview

**Core Tables:**
- `users` - User accounts and profiles
- `goals` - User goals and objectives
- `tasks` - Individual tasks
- `time_blocks` - Scheduled time periods
- `completions` - Task completion records
- `suggestions` - AI-generated recommendations
- `insights` - Generated pattern insights
- `integrations` - Connected services

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Time Block** | A defined period allocated for specific activities |
| **Chronotype** | Individual's natural inclination for sleep/wake times |
| **Flow State** | Mental state of complete absorption in an activity |
| **Productivity Score** | Calculated metric of work output quality and quantity |
| **Goal Drift** | Gradual deviation from long-term objectives |
| **Opportunity Cost** | Value of alternatives foregone by a choice |

---

*Document Version: 1.0*  
*Last Updated: 2026-03-23*  
*Status: Draft for Review*
