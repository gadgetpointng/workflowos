import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'lib'];
const sourceFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) sourceFiles.push(full);
  }
}

for (const root of roots) walk(root);

const supportedTypes = new Map([
  ['owner_feed', { prefix: 'message:', preference: 'messageAlerts' }],
  ['owner_private_message', { prefix: 'message:', preference: 'messageAlerts' }],
  ['buyer_request', { prefix: 'buyer:', preference: 'buyerAlerts' }],
  ['task', { prefix: 'assignment:', preference: 'assignmentAlerts' }],
  ['task_assigned', { prefix: 'assignment:', preference: 'assignmentAlerts' }],
  ['automation', { prefix: 'automation:', preference: 'automationAlerts' }],
]);

const discovered = [];
const unresolved = [];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const marker = /\.from\(\s*['"]notifications['"]\s*\)\s*\.insert\(/g;
  let match;
  while ((match = marker.exec(source))) {
    const window = source.slice(match.index, match.index + 2200);
    const typeMatch = window.match(/\btype\s*:\s*['"]([^'"]+)['"]/);
    if (!typeMatch) {
      unresolved.push(`${file}: notification insert has no nearby literal type`);
      continue;
    }
    discovered.push({ file, type: typeMatch[1] });
  }
}

const unsupported = discovered.filter(({ type }) => !supportedTypes.has(type));

const summary = fs.readFileSync('app/api/notifications/summary/route.ts', 'utf8');
const controller = fs.readFileSync('components/NotificationSoundController.tsx', 'utf8');
const preferences = fs.readFileSync('components/WorkspacePreferences.tsx', 'utf8');
const missingMappings = [];

for (const type of new Set(discovered.map((item) => item.type))) {
  const mapping = supportedTypes.get(type);
  if (!mapping) continue;
  if (!summary.includes(`'${type}'`) && !summary.includes(`\"${type}\"`)) {
    missingMappings.push(`${type}: missing from notification summary classification`);
  }
  if (!controller.includes(mapping.prefix) || !controller.includes(mapping.preference)) {
    missingMappings.push(`${type}: ${mapping.prefix} is not gated by ${mapping.preference} in NotificationSoundController`);
  }
  if (!preferences.includes(mapping.preference)) {
    missingMappings.push(`${type}: ${mapping.preference} is missing from WorkspacePreferences`);
  }
}

if (unresolved.length || unsupported.length || missingMappings.length) {
  console.error('Notification preference gate check failed.');
  for (const issue of unresolved) console.error(`- ${issue}`);
  for (const item of unsupported) console.error(`- ${item.file}: unsupported notification type '${item.type}'`);
  for (const issue of missingMappings) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Notification preference gates OK: ${discovered.length} creation path(s), ${new Set(discovered.map((item) => item.type)).size} stored type(s) classified.`);
