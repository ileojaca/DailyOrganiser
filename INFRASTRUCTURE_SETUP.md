# DailyOrganiser - Infrastructure Setup Guide (Phase 0)

**Status**: ✅ Ready to Deploy

---

## Quick Start - Deploy in 5 Minutes

### Option 1: Deploy to Vercel (Recommended)

```bash
# Login to Vercel
npm i -g vercel
vercel login

# Deploy
cd c:\Users\AI\Documents\GitHub\DailyOrganiser
vercel deploy --prod
```

**Cost**: Free tier covers MVP (100 GB bandwidth/month)

### Option 2: Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

**Cost**: Free tier covers MVP

---

## Full Infrastructure Setup

### 1. GitHub Repository Setup

**Prerequisites**: Git account with repository created

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Phase 1 MVP"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/DailyOrganiser.git
git branch -M main
git push -u origin main
```

**Verify**: Check GitHub shows all files and code

---

### 2. Vercel Deployment (Primary)

#### Step 1: Create Vercel Project

1. Go to https://vercel.com
2. Click "Import Project"
3. Connect GitHub account
4. Select DailyOrganiser repository
5. Configure settings:
   - Framework: **Next.js**
   - Root Directory: **./** (or auto-detected)
   - Build Command: **npm run build**
   - Output Directory: **.next**

#### Step 2: Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_SDK_KEY=your_admin_json_stringified
```

To get Firebase credentials:
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Copy JSON and stringify it

#### Step 3: Deploy

Click "Deploy" - Vercel auto-builds and deploys

**Result**: Your app is at `https://your-project.vercel.app`

---

### 3. Firebase Setup

#### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Create Project"
3. Name: `DailyOrganiser`
4. Enable Google Analytics (optional)
5. Select default location

#### Step 2: Enable Services

**Firestore Database**:
1. Build → Firestore Database
2. Click "Create Database"
3. Security Rules: **Start in test mode** (for dev)
4. Location: **us-central1**

**Authentication**:
1. Build → Authentication
2. Enable **Email/Password**
3. (Optional) Enable Google Sign-In

**Hosting** (if using Firebase Hosting):
1. Build → Hosting
2. Click "Get Started"
3. Install Firebase CLI: `npm i -g firebase-tools`
4. Initialize: `firebase init hosting`

#### Step 3: Update Security Rules

Replace Firestore Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents - private
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      // Nested collections
      match /{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Public data (if needed)
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth.uid != null;
    }
  }
}
```

Save to `.env.local` in project for reference.

---

### 4. GitHub Actions CI/CD

**Already configured** in `.github/workflows/deploy.yml`

#### Required GitHub Secrets

1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add these secrets:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
SLACK_WEBHOOK_URL=your_slack_webhook (optional)
```

To get Vercel tokens:
1. Go to https://vercel.com/account/tokens
2. Create new token → copy and save

#### What CI/CD Does

- ✅ Runs on every push to `main` and `develop`
- ✅ Builds and tests with Node 18 & 20
- ✅ Runs TypeScript type checking
- ✅ Deploys preview on PR
- ✅ Deploys production on main branch merge
- ✅ Notifies Slack (if configured)

**Verify**: Push a commit and watch GitHub Actions run

---

### 5. Monitoring Setup

#### Vercel Analytics

1. Dashboard → Analytics → Enable Web Vitals
2. View real-time metrics on dashboard

**Metrics tracked**:
- Cumulative Layout Shift
- First Input Delay
- Largest Contentful Paint
- Page load times
- Error rates

#### Firebase Console Monitoring

1. Build → Extensions (optional)
2. Performance → View detailed metrics
3. Set up alerts for quotas

**Monitor quota usage**:
- Firestore reads/writes
- Storage usage
- Bandwidth

#### Custom Monitoring (Optional)

Add Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

Configure in `next.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Infrastructure Diagram

```
┌─────────────────────────────────────────────────────┐
│           GitHub Repository (Source Code)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─→ GitHub Actions (CI/CD Pipeline)
                   │   ├─ Build & Test
                   │   └─ Deploy
                   │
                   ├─→ Vercel (Primary Hosting)
                   │   ├─ Next.js Build
                   │   ├─ Static CDN
                   │   └─ API Routes
                   │
                   └─→ Firebase
                       ├─ Firestore (Database)
                       ├─ Authentication
                       └─ Hosting (Backup)
```

---

## Cost Breakdown

### Free Tier (MVP Support)

| Service | Free Limit | MVP Usage | Cost |
|---------|-----------|-----------|------|
| Vercel | 100 GB/mo bandwidth | ~10 GB/mo | **$0** |
| Firebase Firestore | 50K r/day, 20K w/day | ~5K r/day | **$0** |
| Firebase Storage | 5 GB | ~100 MB | **$0** |
| GitHub Actions | 2K min/month | ~500 min | **$0** |
| **Total** | | | **$0/month** |

### Scaling (1,000+ users)

| Service | Cost |
|---------|------|
| Vercel Pro | $20/month |
| Firebase Blaze | ~$20-50/month |
| Monitoring (Sentry) | ~$29/month |
| Domain/SSL | ~$15/year |
| **Total** | **~$60-100/month** |

---

## Deployment Checklist

### Before First Deployment

- [ ] All environment variables configured
- [ ] Firebase security rules set
- [ ] GitHub repository initialized
- [ ] GitHub Secrets configured
- [ ] Vercel project created
- [ ] Build verified locally: `npm run build`
- [ ] No TypeScript errors

### After First Deployment

- [ ] Test production URL works
- [ ] API endpoints respond
- [ ] Database connection verified
- [ ] Authentication working
- [ ] SSL certificate active
- [ ] Monitoring dashboard active

---

## Deployment Workflow

### Daily Development

```bash
# Make changes locally
git add .
git commit -m "Feature: add..."

# Push to develop branch
git push origin develop

# Vercel auto-deploys preview
# Check preview URL in GitHub

# After testing, merge to main
git checkout main
git merge develop
git push origin main

# Auto-deploys to production via GitHub Actions
```

### Manual Deployment (if needed)

```bash
# Option 1: Vercel CLI
vercel --prod

# Option 2: Firebase CLI
firebase deploy --only hosting,firestore

# Option 3: GitHub Actions
# Just push to main - deploys automatically
```

---

## Troubleshooting

### Build Fails on Vercel

**Problem**: "Build failed"
- Check build logs in Vercel Dashboard
- Verify environment variables are set
- Ensure `.env.local` in root (not needed on Vercel)

**Solution**:
```bash
npm run build  # Test locally first
```

### API Returns 500

**Problem**: "Internal Server Error"
- Check Firebase credentials
- Verify Firestore is enabled
- Check Security Rules aren't too restrictive

**Solution**:
1. Click Vercel → Logs
2. Check error message
3. Fix locally and redeploy

### Database Quota Exceeded

**Problem**: "Quota exceeded"
- Too many users or requests
- Need to upgrade Firebase plan

**Solution**:
```bash
# Upgrade to Firebase Blaze (pay-as-you-go)
```

---

## Next Steps

1. **Deploy now**: Choose Vercel or Firebase Hosting above
2. **Test in production**: Visit deployed URL
3. **Set up monitoring**: Track usage and errors
4. **Begin Phase 2**: ML model development
5. **Iterate**: Deploy updates via GitHub push

---

## Support

- **Vercel status**: https://status.vercel.com
- **Firebase status**: https://status.firebase.google.com
- **GitHub status**: https://www.githubstatus.com

**Deployment complete in**: ~30 minutes

**Infrastructure ready for**: 1,000+ users on free tier
