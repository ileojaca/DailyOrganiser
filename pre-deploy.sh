#!/usr/bin/env bash
# DailyOrganiser - Pre-Deployment Environment Validation Script
# Run this before deploying to production

set -e

echo "🔍 DailyOrganiser - Pre-Deployment Checklist"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Helper functions
check_pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
}

check_fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

section() {
  echo ""
  echo "═══════════════════════════════════════"
  echo "📋 $1"
  echo "═══════════════════════════════════════"
}

# 1. Check Node.js and npm
section "Environment Versions"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  check_pass "Node.js installed: $NODE_VERSION"
else
  check_fail "Node.js not found"
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  check_pass "npm installed: $NPM_VERSION"
else
  check_fail "npm not found"
fi

# 2. Check Git
section "Git Configuration"
if command -v git &> /dev/null; then
  check_pass "Git installed: $(git --version)"
else
  check_fail "Git not found"
fi

if git remote get-url origin &> /dev/null; then
  ORIGIN=$(git remote get-url origin)
  check_pass "Git remote configured: $ORIGIN"
else
  warn "Git remote not configured"
fi

# 3. Check dependencies
section "Dependencies"
if [ -f "package.json" ]; then
  check_pass "package.json exists"
else
  check_fail "package.json not found"
fi

if [ -d "node_modules" ]; then
  check_pass "node_modules directory exists"
  MODULES_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
  check_pass "Dependencies installed: ~$(($MODULES_COUNT - 1)) packages"
else
  warn "node_modules not found - run 'npm install'"
fi

# 4. Check build configuration
section "Build Configuration"
if [ -f "next.config.ts" ]; then
  check_pass "Next.js config exists: next.config.ts"
else
  check_fail "next.config.ts not found"
fi

if [ -f "tsconfig.json" ]; then
  check_pass "TypeScript config exists: tsconfig.json"
else
  check_fail "tsconfig.json not found"
fi

if [ -f "vercel.json" ]; then
  check_pass "Vercel config exists: vercel.json"
else
  warn "vercel.json not found (recommended for Vercel)"
fi

# 5. Check source files
section "Source Code"
REQUIRED_FILES=(
  "src/app/layout.tsx"
  "src/types/simplified.ts"
  "src/lib/firebaseUtils.ts"
  "src/utils/voiceTaskParser.ts"
  "src/utils/ruleBasedScheduler.ts"
  "src/app/api/tasks/parse-voice/route.ts"
  "src/app/api/energy-log/route.ts"
  "src/app/api/schedule/route.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "Source file: $file"
  else
    check_fail "Missing: $file"
  fi
done

# 6. Check environment files
section "Environment Configuration"
if [ -f ".env.example" ]; then
  check_pass ".env.example exists"
  if ! grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" .env.example; then
    warn ".env.example missing Firebase keys"
  fi
else
  warn ".env.example not found"
fi

if [ -f ".env.local" ]; then
  warn ".env.local exists (should not be committed)"
  if grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" .env.local; then
    check_pass "Firebase credentials in .env.local"
  else
    warn "Firebase credentials not set in .env.local"
  fi
else
  warn ".env.local not found - needed for deployment"
fi

# 7. Test build
section "Build Test"
if npm run build &> /dev/null; then
  check_pass "Production build successful"
  if [ -d ".next" ]; then
    check_pass "Build output (.next) generated"
  fi
else
  check_fail "Production build failed - run 'npm run build' for details"
fi

# 8. Test type check
section "TypeScript"
if npx tsc --noEmit 2> /dev/null; then
  check_pass "TypeScript compilation successful"
else
  check_fail "TypeScript errors found - run 'npx tsc --noEmit'"
fi

# 9. Check documentation
section "Documentation"
DOCS=(
  "INFRASTRUCTURE_SETUP.md"
  "DEPLOYMENT_GUIDE.md"
  "BACKEND_API_GUIDE.md"
  "IMPLEMENTATION_PLAN.md"
  "MONITORING_SETUP.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    check_pass "Documentation: $doc"
  else
    warn "Missing docs: $doc"
  fi
done

# 10. Check CI/CD
section "CI/CD Pipeline"
if [ -f ".github/workflows/deploy.yml" ]; then
  check_pass "GitHub Actions workflow configured"
else
  warn "GitHub Actions workflow not found"
fi

# 11. Check Firebase setup
section "Firebase Setup"
if [ -f "firebase.json" ]; then
  check_pass "firebase.json exists"
  if grep -q "firestore" firebase.json; then
    check_pass "Firestore configured in firebase.json"
  fi
  if grep -q "hosting" firebase.json; then
    check_pass "Hosting configured in firebase.json"
  fi
else
  warn "firebase.json not found"
fi

if [ -f "firebase/firestore.rules" ]; then
  check_pass "Firestore security rules exist"
else
  warn "firestore.rules not found"
fi

# 12. Summary
section "SUMMARY"
echo ""
echo "Passed: $PASSED checks"
echo "Failed: $FAILED checks"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Ensure .env.local is configured with Firebase credentials"
  echo "2. Commit and push: git push origin main"
  echo "3. GitHub Actions will deploy automatically"
  echo "4. Or manually deploy: npx vercel deploy --prod"
  exit 0
else
  echo -e "${RED}❌ Some checks failed - please fix before deploying${NC}"
  exit 1
fi
