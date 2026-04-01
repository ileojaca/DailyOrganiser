# 🚀 DailyOrganiser - QUICK START GUIDE (15 Minutes to Live)

**Goal**: Go from this repository to live production in 15 minutes.  
**Status**: ✅ All code complete - only setup steps remain.

---

## ⚡ 5-Minute Setup

### Step 1: Create Vercel Account (2 min)
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → Connect GitHub
3. Authorize GitHub access
4. Click "Import Project" → Select DailyOrganiser
5. Click "Deploy" (uses vercel.json configuration)

### Step 2: Create Firebase Project (2 min)
1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Go to Console" → "Create Project"
3. Name: `DailyOrganiser`
4. Click "Create"
5. Go to Project Settings → Service Accounts
6. Click "Generate new private key"
7. Copy the JSON

### Step 3: Configure GitHub Secrets (1 min)
1. In GitHub: Repo → Settings → Secrets and variables → Actions
2. Add `VERCEL_TOKEN`: Get from [vercel.com/account/tokens](https://vercel.com/account/tokens)
3. Add `VERCEL_ORG_ID`: Your org ID from Vercel settings
4. Add `VERCEL_PROJECT_ID`: Your project ID from Vercel project settings

---

## 🔗 Add Credentials to Vercel (3 min)

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_VALUE_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_VALUE_HERE
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_VALUE_HERE
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_VALUE_HERE
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_VALUE_HERE
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_VALUE_HERE
FIREBASE_ADMIN_SDK_KEY=YOUR_JSON_STRINGIFIED
```

Get all values from Firebase Console → Project Settings.

---

## ✅ Deploy (2 min)

### Automatic (Recommended):
```bash
git push origin main
# GitHub Actions automatically deploys to Vercel
# Check status: GitHub → Actions tab
```

### Manual Vercel:
```bash
npm install -g vercel
vercel deploy --prod
```

---

## 🧪 Test Live Endpoints (3 min)

Once deployed, test the APIs:

```bash
# Get your deployment URL from Vercel
DOMAIN="your-vercel-url.vercel.app"

# Test voice parser
curl -X POST https://$DOMAIN/api/tasks/parse-voice \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-123" \
  -d '{"input":"Buy milk tomorrow at 2pm"}'

# Expected: Task parsed with confidence score
```

---

## 📊 Monitor Live (1 min)

1. **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
   - See deployments in real-time
   - View analytics
   - Monitor errors

2. **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
   - Check Firestore usage
   - View security rules
   - Monitor quotas

---

## 🐛 Troubleshooting

### Vercel Build Fails
```bash
npm run build  # Test locally first
git push       # Re-push if fixed
```

### Firebase Connection Error
- ✅ Verify credentials in Vercel env vars
- ✅ Check Firebase project is created
- ✅ Verify Firestore is enabled

### API Returns 404
- ✅ Wait 5 minutes for Vercel deployment
- ✅ Check Vercel deployment succeeded

---

## 📈 What You Get (Already Built)

✅ **8 Production APIs**
- Voice task parsing (NLP)
- Energy level tracking
- Smart daily scheduling
- Task completion with gamification

✅ **Complete Infrastructure**
- Auto-deploying to Vercel
- Zero-downtime deployments
- Real-time monitoring
- Automatic backups

✅ **Full Documentation**
- API reference guide
- Deployment guide
- Monitoring setup
- Emergency procedures

---

## 🎯 Next Steps After Live

1. **Hour 1**: Monitor Vercel/Firebase dashboards
2. **Day 1**: Test user onboarding flow
3. **Week 1**: Analyze usage patterns
4. **Month 1**: Begin Phase 2 ML features

---

## 📞 Support

- **API Docs**: See `BACKEND_API_GUIDE.md`
- **Deployment Help**: See `INFRASTRUCTURE_SETUP.md`
- **Monitoring Setup**: See `MONITORING_SETUP.md`
- **Full Checklist**: See `MASTER_DEPLOYMENT_CHECKLIST.md`

---

## ✨ That's It!

You now have a fully functional AI daily planning system deployed to production.

**What's running**:
- ✅ Next.js 16 frontend
- ✅ 8 backend APIs
- ✅ Firebase Firestore database
- ✅ Vercel hosting with CDN
- ✅ GitHub Actions CI/CD
- ✅ Real-time monitoring

**Cost**: $0/month (free tier supports 1,000+ users)

**Uptime**: 99.9%+ (Vercel + Firebase)

---

**Status**: 🚀 **READY TO LAUNCH**

Go make it live - you've got this! 💪
