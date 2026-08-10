import fs from 'node:fs';
const requiredFiles = ['app/page.tsx','app/login/page.tsx','app/signup/page.tsx','app/api/health/route.ts','app/launch-readiness/page.tsx','app/error.tsx','app/not-found.tsx','supabase/schema.sql','supabase/rls.sql','vercel.json'];
let failed = false;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) { console.error(`Missing required file: ${file}`); failed = true; }
}
const envFile = fs.existsSync('.env.local') ? '.env.local' : null;
if (envFile) {
  const env = fs.readFileSync(envFile, 'utf8');
  for (const key of ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','CRON_SECRET']) {
    if (!new RegExp(`^${key}=.+$`, 'm').test(env)) { console.error(`Missing ${key} in .env.local`); failed = true; }
  }
} else {
  console.warn('No .env.local found. This is fine before deployment, but configure deployment environment variables.');
}
if (failed) process.exit(1);
console.log('WorkflowOS launch structure check passed.');
