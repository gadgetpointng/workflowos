import fs from 'node:fs';

const canonicalRef = 'hasnhivdrpeqytgdnkzo';
const configFile = 'lib/supabase/config.ts';
const consumers = [
  'middleware.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'lib/supabase/admin.ts',
];

const issues = [];
const config = fs.readFileSync(configFile, 'utf8');
if (!config.includes(canonicalRef)) issues.push('canonical WorkflowOS Supabase project ref is missing from config helper');
if (!config.includes('WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY')) issues.push('verified publishable-key fallback is missing from config helper');

for (const file of consumers) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes("@/lib/supabase/config")) issues.push(`${file}: must consume centralized Supabase config`);
  if (source.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY') || source.includes('process.env.NEXT_PUBLIC_SUPABASE_URL')) {
    issues.push(`${file}: direct public Supabase environment access is forbidden; use centralized config`);
  }
}

if (issues.length) {
  console.error('Supabase auth configuration gate failed.');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Supabase auth configuration gate passed. Canonical public config is centralized and protected.');
