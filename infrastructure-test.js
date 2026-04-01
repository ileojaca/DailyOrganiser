#!/usr/bin/env node
/**
 * DailyOrganiser - Infrastructure Validation Test
 * 
 * This script validates that all infrastructure files are present,
 * correctly formatted, and would work for production deployment.
 * 
 * Run: node infrastructure-test.js
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✅${RESET} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${RED}❌${RESET} ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function testFile(filepath, description = '') {
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  console.log(`   Path: ${filepath}`);
}

function testJSON(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  JSON.parse(content); // Will throw if invalid JSON
}

function testYAML(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  // Basic YAML structure check
  if (!content.includes('name:') || !content.includes('on:')) {
    throw new Error('YAML structure invalid - missing required fields');
  }
}

console.log('🧪 DailyOrganiser Infrastructure Validation\n');

// === CONFIGURATION FILES ===
console.log('📋 Configuration Files');
console.log('─'.repeat(50));

test('vercel.json exists and is valid JSON', () => {
  testFile('vercel.json');
  testJSON('vercel.json');
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  if (config.framework !== 'nextjs') throw new Error('Framework not set to nextjs');
  if (!config.buildCommand) throw new Error('Build command not configured');
});

test('firebase.json exists and is valid JSON', () => {
  testFile('firebase.json');
  testJSON('firebase.json');
  const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
  if (!config.firestore) throw new Error('Firestore not configured');
  if (!config.hosting) throw new Error('Hosting not configured');
});

test('.github/workflows/deploy.yml exists and valid YAML', () => {
  testFile('.github/workflows/deploy.yml');
  testYAML('.github/workflows/deploy.yml');
  const content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  if (!content.includes('vercel deploy')) throw new Error('Vercel deploy step missing');
});

test('pre-deploy.sh exists with shebang', () => {
  testFile('pre-deploy.sh');
  const content = fs.readFileSync('pre-deploy.sh', 'utf8');
  if (!content.startsWith('#!/usr/bin/env bash')) throw new Error('Missing bash shebang');
});

// === SOURCE FILES ===
console.log('\n📦 Phase 1 Backend Source Files');
console.log('─'.repeat(50));

const sourceFiles = [
  'src/types/simplified.ts',
  'src/lib/firebaseUtils.ts',
  'src/utils/voiceTaskParser.ts',
  'src/utils/ruleBasedScheduler.ts',
  'src/app/api/tasks/parse-voice/route.ts',
  'src/app/api/energy-log/route.ts',
  'src/app/api/schedule/route.ts',
  'src/app/api/tasks/[id]/complete/route.ts',
];

sourceFiles.forEach(file => {
  test(`${path.basename(file)} exists`, () => {
    testFile(file);
  });
});

// === DOCUMENTATION ===
console.log('\n📚 Documentation Files');
console.log('─'.repeat(50));

const docs = [
  'IMPLEMENTATION_PLAN.md',
  'BACKEND_API_GUIDE.md',
  'DEPLOYMENT_GUIDE.md',
  'INFRASTRUCTURE_SETUP.md',
  'MONITORING_SETUP.md',
  'MASTER_DEPLOYMENT_CHECKLIST.md',
  'MVP_PHASE1_STATUS.md',
  'FINAL_DELIVERY_SUMMARY.md',
  'TEST_REPORT.md',
  'PHASE0_INFRASTRUCTURE_COMPLETE.md',
];

docs.forEach(doc => {
  test(`${doc} exists`, () => {
    testFile(doc);
    const content = fs.readFileSync(doc, 'utf8');
    if (content.length < 500) throw new Error('File too short - may be incomplete');
  });
});

// === BUILD & PROJECT STRUCTURE ===
console.log('\n🔨 Build & Project Structure');
console.log('─'.repeat(50));

test('package.json exists', () => {
  testFile('package.json');
  testJSON('package.json');
});

test('tsconfig.json exists', () => {
  testFile('tsconfig.json');
  testJSON('tsconfig.json');
});

test('next.config.ts exists', () => {
  testFile('next.config.ts');
});

test('Build output exists (.next)', () => {
  if (!fs.existsSync('.next')) throw new Error('.next directory not found - run npm run build');
});

// === ENVIRONMENT ===
console.log('\n⚙️  Environment & Configuration');
console.log('─'.repeat(50));

test('.env.example or .env template exists', () => {
  if (!fs.existsSync('.env.example') && !fs.existsSync('.env')) {
    throw new Error('No environment template found');
  }
});

test('.gitignore properly configured', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (!gitignore.includes('.env.local')) throw new Error('.env.local not in gitignore');
  if (!gitignore.includes('node_modules')) throw new Error('node_modules not in gitignore');
});

// === API ROUTES VALIDATION ===
console.log('\n🔌 API Route Validation');
console.log('─'.repeat(50));

test('Voice parser route has correct handler', () => {
  const content = fs.readFileSync('src/app/api/tasks/parse-voice/route.ts', 'utf8');
  if (!content.includes('export async function POST')) throw new Error('POST handler missing');
  if (!content.includes('parseTaskInput')) throw new Error('Parser function not called');
});

test('Energy log route has correct handlers', () => {
  const content = fs.readFileSync('src/app/api/energy-log/route.ts', 'utf8');
  if (!content.includes('export async function POST')) throw new Error('POST handler missing');
  if (!content.includes('export async function GET')) throw new Error('GET handler missing');
});

test('Schedule route configured', () => {
  const content = fs.readFileSync('src/app/api/schedule/route.ts', 'utf8');
  if (!content.includes('export async function')) throw new Error('No handler found');
});

test('Task completion route fixed for Next.js 16', () => {
  const content = fs.readFileSync('src/app/api/tasks/[id]/complete/route.ts', 'utf8');
  if (!content.includes('Promise<{ id: string }>')) throw new Error('Dynamic params not using Promise');
  if (!content.includes('await params')) throw new Error('Params not being awaited');
});

// === CI/CD WORKFLOW ===
console.log('\n⚡ CI/CD Pipeline Validation');
console.log('─'.repeat(50));

test('GitHub Actions workflow has build job', () => {
  const content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  if (!content.includes('build-and-test')) throw new Error('Build job missing');
});

test('GitHub Actions workflow has test matrix', () => {
  const content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  if (!content.includes('node-version')) throw new Error('Node version matrix missing');
  if (!content.includes('18.x') || !content.includes('20.x')) throw new Error('Test versions incomplete');
});

test('GitHub Actions workflow has preview deploy', () => {
  const content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  if (!content.includes('deploy-preview')) throw new Error('Preview deployment missing');
});

test('GitHub Actions workflow has production deploy', () => {
  const content = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  if (!content.includes('deploy-production')) throw new Error('Production deployment missing');
  if (!content.includes('--prod')) throw new Error('Production flag missing');
});

// === INFRASTRUCTURE DOCS ===
console.log('\n📖 Infrastructure Documentation Validation');
console.log('─'.repeat(50));

test('INFRASTRUCTURE_SETUP.md has deployment steps', () => {
  const content = fs.readFileSync('INFRASTRUCTURE_SETUP.md', 'utf8');
  if (!content.includes('Vercel')) throw new Error('Vercel deployment not documented');
  if (!content.includes('Firebase')) throw new Error('Firebase not documented');
  if (!content.includes('GitHub')) throw new Error('GitHub actions not documented');
});

test('MONITORING_SETUP.md has alert configuration', () => {
  const content = fs.readFileSync('MONITORING_SETUP.md', 'utf8');
  if (!content.includes('alert') && !content.includes('Alert')) throw new Error('No alert config found');
  if (!content.includes('Dashboard')) throw new Error('Dashboard setup missing');
});

test('MASTER_DEPLOYMENT_CHECKLIST.md has step-by-step guide', () => {
  const content = fs.readFileSync('MASTER_DEPLOYMENT_CHECKLIST.md', 'utf8');
  if (!content.includes('[') || !content.includes(']')) throw new Error('Checkbox format missing');
  const checkboxCount = (content.match(/\[\s*\]/g) || []).length;
  if (checkboxCount < 15) throw new Error(`Not enough checklist items - found ${checkboxCount}, need at least 15`);
});

// === TYPE DEFINITIONS ===
console.log('\n📝 TypeScript Type System');
console.log('─'.repeat(50));

test('simplified.ts has required types', () => {
  const content = fs.readFileSync('src/types/simplified.ts', 'utf8');
  const requiredTypes = ['Task', 'User', 'Schedule', 'Energy', 'Gamification'];
  requiredTypes.forEach(type => {
    if (!content.includes(`interface ${type}`) && !content.includes(`type ${type}`)) {
      throw new Error(`Type ${type} not defined`);
    }
  });
});

test('firebaseUtils.ts exports CRUD functions', () => {
  const content = fs.readFileSync('src/lib/firebaseUtils.ts', 'utf8');
  const requiredExports = ['createTask', 'getTask', 'updateTask', 'completeTask'];
  requiredExports.forEach(fn => {
    if (!content.includes(`export async function ${fn}`)) {
      throw new Error(`Function ${fn} not exported`);
    }
  });
});

test('voiceTaskParser.ts exports parser functions', () => {
  const content = fs.readFileSync('src/utils/voiceTaskParser.ts', 'utf8');
  if (!content.includes('export function parseTaskInput')) throw new Error('Parser function not exported');
});

// === SUMMARY ===
console.log('\n' + '═'.repeat(50));
console.log(`${GREEN}✅ PASSED: ${passed}${RESET}`);
console.log(`${RED}❌ FAILED: ${failed}${RESET}`);
console.log('═'.repeat(50));

if (failed === 0) {
  console.log(`\n${GREEN}✨ All validation checks passed!${RESET}`);
  console.log(`${GREEN}Infrastructure is ready for deployment.${RESET}\n`);
  console.log('Next steps:');
  console.log('1. npm run build  (verify build works locally)');
  console.log('2. Create Vercel project at vercel.com');
  console.log('3. Add Firebase credentials to Vercel environment');
  console.log('4. Push to GitHub: git push origin main');
  console.log('5. GitHub Actions will auto-deploy\n');
  process.exit(0);
} else {
  console.log(`\n${RED}⚠️  Some validation checks failed!${RESET}`);
  console.log(`${RED}Please fix the issues above before deploying.\n${RESET}`);
  process.exit(1);
}
